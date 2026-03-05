"""Feedback API for collecting user feedback on predictions — SQLite backend."""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import json

from backend.database import get_connection
from backend.logger import get_logger

logger = get_logger("feedback")

router = APIRouter(prefix="/feedback", tags=["feedback"])


class SpecificFeedback(BaseModel):
    correct_parts: Optional[str] = Field(None, description="哪些說對了")
    incorrect_parts: Optional[str] = Field(None, description="哪些說錯了")
    missing_parts: Optional[str] = Field(None, description="漏掉什麼重要的")


class FeedbackCreate(BaseModel):
    chart_id: Optional[str] = Field(None, description="對應命盤ID")
    prediction_category: str = Field(..., description="預測類別", examples=["婚姻", "事業", "健康", "子女", "財運"])
    prediction_content: str = Field(..., description="AI的預測內容")
    used_rules: Optional[List[str]] = Field(None, description="使用的規則ID")
    accuracy_rating: int = Field(..., ge=1, le=5, description="準確度評分 1-5")
    is_accurate: str = Field(..., description="是否準確", examples=["true", "false", "partial"])
    actual_situation: str = Field(..., description="實際情況描述")
    specific_feedback: Optional[SpecificFeedback] = None


class FeedbackResponse(BaseModel):
    feedback_id: str
    message: str
    timestamp: str


def _update_rule_stats(conn, rule_id: str, is_accurate: str):
    """Update rule statistics for a single rule."""
    row = conn.execute("SELECT * FROM rule_stats WHERE rule_id = ?", (rule_id,)).fetchone()
    if row is None:
        conn.execute(
            "INSERT INTO rule_stats (rule_id, total_cases, accurate, partial, inaccurate, accuracy_rate) VALUES (?, 0, 0, 0, 0, 0.0)",
            (rule_id,),
        )

    if is_accurate == "true":
        conn.execute("UPDATE rule_stats SET total_cases = total_cases + 1, accurate = accurate + 1 WHERE rule_id = ?", (rule_id,))
    elif is_accurate == "partial":
        conn.execute("UPDATE rule_stats SET total_cases = total_cases + 1, partial = partial + 1 WHERE rule_id = ?", (rule_id,))
    else:
        conn.execute("UPDATE rule_stats SET total_cases = total_cases + 1, inaccurate = inaccurate + 1 WHERE rule_id = ?", (rule_id,))

    # Recalculate accuracy rate
    conn.execute(
        "UPDATE rule_stats SET accuracy_rate = ROUND((accurate + partial * 0.5) * 1.0 / total_cases, 3) WHERE rule_id = ?",
        (rule_id,),
    )


