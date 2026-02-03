#!/usr/bin/env python3
"""
完整文字提取腳本
處理所有 PDF、DOC、DOCX 文件
"""

import os
import json
from pathlib import Path
from datetime import datetime

# PDF 處理
try:
    import pdfplumber
    PDF_OK = True
except ImportError:
    PDF_OK = False
    print("警告：未安裝 pdfplumber")

# Word 處理
try:
    from docx import Document as DocxDocument
    DOCX_OK = True
except ImportError:
    DOCX_OK = False
    print("警告：未安裝 python-docx")

# 舊版 DOC 處理（需要 antiword 或 textract）
try:
    import subprocess
    DOC_OK = True
except:
    DOC_OK = False

# 路徑設定
BASE_DIR = Path(__file__).parent.parent
RAW_DIRS = [
    BASE_DIR / "knowledge" / "raw" / "pdf",
    BASE_DIR / "knowledge" / "raw" / "text",
]
OUTPUT_DIR = BASE_DIR / "knowledge" / "processed" / "extracted"


def extract_pdf(pdf_path: Path) -> str:
    """提取 PDF 文字"""
    if not PDF_OK:
        return ""

    text_content = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                if text:
                    text_content.append(text)
    except Exception as e:
        print(f"  PDF 錯誤：{e}")
        return ""
    return "\n\n".join(text_content)


def extract_docx(docx_path: Path) -> str:
    """提取 DOCX 文字"""
    if not DOCX_OK:
        return ""

    try:
        doc = DocxDocument(docx_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)
    except Exception as e:
        print(f"  DOCX 錯誤：{e}")
        return ""


def extract_doc(doc_path: Path) -> str:
    """提取舊版 DOC 文字（使用 antiword 或 catdoc）"""
    try:
        # 嘗試使用 antiword
        result = subprocess.run(
            ['antiword', str(doc_path)],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            return result.stdout
    except FileNotFoundError:
        pass
    except Exception:
        pass

    try:
        # 嘗試使用 catdoc
        result = subprocess.run(
            ['catdoc', str(doc_path)],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            return result.stdout
    except FileNotFoundError:
        pass
    except Exception:
        pass

    # 嘗試以二進制方式讀取並提取文字
    try:
        with open(doc_path, 'rb') as f:
            content = f.read()
            # 嘗試找到文字內容
            text = content.decode('utf-8', errors='ignore')
            # 過濾非可見字符
            text = ''.join(c for c in text if c.isprintable() or c in '\n\r\t')
            if len(text) > 100:
                return text
    except Exception:
        pass

    print(f"  DOC 無法提取（請安裝 antiword: sudo apt install antiword）")
    return ""


def get_output_name(file_path: Path, base_dir: Path) -> str:
    """產生輸出檔名"""
    try:
        relative = file_path.relative_to(base_dir)
        name = str(relative).replace("/", "_").replace("\\", "_")
        name = Path(name).stem + ".txt"
        return name
    except:
        return file_path.stem + ".txt"


def process_all_files():
    """處理所有文件"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    results = {
        "processed_at": datetime.now().isoformat(),
        "files": [],
        "errors": []
    }

    # 收集所有文件
    all_files = []
    for raw_dir in RAW_DIRS:
        if raw_dir.exists():
            all_files.extend(raw_dir.rglob("*.pdf"))
            all_files.extend(raw_dir.rglob("*.docx"))
            all_files.extend(raw_dir.rglob("*.doc"))

    # 過濾
    all_files = [f for f in all_files if "Zone.Identifier" not in str(f)]

    print(f"找到 {len(all_files)} 個文件待處理")

    for i, file_path in enumerate(all_files):
        print(f"\n[{i+1}/{len(all_files)}] {file_path.name}")

        # 檢查是否已處理
        output_name = get_output_name(file_path, BASE_DIR / "knowledge" / "raw")
        output_path = OUTPUT_DIR / output_name

        if output_path.exists():
            print(f"  已存在，跳過")
            continue

        # 提取文字
        suffix = file_path.suffix.lower()
        if suffix == ".pdf":
            text = extract_pdf(file_path)
        elif suffix == ".docx":
            text = extract_docx(file_path)
        elif suffix == ".doc":
            text = extract_doc(file_path)
        else:
            text = ""

        if text and len(text) > 50:
            # 寫入檔案
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(f"# 來源：{file_path.name}\n")
                f.write(f"# 路徑：{file_path}\n")
                f.write(f"# 提取時間：{datetime.now().isoformat()}\n\n")
                f.write(text)

            print(f"  完成：{len(text)} 字元")
            results["files"].append({
                "source": str(file_path),
                "output": str(output_path),
                "char_count": len(text)
            })
        else:
            print(f"  跳過：內容太少或提取失敗")
            results["errors"].append(str(file_path))

    # 儲存記錄
    log_path = OUTPUT_DIR / "extraction_log_full.json"
    with open(log_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n\n===== 完成 =====")
    print(f"成功：{len(results['files'])} 個")
    print(f"失敗：{len(results['errors'])} 個")
    print(f"記錄：{log_path}")


if __name__ == "__main__":
    process_all_files()
