#!/usr/bin/env python3
"""
向量知識庫建立腳本
將提取的文字內容轉換為向量存入 ChromaDB
"""

import os
import json
from pathlib import Path
from datetime import datetime

# 嘗試導入必要的庫
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    print("警告：未安裝 chromadb，請執行 pip install chromadb")

try:
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    print("警告：未安裝 langchain，請執行 pip install langchain")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("警告：未安裝 openai，請執行 pip install openai")

# 路徑設定
BASE_DIR = Path(__file__).parent.parent
EXTRACTED_DIR = BASE_DIR / "knowledge" / "processed" / "extracted"
CHUNKS_DIR = BASE_DIR / "knowledge" / "processed" / "chunks"
VECTORS_DIR = BASE_DIR / "knowledge" / "vectors"

# 文件分類對應
FILE_CATEGORIES = {
    "天机": "tianji_notes",
    "天機": "tianji_notes",
    "人间": "renjian_notes",
    "人間": "renjian_notes",
    "地脉": "dimai_notes",
    "地脈": "dimai_notes",
    "卦": "yijing_wisdom",
    "易经": "yijing_wisdom",
    "易經": "yijing_wisdom",
    "面相": "face_reading",
    "命盘": "case_studies",
    "命盤": "case_studies",
}


def categorize_file(filename: str) -> str:
    """根據檔名判斷分類"""
    for keyword, category in FILE_CATEGORIES.items():
        if keyword in filename:
            return category
    return "general_notes"


def split_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list:
    """將文字分段"""
    if LANGCHAIN_AVAILABLE:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", "。", "；", " ", ""]
        )
        return splitter.split_text(text)
    else:
        # 簡單分段邏輯
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            if end < len(text):
                # 嘗試在句號處斷開
                last_period = text.rfind("。", start, end)
                if last_period > start:
                    end = last_period + 1
            chunks.append(text[start:end])
            start = end - chunk_overlap
        return chunks


def get_embedding(text: str, client: 'OpenAI') -> list:
    """獲取文字的向量嵌入"""
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


def build_vector_store():
    """建立向量知識庫"""
    if not CHROMADB_AVAILABLE:
        print("錯誤：未安裝 chromadb")
        return

    # 確保目錄存在
    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)
    VECTORS_DIR.mkdir(parents=True, exist_ok=True)

    # 初始化 ChromaDB
    client = chromadb.PersistentClient(path=str(VECTORS_DIR))

    # 讀取所有提取的文字檔
    txt_files = list(EXTRACTED_DIR.glob("*.txt"))
    print(f"找到 {len(txt_files)} 個文字檔")

    # 按類別組織文件
    categorized_files = {}
    for txt_path in txt_files:
        category = categorize_file(txt_path.name)
        if category not in categorized_files:
            categorized_files[category] = []
        categorized_files[category].append(txt_path)

    print(f"分類結果：")
    for cat, files in categorized_files.items():
        print(f"  {cat}: {len(files)} 個檔案")

    # 處理每個類別
    results = {
        "processed_at": datetime.now().isoformat(),
        "collections": {}
    }

    for category, files in categorized_files.items():
        print(f"\n處理類別：{category}")

        # 獲取或創建 collection
        try:
            collection = client.get_or_create_collection(
                name=category,
                metadata={"description": f"倪海廈 {category} 知識庫"}
            )
        except Exception as e:
            print(f"  創建 collection 失敗：{e}")
            continue

        all_chunks = []
        all_ids = []
        all_metadatas = []

        for txt_path in files:
            print(f"  處理：{txt_path.name}")

            # 讀取文字
            with open(txt_path, 'r', encoding='utf-8') as f:
                text = f.read()

            # 分段
            chunks = split_text(text)
            print(f"    分成 {len(chunks)} 段")

            # 準備資料
            for i, chunk in enumerate(chunks):
                chunk_id = f"{txt_path.stem}_{i}"
                all_chunks.append(chunk)
                all_ids.append(chunk_id)
                all_metadatas.append({
                    "source": txt_path.name,
                    "chunk_index": i,
                    "category": category
                })

            # 儲存分段結果
            chunks_file = CHUNKS_DIR / f"{txt_path.stem}_chunks.json"
            with open(chunks_file, 'w', encoding='utf-8') as f:
                json.dump({
                    "source": str(txt_path),
                    "chunks": chunks
                }, f, ensure_ascii=False, indent=2)

        # 批次加入向量庫（不使用 OpenAI embedding，使用 ChromaDB 內建）
        if all_chunks:
            try:
                # ChromaDB 會自動使用內建的 embedding 函數
                collection.add(
                    documents=all_chunks,
                    ids=all_ids,
                    metadatas=all_metadatas
                )
                print(f"  已加入 {len(all_chunks)} 個文段到 {category}")
                results["collections"][category] = len(all_chunks)
            except Exception as e:
                print(f"  加入向量庫失敗：{e}")

    # 儲存處理記錄
    log_path = VECTORS_DIR / "build_log.json"
    with open(log_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n\n向量知識庫建立完成！")
    print(f"記錄檔：{log_path}")


def query_test(query: str, collection_name: str = "tianji_notes", n_results: int = 3):
    """測試查詢"""
    if not CHROMADB_AVAILABLE:
        print("錯誤：未安裝 chromadb")
        return

    client = chromadb.PersistentClient(path=str(VECTORS_DIR))

    try:
        collection = client.get_collection(name=collection_name)
        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )

        print(f"查詢：{query}")
        print(f"Collection：{collection_name}")
        print(f"結果：")

        for i, (doc, metadata) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
            print(f"\n--- 結果 {i+1} ---")
            print(f"來源：{metadata.get('source', 'unknown')}")
            print(f"內容：{doc[:500]}...")

    except Exception as e:
        print(f"查詢失敗：{e}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "query":
        # 測試查詢模式
        query = sys.argv[2] if len(sys.argv) > 2 else "紫微星"
        query_test(query)
    else:
        # 建立向量庫
        build_vector_store()
