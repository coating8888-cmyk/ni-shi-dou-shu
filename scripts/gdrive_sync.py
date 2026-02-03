"""Google Drive 同步腳本 - 下載倪海廈資料."""
import os
import io
from pathlib import Path
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
import pickle

# 設定
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
PROJECT_ROOT = Path(__file__).parent.parent
KNOWLEDGE_DIR = PROJECT_ROOT / "knowledge" / "raw"
CREDENTIALS_FILE = PROJECT_ROOT / "credentials" / "google_credentials.json"
TOKEN_FILE = PROJECT_ROOT / "credentials" / "token.pickle"


def get_credentials():
    """取得 Google API 憑證."""
    creds = None

    # 檢查是否有已儲存的 token
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)

    # 如果沒有有效憑證，進行授權
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.exists():
                print(f"請先下載 Google API 憑證到: {CREDENTIALS_FILE}")
                print("1. 前往 https://console.cloud.google.com/apis/credentials")
                print("2. 建立 OAuth 2.0 用戶端 ID（桌面應用程式）")
                print("3. 下載 JSON 並重新命名為 google_credentials.json")
                return None

            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_FILE), SCOPES
            )
            creds = flow.run_local_server(port=0)

        # 儲存 token
        TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)

    return creds


def list_files_in_folder(service, folder_id: str, indent: int = 0):
    """列出資料夾內的檔案."""
    query = f"'{folder_id}' in parents"
    results = service.files().list(
        q=query,
        pageSize=100,
        fields="nextPageToken, files(id, name, mimeType, size)"
    ).execute()

    files = results.get('files', [])

    for file in files:
        prefix = "  " * indent
        size = int(file.get('size', 0)) / 1024 / 1024  # MB
        print(f"{prefix}{'📁' if file['mimeType'] == 'application/vnd.google-apps.folder' else '📄'} {file['name']} ({size:.1f} MB)")

        # 如果是資料夾，遞迴列出
        if file['mimeType'] == 'application/vnd.google-apps.folder':
            list_files_in_folder(service, file['id'], indent + 1)

    return files


def download_file(service, file_id: str, file_name: str, dest_folder: Path):
    """下載單一檔案."""
    dest_folder.mkdir(parents=True, exist_ok=True)
    dest_path = dest_folder / file_name

    if dest_path.exists():
        print(f"  ⏭️  已存在: {file_name}")
        return

    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)

    done = False
    while not done:
        status, done = downloader.next_chunk()
        print(f"  ⬇️  下載中: {file_name} ({int(status.progress() * 100)}%)")

    with open(dest_path, 'wb') as f:
        f.write(fh.getvalue())

    print(f"  ✅ 完成: {file_name}")


def download_folder(service, folder_id: str, dest_folder: Path):
    """下載整個資料夾."""
    query = f"'{folder_id}' in parents"
    results = service.files().list(
        q=query,
        pageSize=100,
        fields="nextPageToken, files(id, name, mimeType)"
    ).execute()

    files = results.get('files', [])

    for file in files:
        if file['mimeType'] == 'application/vnd.google-apps.folder':
            # 遞迴下載子資料夾
            sub_folder = dest_folder / file['name']
            download_folder(service, file['id'], sub_folder)
        else:
            # 根據檔案類型分類
            mime = file['mimeType']
            if 'pdf' in mime:
                dest = KNOWLEDGE_DIR / "pdf"
            elif 'video' in mime or 'audio' in mime:
                dest = KNOWLEDGE_DIR / "video"
            else:
                dest = KNOWLEDGE_DIR / "text"

            download_file(service, file['id'], file['name'], dest)


def main():
    """主程式."""
    print("=== 倪海廈知識庫同步 ===\n")

    creds = get_credentials()
    if not creds:
        return

    service = build('drive', 'v3', credentials=creds)

    # 請輸入要同步的資料夾 ID
    # 從 Google Drive 資料夾網址取得：
    # https://drive.google.com/drive/folders/XXXXXX <- 這個 XXXXXX 就是 ID

    folder_id = input("請輸入 Google Drive 資料夾 ID: ").strip()

    if not folder_id:
        print("未輸入資料夾 ID")
        return

    print(f"\n📂 資料夾內容：")
    list_files_in_folder(service, folder_id)

    confirm = input("\n確定要下載這些檔案嗎？(y/n): ").strip().lower()
    if confirm != 'y':
        print("取消下載")
        return

    print("\n開始下載...")
    download_folder(service, folder_id, KNOWLEDGE_DIR)

    print("\n✅ 同步完成！")
    print(f"檔案已下載到: {KNOWLEDGE_DIR}")


if __name__ == "__main__":
    main()
