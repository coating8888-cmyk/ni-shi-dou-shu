#!/usr/bin/env python3
"""
PDF 文字提取腳本
從倪師資料中提取文字內容
"""

import os
import json
from pathlib import Path
from datetime import datetime

# 嘗試導入 PDF 處理庫
try:
    import pdfplumber
    PDF_LIBRARY = 'pdfplumber'
except ImportError:
    try:
        import PyPDF2
        PDF_LIBRARY = 'PyPDF2'
    except ImportError:
        PDF_LIBRARY = None
        print("警告：未安裝 PDF 處理庫，請執行 pip install pdfplumber 或 pip install PyPDF2")

# 路徑設定
BASE_DIR = Path(__file__).parent.parent
RAW_DIR = BASE_DIR / "knowledge" / "raw" / "pdf"
OUTPUT_DIR = BASE_DIR / "knowledge" / "processed" / "extracted"


def extract_with_pdfplumber(pdf_path: Path) -> str:
    """使用 pdfplumber 提取 PDF 文字"""
    text_content = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    text_content.append(f"=== 第 {i+1} 頁 ===\n{text}")
    except Exception as e:
        print(f"  錯誤：{e}")
        return ""
    return "\n\n".join(text_content)


def extract_with_pypdf2(pdf_path: Path) -> str:
    """使用 PyPDF2 提取 PDF 文字"""
    text_content = []
    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    text_content.append(f"=== 第 {i+1} 頁 ===\n{text}")
    except Exception as e:
        print(f"  錯誤：{e}")
        return ""
    return "\n\n".join(text_content)


def extract_pdf(pdf_path: Path) -> str:
    """提取 PDF 文字內容"""
    if PDF_LIBRARY == 'pdfplumber':
        return extract_with_pdfplumber(pdf_path)
    elif PDF_LIBRARY == 'PyPDF2':
        return extract_with_pypdf2(pdf_path)
    else:
        return ""


def process_all_pdfs():
    """處理所有 PDF 檔案"""
    if not PDF_LIBRARY:
        print("錯誤：未安裝 PDF 處理庫")
        return

    # 確保輸出目錄存在
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 記錄處理結果
    results = {
        "processed_at": datetime.now().isoformat(),
        "files": []
    }

    # 遍歷所有 PDF 檔案
    pdf_files = list(RAW_DIR.rglob("*.pdf"))
    print(f"找到 {len(pdf_files)} 個 PDF 檔案")

    for pdf_path in pdf_files:
        # 跳過 Zone.Identifier 檔案
        if "Zone.Identifier" in str(pdf_path):
            continue

        print(f"\n處理：{pdf_path.name}")

        # 提取文字
        text = extract_pdf(pdf_path)

        if text:
            # 產生輸出檔名
            relative_path = pdf_path.relative_to(RAW_DIR)
            output_name = str(relative_path).replace("/", "_").replace("\\", "_").replace(".pdf", ".txt")
            output_path = OUTPUT_DIR / output_name

            # 寫入文字檔
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(f"# 來源：{pdf_path.name}\n")
                f.write(f"# 提取時間：{datetime.now().isoformat()}\n\n")
                f.write(text)

            char_count = len(text)
            print(f"  完成：{char_count} 字元 -> {output_path.name}")

            results["files"].append({
                "source": str(pdf_path),
                "output": str(output_path),
                "char_count": char_count
            })
        else:
            print(f"  跳過：無法提取文字")

    # 儲存處理記錄
    log_path = OUTPUT_DIR / "extraction_log.json"
    with open(log_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n\n處理完成！共處理 {len(results['files'])} 個檔案")
    print(f"記錄檔：{log_path}")


if __name__ == "__main__":
    process_all_pdfs()
