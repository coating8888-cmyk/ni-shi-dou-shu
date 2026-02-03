"""建立倪海廈知識庫 - 處理 PDF、影片、文字並建立向量資料庫."""
import os
from pathlib import Path
from typing import List, Dict
import json

# 文件處理
import pdfplumber
from docx import Document

# 向量資料庫
import chromadb
from chromadb.utils import embedding_functions

# 設定
PROJECT_ROOT = Path(__file__).parent.parent
KNOWLEDGE_RAW = PROJECT_ROOT / "knowledge" / "raw"
KNOWLEDGE_PROCESSED = PROJECT_ROOT / "knowledge" / "processed"
CHROMA_DB_PATH = KNOWLEDGE_PROCESSED / "chroma_db"


def extract_text_from_pdf(pdf_path: Path) -> str:
    """從 PDF 提取文字."""
    print(f"  📄 處理 PDF: {pdf_path.name}")
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n\n"
    except Exception as e:
        print(f"    ❌ 錯誤: {e}")
    return text


def extract_text_from_docx(docx_path: Path) -> str:
    """從 Word 文件提取文字."""
    print(f"  📝 處理 DOCX: {docx_path.name}")
    try:
        doc = Document(docx_path)
        text = "\n\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        return text
    except Exception as e:
        print(f"    ❌ 錯誤: {e}")
        return ""


def extract_text_from_txt(txt_path: Path) -> str:
    """讀取純文字檔."""
    print(f"  📃 處理 TXT: {txt_path.name}")
    try:
        with open(txt_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"    ❌ 錯誤: {e}")
        return ""


def transcribe_video(video_path: Path) -> str:
    """將影片/音訊轉成文字（使用 Whisper）."""
    print(f"  🎬 轉錄影片: {video_path.name}")
    try:
        import whisper
        model = whisper.load_model("base")  # 可改 small, medium, large
        result = model.transcribe(str(video_path), language="zh")
        return result["text"]
    except ImportError:
        print("    ⚠️ 請安裝 whisper: pip install openai-whisper")
        return ""
    except Exception as e:
        print(f"    ❌ 錯誤: {e}")
        return ""


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """將長文字切成小塊."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
    return chunks


def process_all_documents() -> List[Dict]:
    """處理所有文件，返回文件清單."""
    documents = []

    # 處理 PDF
    pdf_dir = KNOWLEDGE_RAW / "pdf"
    if pdf_dir.exists():
        for pdf_file in pdf_dir.glob("*.pdf"):
            text = extract_text_from_pdf(pdf_file)
            if text:
                documents.append({
                    "source": str(pdf_file.name),
                    "type": "pdf",
                    "content": text,
                })

    # 處理文字檔
    text_dir = KNOWLEDGE_RAW / "text"
    if text_dir.exists():
        for txt_file in text_dir.glob("*.txt"):
            text = extract_text_from_txt(txt_file)
            if text:
                documents.append({
                    "source": str(txt_file.name),
                    "type": "txt",
                    "content": text,
                })

        for docx_file in text_dir.glob("*.docx"):
            text = extract_text_from_docx(docx_file)
            if text:
                documents.append({
                    "source": str(docx_file.name),
                    "type": "docx",
                    "content": text,
                })

    # 處理影片（如果有安裝 whisper）
    video_dir = KNOWLEDGE_RAW / "video"
    if video_dir.exists():
        for video_file in video_dir.glob("*"):
            if video_file.suffix.lower() in ['.mp4', '.mp3', '.wav', '.m4a', '.webm']:
                text = transcribe_video(video_file)
                if text:
                    documents.append({
                        "source": str(video_file.name),
                        "type": "video",
                        "content": text,
                    })

    return documents


def build_vector_database(documents: List[Dict]):
    """建立向量資料庫."""
    print("\n🔧 建立向量資料庫...")

    CHROMA_DB_PATH.mkdir(parents=True, exist_ok=True)

    # 使用 ChromaDB
    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))

    # 使用 OpenAI embedding（需要設定 OPENAI_API_KEY）
    # 或使用免費的 sentence-transformers
    try:
        openai_ef = embedding_functions.OpenAIEmbeddingFunction(
            api_key=os.getenv("OPENAI_API_KEY"),
            model_name="text-embedding-3-small"
        )
        ef = openai_ef
    except:
        print("  ⚠️ 無法使用 OpenAI，改用本地 embedding")
        ef = embedding_functions.DefaultEmbeddingFunction()

    # 建立或取得 collection
    collection = client.get_or_create_collection(
        name="ni_haixia_knowledge",
        embedding_function=ef,
        metadata={"description": "倪海廈知識庫"}
    )

    # 清空舊資料
    if collection.count() > 0:
        collection.delete(where={})

    # 處理每個文件
    all_chunks = []
    all_metadatas = []
    all_ids = []

    for doc in documents:
        chunks = chunk_text(doc["content"])
        for i, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            all_metadatas.append({
                "source": doc["source"],
                "type": doc["type"],
                "chunk_index": i,
            })
            all_ids.append(f"{doc['source']}_{i}")

    # 批次新增
    if all_chunks:
        # ChromaDB 限制每次最多 5000 筆
        batch_size = 500
        for i in range(0, len(all_chunks), batch_size):
            batch_chunks = all_chunks[i:i+batch_size]
            batch_metadatas = all_metadatas[i:i+batch_size]
            batch_ids = all_ids[i:i+batch_size]

            collection.add(
                documents=batch_chunks,
                metadatas=batch_metadatas,
                ids=batch_ids,
            )
            print(f"  ✅ 已新增 {min(i+batch_size, len(all_chunks))}/{len(all_chunks)} 筆")

    print(f"\n✅ 向量資料庫建立完成！共 {collection.count()} 筆資料")


def save_processed_documents(documents: List[Dict]):
    """儲存處理後的文件（純文字版本）."""
    KNOWLEDGE_PROCESSED.mkdir(parents=True, exist_ok=True)

    for doc in documents:
        output_file = KNOWLEDGE_PROCESSED / f"{Path(doc['source']).stem}.txt"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"來源: {doc['source']}\n")
            f.write(f"類型: {doc['type']}\n")
            f.write("=" * 50 + "\n\n")
            f.write(doc['content'])

    # 儲存索引
    index_file = KNOWLEDGE_PROCESSED / "index.json"
    index = [{"source": d["source"], "type": d["type"], "length": len(d["content"])} for d in documents]
    with open(index_file, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\n📁 已儲存處理後的文件到: {KNOWLEDGE_PROCESSED}")


def main():
    """主程式."""
    print("=== 建立倪海廈知識庫 ===\n")

    # 1. 處理所有文件
    print("📚 處理原始文件...")
    documents = process_all_documents()

    if not documents:
        print("\n⚠️ 找不到任何文件！請先執行 gdrive_sync.py 下載資料")
        return

    print(f"\n找到 {len(documents)} 個文件")

    # 2. 儲存處理後的文件
    save_processed_documents(documents)

    # 3. 建立向量資料庫
    build_vector_database(documents)

    print("\n🎉 知識庫建立完成！")


if __name__ == "__main__":
    main()
