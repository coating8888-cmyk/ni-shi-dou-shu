#!/usr/bin/env python3
"""
向量知識庫建立腳本 v2
將提取的倪海廈文字內容分類、切塊、建立 ChromaDB 向量索引
"""

import json
import re
from pathlib import Path
from datetime import datetime

import chromadb

# 路徑設定
BASE_DIR = Path(__file__).parent.parent
EXTRACTED_DIR = BASE_DIR / "knowledge" / "processed" / "extracted"
RULES_DIR = BASE_DIR / "backend" / "rules"
VECTORS_DIR = BASE_DIR / "knowledge" / "vectors"

# ── 分類規則（按優先順序匹配）──────────────────────────
# category, relevance_weight (1-10, 10=算命最相關)
FILE_RULES = [
    # 天紀 — 紫微斗數核心
    (lambda f: "天机" in f or "天機" in f, "tianji_ziwei", 10),
    (lambda f: "天-全集" in f, "tianji_full", 10),
    (lambda f: "天-天机" in f or "天-天機" in f, "tianji_ziwei", 10),

    # 天紀 — 易經/卦
    (lambda f: "卦" in f, "tianji_yijing", 8),

    # 天紀 — 風水/地理
    (lambda f: "地脉" in f or "地脈" in f or "地di纪" in f, "tianji_fengshui", 7),

    # 天紀 — 人間道
    (lambda f: "人间" in f or "人間" in f, "tianji_renjian", 8),

    # 八綱辨證（健康宮分析需要）
    (lambda f: "八纲" in f or "八綱" in f, "bagang", 6),

    # 人紀 — 針灸
    (lambda f: "针灸" in f or "針灸" in f, "renji_zhenjiu", 4),

    # 人紀 — 神農本草經
    (lambda f: "本草" in f or "神农" in f or "神農" in f, "renji_bencao", 3),

    # 人紀 — 傷寒論
    (lambda f: "伤寒" in f or "傷寒" in f, "renji_shanghan", 3),

    # 人紀 — 金匱要略
    (lambda f: "金匮" in f or "金匱" in f, "renji_jinkui", 3),

    # 人紀 — 黃帝內經
    (lambda f: "内经" in f or "內經" in f or "黄帝" in f or "黃帝" in f, "renji_neijing", 5),

    # 對話/訪談
    (lambda f: "梁" in f and "对话" in f or "對話" in f, "interview", 5),

    # 倪師斗數 AI 講義
    (lambda f: "AI學習講義" in f or "AI学习讲义" in f, "ai_lecture", 10),
]


def categorize_file(filename: str) -> tuple:
    """分類檔案 → (category, weight)"""
    for rule_fn, category, weight in FILE_RULES:
        if rule_fn(filename):
            return category, weight
    return "general", 5


def smart_chunk(text: str, chunk_size: int = 800, overlap: int = 150) -> list:
    """智慧切塊：優先在段落/句號處斷開"""
    chunks = []
    # 先按大段落分
    paragraphs = re.split(r'\n{2,}', text)

    current = ""
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(current) + len(para) < chunk_size:
            current += para + "\n\n"
        else:
            if current:
                chunks.append(current.strip())
            # 如果單段就超過 chunk_size，再按句子切
            if len(para) > chunk_size:
                sentences = re.split(r'([。！？\n])', para)
                sub = ""
                for i in range(0, len(sentences), 2):
                    sent = sentences[i]
                    if i + 1 < len(sentences):
                        sent += sentences[i + 1]
                    if len(sub) + len(sent) < chunk_size:
                        sub += sent
                    else:
                        if sub:
                            chunks.append(sub.strip())
                        sub = sent
                if sub:
                    current = sub + "\n\n"
                else:
                    current = ""
            else:
                current = para + "\n\n"

    if current.strip():
        chunks.append(current.strip())

    # 加 overlap：每個 chunk 尾巴帶上一段的開頭
    if overlap > 0 and len(chunks) > 1:
        overlapped = [chunks[0]]
        for i in range(1, len(chunks)):
            prev_tail = chunks[i - 1][-overlap:]
            overlapped.append(prev_tail + " ... " + chunks[i])
        chunks = overlapped

    # 過濾太短的
    chunks = [c for c in chunks if len(c) > 50]

    return chunks


