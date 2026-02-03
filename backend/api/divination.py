"""Divination API for 六壬速斷 (Liu Ren Quick Divination)."""

from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import json
from pathlib import Path

router = APIRouter(prefix="/divination", tags=["divination"])

RULES_DIR = Path(__file__).parent.parent / "rules"

with open(RULES_DIR / "divination.json", "r", encoding="utf-8") as f:
    DIVINATION_RULES = json.load(f)


class DivinationRequest(BaseModel):
    """Request model for divination."""

    method: str = "六壬速斷"
    question: str
    timestamp: Optional[datetime] = None


class DivinationResult(BaseModel):
    """Result model for divination."""

    method: str
    hexagram: str
    interpretation: str
    advice: str
    nature: str = ""
    timing: str = ""


def get_lunar_hour_index(hour: int) -> int:
    """
    Convert 24-hour format to Chinese hour (時辰) index.
    子時 (23-01): 0, 丑時 (01-03): 1, ..., 亥時 (21-23): 11
    """
    # Map hours to 時辰 index
    hour_map = {
        23: 0, 0: 0,    # 子時
        1: 1, 2: 1,     # 丑時
        3: 2, 4: 2,     # 寅時
        5: 3, 6: 3,     # 卯時
        7: 4, 8: 4,     # 辰時
        9: 5, 10: 5,    # 巳時
        11: 6, 12: 6,   # 午時
        13: 7, 14: 7,   # 未時
        15: 8, 16: 8,   # 申時
        17: 9, 18: 9,   # 酉時
        19: 10, 20: 10, # 戌時
        21: 11, 22: 11, # 亥時
    }
    return hour_map.get(hour, 0)


def calculate_liuren(month: int, day: int, hour_index: int) -> int:
    """
    Calculate 六壬速斷 result.

    The method:
    1. Start from 大安 (position 1)
    2. Count month number
    3. Count day number from there
    4. Count hour number from there

    The 6 positions cycle: 大安(1) -> 流連(2) -> 速喜(3) -> 赤口(4) -> 小吉(5) -> 空亡(6) -> 大安(1)
    """
    # Calculate total steps (month + day + hour)
    # Since we start from 大安 (1), subtract 1 for 0-indexing, then modulo 6
    total = month + day + (hour_index + 1)  # hour_index is 0-based, add 1 for count
    result = (total - 1) % 6  # -1 because we start from position 1 (大安)
    return result


@router.post("/divine")
async def divine(request: DivinationRequest) -> DivinationResult:
    """
    Perform divination using the specified method.

    Currently supports: 六壬速斷
    """
    timestamp = request.timestamp or datetime.now()

    if request.method == "六壬速斷":
        liuren_rules = DIVINATION_RULES.get("六壬速斷", {})
        results = liuren_rules.get("results", [])

        # Get the hour index (時辰)
        hour_index = get_lunar_hour_index(timestamp.hour)

        # Calculate result position
        result_index = calculate_liuren(timestamp.month, timestamp.day, hour_index)

        # Get the result from rules
        if results and 0 <= result_index < len(results):
            result_data = results[result_index]
            result_name = result_data.get("name", "")
            meaning = result_data.get("meaning", "")
            nature = result_data.get("nature", "")
            timing = result_data.get("timing", "")
        else:
            result_name = "未知"
            meaning = "計算結果異常"
            nature = ""
            timing = ""

        # Get position info
        positions = liuren_rules.get("positions", {})
        position_info = positions.get(str(result_index + 1), {})
        finger = position_info.get("finger", "")

        # Build hexagram display string
        shichen_names = ["子時", "丑時", "寅時", "卯時", "辰時", "巳時",
                         "午時", "未時", "申時", "酉時", "戌時", "亥時"]
        current_shichen = shichen_names[hour_index]

        hexagram = f"農曆{timestamp.month}月{timestamp.day}日 {current_shichen} → {result_name}"

        return DivinationResult(
            method="六壬速斷",
            hexagram=hexagram,
            interpretation=meaning,
            advice=f"位置：{finger}。建議結合實際情況綜合判斷。",
            nature=nature,
            timing=timing,
        )

    return DivinationResult(
        method=request.method,
        hexagram="",
        interpretation="暫不支援此卜卦方法",
        advice="",
        nature="",
        timing="",
    )


@router.get("/methods")
async def get_methods():
    """Get available divination methods."""
    return ["六壬速斷"]


@router.get("/rules")
async def get_rules():
    """Get divination rules (六壬速斷 details)."""
    return DIVINATION_RULES.get("六壬速斷", {})