@router.post("/submit", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackCreate):
    """提交批命反饋"""
    conn = get_connection()
    try:
        # Generate feedback ID
        count = conn.execute("SELECT COUNT(*) FROM feedbacks").fetchone()[0]
        feedback_id = f"FB{count + 1:04d}"
        timestamp = datetime.now().isoformat()

        specific = feedback.specific_feedback
        conn.execute(
            """INSERT INTO feedbacks
               (feedback_id, timestamp, chart_id, prediction_category, prediction_content,
                used_rules, accuracy_rating, is_accurate, actual_situation,
                correct_parts, incorrect_parts, missing_parts)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                feedback_id,
                timestamp,
                feedback.chart_id,
                feedback.prediction_category,
                feedback.prediction_content,
                json.dumps(feedback.used_rules) if feedback.used_rules else None,
                feedback.accuracy_rating,
                feedback.is_accurate,
                feedback.actual_situation,
                specific.correct_parts if specific else None,
                specific.incorrect_parts if specific else None,
                specific.missing_parts if specific else None,
            ),
        )

        # Update rule stats
        if feedback.used_rules:
            for rule_id in feedback.used_rules:
                _update_rule_stats(conn, rule_id, feedback.is_accurate)

        conn.commit()
        logger.info("反饋已儲存: %s", feedback_id)

        return FeedbackResponse(
            feedback_id=feedback_id,
            message="感謝您的反饋！這將幫助我們持續改進批命準確度。",
            timestamp=timestamp,
        )
    finally:
        conn.close()


@router.get("/stats")
async def get_feedback_stats():
    """取得反饋統計"""
    conn = get_connection()
    try:
        total = conn.execute("SELECT COUNT(*) FROM feedbacks").fetchone()[0]

        if total > 0:
            accurate_count = conn.execute("SELECT COUNT(*) FROM feedbacks WHERE is_accurate = 'true'").fetchone()[0]
            partial_count = conn.execute("SELECT COUNT(*) FROM feedbacks WHERE is_accurate = 'partial'").fetchone()[0]
            overall_accuracy = round((accurate_count + partial_count * 0.5) / total, 3)
        else:
            overall_accuracy = 0

        # Category breakdown
        category_rows = conn.execute(
            """SELECT prediction_category,
                      COUNT(*) as total,
                      SUM(CASE WHEN is_accurate = 'true' THEN 1 ELSE 0 END) as accurate,
                      SUM(CASE WHEN is_accurate = 'partial' THEN 1 ELSE 0 END) as partial,
                      SUM(CASE WHEN is_accurate = 'false' THEN 1 ELSE 0 END) as inaccurate
               FROM feedbacks GROUP BY prediction_category"""
        ).fetchall()

        category_stats = {}
        for row in category_rows:
            category_stats[row["prediction_category"]] = {
                "total": row["total"],
                "accurate": row["accurate"],
                "partial": row["partial"],
                "inaccurate": row["inaccurate"],
            }

        # Rule stats
        rule_rows = conn.execute(
            "SELECT * FROM rule_stats ORDER BY accuracy_rate DESC LIMIT 20"
        ).fetchall()

        return {
            "總反饋數": total,
            "整體準確率": overall_accuracy,
            "各類別統計": category_stats,
            "規則準確率排名": [
                {
                    "規則ID": row["rule_id"],
                    "樣本數": row["total_cases"],
                    "準確率": row["accuracy_rate"],
                    "狀態": "可靠" if row["accuracy_rate"] > 0.8 else "待觀察" if row["accuracy_rate"] > 0.5 else "需檢討",
                }
                for row in rule_rows
            ],
        }
    finally:
        conn.close()


@router.get("/report")
async def get_improvement_report():
    """生成改進建議報告"""
    conn = get_connection()
    try:
        total = conn.execute("SELECT COUNT(*) FROM feedbacks").fetchone()[0]
        if total < 5:
            return {"message": "反饋數據不足，需要至少5筆反饋才能生成報告", "current_count": total}

        needs_improvement = []
        reliable_rules = []

        rule_rows = conn.execute("SELECT * FROM rule_stats WHERE total_cases >= 3").fetchall()
        for row in rule_rows:
            entry = {"rule_id": row["rule_id"], "accuracy_rate": row["accuracy_rate"], "total_cases": row["total_cases"]}
            if row["accuracy_rate"] < 0.5:
                entry["suggestion"] = "此規則準確率偏低，建議檢視條件是否完整或需要修正"
                needs_improvement.append(entry)
            elif row["accuracy_rate"] > 0.8:
                reliable_rules.append(entry)

        # Common errors
        error_rows = conn.execute(
            "SELECT prediction_category, incorrect_parts FROM feedbacks WHERE is_accurate = 'false' AND incorrect_parts IS NOT NULL"
        ).fetchall()

        common_errors: dict[str, list] = {}
        for row in error_rows:
            cat = row["prediction_category"]
            if cat not in common_errors:
                common_errors[cat] = []
            common_errors[cat].append(row["incorrect_parts"])

        return {
            "報告生成時間": datetime.now().isoformat(),
            "總樣本數": total,
            "可靠規則": reliable_rules,
            "需改進規則": needs_improvement,
            "常見錯誤類型": common_errors,
            "改進建議": [
                "針對準確率低於50%的規則，檢視是否需要增加判斷條件",
                "收集更多特定類別的反饋以提高統計可信度",
                "分析錯誤案例的共同特徵，發現新的判斷模式",
            ],
        }
    finally:
        conn.close()


@router.get("/recent")
async def get_recent_feedbacks(limit: int = 10):
    """取得最近的反饋記錄"""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM feedbacks ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()

        feedbacks = []
        for row in rows:
            feedbacks.append({
                "feedback_id": row["feedback_id"],
                "timestamp": row["timestamp"],
                "chart_id": row["chart_id"],
                "prediction": {
                    "category": row["prediction_category"],
                    "content": row["prediction_content"],
                    "used_rules": json.loads(row["used_rules"]) if row["used_rules"] else None,
                },
                "feedback": {
                    "accuracy_rating": row["accuracy_rating"],
                    "is_accurate": row["is_accurate"],
                    "actual_situation": row["actual_situation"],
                    "specific_feedback": {
                        "correct_parts": row["correct_parts"],
                        "incorrect_parts": row["incorrect_parts"],
                        "missing_parts": row["missing_parts"],
                    } if any([row["correct_parts"], row["incorrect_parts"], row["missing_parts"]]) else None,
                },
            })

        return {"count": len(feedbacks), "feedbacks": feedbacks}
    finally:
        conn.close()