def build():
    """主建構流程"""
    print("=== 倪海廈知識庫向量化 v2 ===\n")

    # 清除舊向量庫
    if VECTORS_DIR.exists():
        import shutil
        shutil.rmtree(VECTORS_DIR)
        print("已清除舊向量庫")

    VECTORS_DIR.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(path=str(VECTORS_DIR))

    # 建立單一 collection（方便跨分類搜尋）
    collection = client.get_or_create_collection(
        name="ni_shi_knowledge",
        metadata={"description": "倪海廈完整知識庫 - 天紀/人紀/規則"}
    )

    # ── 處理提取的文本 ──
    txt_files = sorted(EXTRACTED_DIR.glob("*.txt"))
    print(f"找到 {len(txt_files)} 個已提取文本\n")

    all_docs = []
    all_ids = []
    all_metas = []
    stats = {}

    for txt_path in txt_files:
        content = txt_path.read_text(encoding='utf-8')
        if len(content) < 100:
            print(f"  跳過（太短）: {txt_path.name}")
            continue

        category, weight = categorize_file(txt_path.name)
        chunks = smart_chunk(content)

        print(f"  {txt_path.name}")
        print(f"    分類={category}, 權重={weight}, 切塊={len(chunks)}")

        stats.setdefault(category, {"files": 0, "chunks": 0, "weight": weight})
        stats[category]["files"] += 1
        stats[category]["chunks"] += len(chunks)

        for i, chunk in enumerate(chunks):
            doc_id = f"{category}_{txt_path.stem}_{i}"
            # 確保 id 不超過限制且唯一
            if len(doc_id) > 200:
                doc_id = f"{category}_{hash(txt_path.stem)}_{i}"

            all_docs.append(chunk)
            all_ids.append(doc_id)
            all_metas.append({
                "source": txt_path.name,
                "category": category,
                "weight": weight,
                "chunk_index": i,
            })

    # ── 處理規則 JSON（也建向量，讓 RAG 能搜到規則）──
    print(f"\n處理規則檔案...")
    rule_files = sorted(RULES_DIR.glob("*.json"))
    for rule_path in rule_files:
        try:
            content = rule_path.read_text(encoding='utf-8')
            data = json.loads(content)
        except Exception:
            continue

        # 把 JSON 展平成可搜尋的文本段
        flat_texts = flatten_json(data, prefix=rule_path.stem)
        print(f"  {rule_path.name} → {len(flat_texts)} 段")

        stats.setdefault("rules", {"files": 0, "chunks": 0, "weight": 10})
        stats["rules"]["files"] += 1
        stats["rules"]["chunks"] += len(flat_texts)

        for i, text in enumerate(flat_texts):
            doc_id = f"rule_{rule_path.stem}_{i}"
            all_docs.append(text)
            all_ids.append(doc_id)
            all_metas.append({
                "source": rule_path.name,
                "category": "rules",
                "weight": 10,
                "chunk_index": i,
            })

    # ── 處理 AI 學習講義 ──
    lecture_path = RULES_DIR / "紫微斗數AI學習講義.md"
    if lecture_path.exists():
        content = lecture_path.read_text(encoding='utf-8')
        chunks = smart_chunk(content, chunk_size=1200)
        print(f"\n  AI學習講義 → {len(chunks)} 段")

        stats.setdefault("ai_lecture", {"files": 0, "chunks": 0, "weight": 10})
        stats["ai_lecture"]["files"] += 1
        stats["ai_lecture"]["chunks"] += len(chunks)

        for i, chunk in enumerate(chunks):
            all_docs.append(chunk)
            all_ids.append(f"lecture_{i}")
            all_metas.append({
                "source": "紫微斗數AI學習講義.md",
                "category": "ai_lecture",
                "weight": 10,
                "chunk_index": i,
            })

    # ── 批次寫入 ChromaDB ──
    print(f"\n寫入向量庫... 共 {len(all_docs)} 條")
    batch_size = 200
    for i in range(0, len(all_docs), batch_size):
        end = min(i + batch_size, len(all_docs))
        collection.add(
            documents=all_docs[i:end],
            ids=all_ids[i:end],
            metadatas=all_metas[i:end],
        )
        print(f"  {end}/{len(all_docs)}")

    # ── 統計報告 ──
    print(f"\n{'='*50}")
    print(f"建構完成！ 共 {collection.count()} 條向量")
    print(f"\n分類統計：")
    for cat, info in sorted(stats.items(), key=lambda x: -x[1]["weight"]):
        print(f"  {cat:20s}  檔案={info['files']:2d}  切塊={info['chunks']:4d}  權重={info['weight']}")

    # 儲存日誌
    log = {
        "built_at": datetime.now().isoformat(),
        "total_vectors": collection.count(),
        "stats": stats,
    }
    log_path = VECTORS_DIR / "build_log.json"
    log_path.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"\n日誌: {log_path}")


def flatten_json(data, prefix="", max_depth=3, depth=0) -> list:
    """將 JSON 展平成可搜尋的文本段"""
    results = []
    if depth > max_depth:
        return results

    if isinstance(data, dict):
        for key, value in data.items():
            path = f"{prefix}/{key}" if prefix else key
            if isinstance(value, str):
                if len(value) > 30:
                    results.append(f"【{path}】{value}")
            elif isinstance(value, list):
                text_items = [str(v) for v in value if isinstance(v, (str, int, float))]
                if text_items:
                    results.append(f"【{path}】" + "、".join(text_items))
                for item in value:
                    if isinstance(item, dict):
                        results.extend(flatten_json(item, path, max_depth, depth + 1))
            elif isinstance(value, dict):
                # 如果子 dict 不大，整個序列化
                text = json.dumps(value, ensure_ascii=False)
                if len(text) < 800:
                    results.append(f"【{path}】{text}")
                else:
                    results.extend(flatten_json(value, path, max_depth, depth + 1))
    elif isinstance(data, list):
        for i, item in enumerate(data):
            results.extend(flatten_json(item, f"{prefix}[{i}]", max_depth, depth + 1))

    return results


def test_query(query: str, n: int = 5):
    """測試搜尋"""
    client = chromadb.PersistentClient(path=str(VECTORS_DIR))
    collection = client.get_collection("ni_shi_knowledge")

    results = collection.query(
        query_texts=[query],
        n_results=n,
    )

    print(f"搜尋：「{query}」\n")
    for i, (doc, meta, dist) in enumerate(zip(
        results['documents'][0],
        results['metadatas'][0],
        results['distances'][0]
    )):
        print(f"--- #{i+1} (距離={dist:.3f}, 權重={meta['weight']}, 分類={meta['category']}) ---")
        print(f"來源：{meta['source']}")
        print(f"{doc[:300]}...")
        print()


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "query":
        q = sys.argv[2] if len(sys.argv) > 2 else "紫微星在命宮"
        test_query(q)
    else:
        build()
