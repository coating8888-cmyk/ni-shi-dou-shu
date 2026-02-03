"""Feedback API for collecting user feedback on predictions."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import json
import os
from pathlib import Path

router = APIRouter(prefix="/feedback", tags=["feedback"])

# Data directory for storing feedbacks
DATA_DIR = Path(__file__).parent.parent / "data"
FEEDBACK_FILE = DATA_DIR / "feedbacks.json"

# Ensure data directory exists
DATA_DIR.mkdir(exist_ok=True)


class SpecificFeedback(BaseModel):
    """Specific feedback details."""
    correct_parts: Optional[str] = Field(None, description="哪些說對了")
    incorrect_parts: Optional[str] = Field(None, description="哪些說錯了")
    missing_parts: Optional[str] = Field(None, description="漏掉什麼重要的")


class FeedbackCreate(BaseModel):
    """Model for creating feedback."""
    chart_id: Optional[str] = Field(None, description="對應命盤ID")
    prediction_category: str = Field(..., description="預測類別", examples=["婚姻", "事業", "健康", "子女", "財運"])
    prediction_content: str = Field(..., description="AI的預測內容")
    used_rules: Optional[List[str]] = Field(None, description="使用的規則ID")
    accuracy_rating: int = Field(..., ge=1, le=5, description="準確度評分 1-5")
    is_accurate: str = Field(..., description="是否準確", examples=["true", "false", "partial"])
    actual_situation: str = Field(..., description="實際情況描述")
    specific_feedback: Optional[SpecificFeedback] = None


class FeedbackResponse(BaseModel):
    """Response model for feedback."""
    feedback_id: str
    message: str
    timestamp: str


class RuleStats(BaseModel):
    """Statistics for a rule."""
    rule_id: str
    total_cases: int
    accurate: int
    partial: int
    inaccurate: int
    accuracy_rate: float


def load_feedbacks() -> dict:
    """Load feedbacks from file."""
    if FEEDBACK_FILE.exists():
        with open(FEEDBACK_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"feedbacks": [], "rule_stats": {}}


def save_feedbacks(data: dict):
    """Save feedbacks to file."""
    with open(FEEDBACK_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def update_rule_stats(data: dict, feedback: dict):
    """Update rule statistics based on new feedback."""
    used_rules = feedback.get("used_rules") or []
    is_accurate = feedback.get("is_accurate", "false")

    for rule_id in used_rules:
        if rule_id not in data["rule_stats"]:
            data["rule_stats"][rule_id] = {
                "total_cases": 0,
                "accurate": 0,
                "partial": 0,
                "inaccurate": 0
            }

        stats = data["rule_stats"][rule_id]
        stats["total_cases"] += 1

        if is_accurate == "true":
            stats["accurate"] += 1
        elif is_accurate == "partial":
            stats["partial"] += 1
        else:
            stats["inaccurate"] += 1

        # Calculate accuracy rate
        stats["accuracy_rate"] = round(
            (stats["accurate"] + stats["partial"] * 0.5) / stats["total_cases"],
            3
        )


@router.post("/submit", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackCreate):
    """
    提交批命反饋

    用戶在收到批命結果後，可以提交反饋來幫助系統改進。
    """
    data = load_feedbacks()

    # Generate feedback ID
    feedback_id = f"FB{len(data['feedbacks']) + 1:04d}"
    timestamp = datetime.now().isoformat()

    # Create feedback record
    feedback_record = {
        "feedback_id": feedback_id,
        "timestamp": timestamp,
        "chart_id": feedback.chart_id,
        "prediction": {
            "category": feedback.prediction_category,
            "content": feedback.prediction_content,
            "used_rules": feedback.used_rules
        },
        "feedback": {
            "accuracy_rating": feedback.accuracy_rating,
            "is_accurate": feedback.is_accurate,
            "actual_situation": feedback.actual_situation,
            "specific_feedback": feedback.specific_feedback.dict() if feedback.specific_feedback else None
        }
    }

    # Add to feedbacks list
    data["feedbacks"].append(feedback_record)

    # Update rule statistics
    update_rule_stats(data, {
        "used_rules": feedback.used_rules,
        "is_accurate": feedback.is_accurate
    })

    # Save to file
    save_feedbacks(data)

    return FeedbackResponse(
        feedback_id=feedback_id,
        message="感謝您的反饋！這將幫助我們持續改進批命準確度。",
        timestamp=timestamp
    )


@router.get("/stats")
async def get_feedback_stats():
    """
    取得反饋統計

    查看各規則的準確率統計，用於改進系統。
    """
    data = load_feedbacks()

    total_feedbacks = len(data["feedbacks"])

    # Calculate overall accuracy
    if total_feedbacks > 0:
        accurate_count = sum(1 for f in data["feedbacks"] if f["feedback"]["is_accurate"] == "true")
        partial_count = sum(1 for f in data["feedbacks"] if f["feedback"]["is_accurate"] == "partial")
        overall_accuracy = round((accurate_count + partial_count * 0.5) / total_feedbacks, 3)
    else:
        overall_accuracy = 0

    # Get category breakdown
    category_stats = {}
    for f in data["feedbacks"]:
        cat = f["prediction"]["category"]
        if cat not in category_stats:
            category_stats[cat] = {"total": 0, "accurate": 0, "partial": 0, "inaccurate": 0}
        category_stats[cat]["total"] += 1
        is_acc = f["feedback"]["is_accurate"]
        if is_acc == "true":
            category_stats[cat]["accurate"] += 1
        elif is_acc == "partial":
            category_stats[cat]["partial"] += 1
        else:
            category_stats[cat]["inaccurate"] += 1

    # Sort rules by accuracy
    rule_stats = data.get("rule_stats", {})
    sorted_rules = sorted(
        rule_stats.items(),
        key=lambda x: x[1].get("accuracy_rate", 0),
        reverse=True
    )

    return {
        "總反饋數": total_feedbacks,
        "整體準確率": overall_accuracy,
        "各類別統計": category_stats,
        "規則準確率排名": [
            {
                "規則ID": rule_id,
                "樣本數": stats["total_cases"],
                "準確率": stats.get("accuracy_rate", 0),
                "狀態": "可靠" if stats.get("accuracy_rate", 0) > 0.8 else "待觀察" if stats.get("accuracy_rate", 0) > 0.5 else "需檢討"
            }
            for rule_id, stats in sorted_rules[:20]  # Top 20
        ]
    }


@router.get("/report")
async def get_improvement_report():
    """
    生成改進建議報告

    分析反饋數據，找出需要改進的規則。
    """
    data = load_feedbacks()

    if len(data["feedbacks"]) < 5:
        return {
            "message": "反饋數據不足，需要至少5筆反饋才能生成報告",
            "current_count": len(data["feedbacks"])
        }

    rule_stats = data.get("rule_stats", {})

    # Find rules that need improvement
    needs_improvement = []
    reliable_rules = []

    for rule_id, stats in rule_stats.items():
        if stats["total_cases"] >= 3:  # At least 3 samples
            acc_rate = stats.get("accuracy_rate", 0)
            if acc_rate < 0.5:
                needs_improvement.append({
                    "rule_id": rule_id,
                    "accuracy_rate": acc_rate,
                    "total_cases": stats["total_cases"],
                    "suggestion": "此規則準確率偏低，建議檢視條件是否完整或需要修正"
                })
            elif acc_rate > 0.8:
                reliable_rules.append({
                    "rule_id": rule_id,
                    "accuracy_rate": acc_rate,
                    "total_cases": stats["total_cases"]
                })

    # Find common errors
    common_errors = {}
    for f in data["feedbacks"]:
        if f["feedback"]["is_accurate"] == "false":
            cat = f["prediction"]["category"]
            if cat not in common_errors:
                common_errors[cat] = []
            if f["feedback"].get("specific_feedback"):
                common_errors[cat].append(f["feedback"]["specific_feedback"].get("incorrect_parts"))

    return {
        "報告生成時間": datetime.now().isoformat(),
        "總樣本數": len(data["feedbacks"]),
        "可靠規則": reliable_rules,
        "需改進規則": needs_improvement,
        "常見錯誤類型": common_errors,
        "改進建議": [
            "針對準確率低於50%的規則，檢視是否需要增加判斷條件",
            "收集更多特定類別的反饋以提高統計可信度",
            "分析錯誤案例的共同特徵，發現新的判斷模式"
        ]
    }


@router.get("/recent")
async def get_recent_feedbacks(limit: int = 10):
    """
    取得最近的反饋記錄
    """
    data = load_feedbacks()

    recent = data["feedbacks"][-limit:][::-1]  # Last N, reversed

    return {
        "count": len(recent),
        "feedbacks": recent
    }
