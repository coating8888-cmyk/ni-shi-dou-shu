"""SQLite database for 倪師斗數 feedback storage."""

import json
import sqlite3
from pathlib import Path

from backend.logger import get_logger

logger = get_logger("database")

DB_PATH = Path(__file__).parent / "data" / "nishi.db"


def get_connection() -> sqlite3.Connection:
    """Get a SQLite connection with row_factory."""
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize database schema."""
    conn = get_connection()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS feedbacks (
                feedback_id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                chart_id TEXT,
                prediction_category TEXT NOT NULL,
                prediction_content TEXT NOT NULL,
                used_rules TEXT,
                accuracy_rating INTEGER NOT NULL,
                is_accurate TEXT NOT NULL,
                actual_situation TEXT NOT NULL,
                correct_parts TEXT,
                incorrect_parts TEXT,
                missing_parts TEXT
            );

            CREATE TABLE IF NOT EXISTS rule_stats (
                rule_id TEXT PRIMARY KEY,
                total_cases INTEGER DEFAULT 0,
                accurate INTEGER DEFAULT 0,
                partial INTEGER DEFAULT 0,
                inaccurate INTEGER DEFAULT 0,
                accuracy_rate REAL DEFAULT 0.0
            );

            CREATE INDEX IF NOT EXISTS idx_feedbacks_category ON feedbacks(prediction_category);
            CREATE INDEX IF NOT EXISTS idx_feedbacks_accurate ON feedbacks(is_accurate);
        """)
        conn.commit()
        logger.info("資料庫初始化完成: %s", DB_PATH)

        # Migrate from feedbacks.json if it exists
        json_file = DB_PATH.parent / "feedbacks.json"
        if json_file.exists():
            _migrate_json_to_sqlite(conn, json_file)
    finally:
        conn.close()


def _migrate_json_to_sqlite(conn: sqlite3.Connection, json_file: Path):
    """One-time migration from feedbacks.json to SQLite."""
    existing = conn.execute("SELECT COUNT(*) FROM feedbacks").fetchone()[0]
    if existing > 0:
        return  # Already migrated

    try:
        data = json.loads(json_file.read_text(encoding="utf-8"))
        feedbacks = data.get("feedbacks", [])
        if not feedbacks:
            return

        for fb in feedbacks:
            pred = fb.get("prediction", {})
            feedback = fb.get("feedback", {})
            specific = feedback.get("specific_feedback") or {}
            conn.execute(
                """INSERT OR IGNORE INTO feedbacks
                   (feedback_id, timestamp, chart_id, prediction_category, prediction_content,
                    used_rules, accuracy_rating, is_accurate, actual_situation,
                    correct_parts, incorrect_parts, missing_parts)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    fb.get("feedback_id"),
                    fb.get("timestamp"),
                    fb.get("chart_id"),
                    pred.get("category", ""),
                    pred.get("content", ""),
                    json.dumps(pred.get("used_rules")) if pred.get("used_rules") else None,
                    feedback.get("accuracy_rating", 3),
                    feedback.get("is_accurate", "false"),
                    feedback.get("actual_situation", ""),
                    specific.get("correct_parts"),
                    specific.get("incorrect_parts"),
                    specific.get("missing_parts"),
                ),
            )

        # Migrate rule stats
        for rule_id, stats in data.get("rule_stats", {}).items():
            conn.execute(
                """INSERT OR IGNORE INTO rule_stats
                   (rule_id, total_cases, accurate, partial, inaccurate, accuracy_rate)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    rule_id,
                    stats.get("total_cases", 0),
                    stats.get("accurate", 0),
                    stats.get("partial", 0),
                    stats.get("inaccurate", 0),
                    stats.get("accuracy_rate", 0.0),
                ),
            )

        conn.commit()
        # Rename old file
        json_file.rename(json_file.with_suffix(".json.bak"))
        logger.info("已從 feedbacks.json 遷移 %d 筆反饋到 SQLite", len(feedbacks))
    except Exception as e:
        logger.error("JSON 遷移失敗: %s", e)
