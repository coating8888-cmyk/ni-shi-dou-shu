"""Feng Shui analysis API endpoints based on 倪海廈 teachings."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import json
from pathlib import Path

router = APIRouter(prefix="/fengshui", tags=["Feng Shui Analysis"])

RULES_DIR = Path(__file__).parent.parent / "rules"

# Load fengshui rules
with open(RULES_DIR / "fengshui.json", "r", encoding="utf-8") as f:
    FENGSHUI_RULES = json.load(f)


class RoomPosition(BaseModel):
    """Room position model."""
    position: str  # 東、西、南、北、東北、東南、西北、西南、中央
    element: str   # 廚房、廁所、臥室、客廳、書房、門


class FengshuiRequest(BaseModel):
    """Feng Shui analysis request."""
    rooms: List[RoomPosition]


class FengshuiIssue(BaseModel):
    """Feng Shui issue found in the layout."""
    position: str
    element: str
    effect: str
    remedy: str
    severity: str  # 輕微、中等、嚴重


class FengshuiResponse(BaseModel):
    """Feng Shui analysis response."""
    issues: List[FengshuiIssue]
    overall_score: int  # 0-100
    recommendations: List[str]


# Position mapping from rules to normalized positions
POSITION_MAP = {
    "西北角": "西北",
    "西南角": "西南",
    "東南角": "東南",
    "東北角": "東北",
    "正東": "東",
    "正西": "西",
    "正南": "南",
    "正北": "北",
    "房子中間": "中央",
}

# Reverse mapping
REVERSE_POSITION_MAP = {v: k for k, v in POSITION_MAP.items()}

# Severity mapping
SEVERITY_MAP = {
    "大凶": "嚴重",
    "凶": "中等",
    "小凶": "輕微",
}

# General remedies based on position and element
REMEDIES = {
    ("西北", "廚房"): "將廚房移至其他方位，或在西北角放置銅製風水物品",
    ("西南", "廚房"): "將廚房移至其他方位，或在西南角放置陶瓷風水物品",
    ("西北", "客廳"): "調整客廳位置，或在西北角設置主臥室",
    ("中央", "廁所"): "若無法移動，需在廁所內放置植物，並保持良好通風",
    ("西北", "廁所"): "保持廁所清潔乾燥，可放置水晶或銅器化解",
    ("東", "客廳"): "在東方放置木製品或綠色植物以補東宮之氣",
}

# General recommendations
GENERAL_RECOMMENDATIONS = [
    "床頭宜朝北或西，避免朝東",
    "書桌朝向化科所在宮位有利讀書考試",
    "做生意者書桌可朝向化祿、貪狼、祿存所在宮位",
    "臥室位置應根據家庭成員身份選擇適當方位",
    "房屋格局應東西兩側均有人居住，避免一側空置",
]


def normalize_position(position: str) -> str:
    """Normalize position name."""
    # If it's already in standard form, return as is
    if position in ["東", "西", "南", "北", "東北", "東南", "西北", "西南", "中央"]:
        return position
    # Try to find in position map
    for rule_pos, standard_pos in POSITION_MAP.items():
        if position in rule_pos or rule_pos in position:
            return standard_pos
    return position


def get_rule_position(position: str) -> List[str]:
    """Get all possible rule position names for a given standard position."""
    positions = [position]
    if position in REVERSE_POSITION_MAP:
        positions.append(REVERSE_POSITION_MAP[position])
    # Add variations
    if position == "西北":
        positions.extend(["西北角", "西北方"])
    elif position == "西南":
        positions.extend(["西南角", "西南方"])
    elif position == "東南":
        positions.extend(["東南角", "東南方"])
    elif position == "東北":
        positions.extend(["東北角", "東北方"])
    elif position == "東":
        positions.extend(["正東", "東方"])
    elif position == "西":
        positions.extend(["正西", "西方"])
    elif position == "南":
        positions.extend(["正南", "南方"])
    elif position == "北":
        positions.extend(["正北", "北方"])
    elif position == "中央":
        positions.extend(["房子中間", "中間"])
    return positions


def check_room_against_rules(room: RoomPosition) -> Optional[FengshuiIssue]:
    """Check a room against feng shui rules."""
    rule_positions = get_rule_position(room.position)

    # Check against 凶宅判斷 rules
    for rule in FENGSHUI_RULES.get("凶宅判斷", []):
        rule_position = rule.get("position", "")
        rule_element = rule.get("element", "")

        # Check if position and element match
        position_match = any(pos in rule_position or rule_position in pos for pos in rule_positions)
        element_match = room.element in rule_element or rule_element in room.element

        if position_match and element_match:
            severity = SEVERITY_MAP.get(rule.get("severity", "凶"), "中等")
            remedy = REMEDIES.get((room.position, room.element), "建議諮詢專業風水師")

            return FengshuiIssue(
                position=room.position,
                element=room.element,
                effect=rule.get("effect", ""),
                remedy=remedy,
                severity=severity,
            )

    return None


@router.post("/analyze", response_model=FengshuiResponse)
async def analyze_fengshui(request: FengshuiRequest) -> FengshuiResponse:
    """
    Analyze feng shui based on room positions.

    Matches room positions against rules and finds potential issues.
    Returns issues found, an overall score, and recommendations.
    """
    issues: List[FengshuiIssue] = []

    # Check each room against rules
    for room in request.rooms:
        issue = check_room_against_rules(room)
        if issue:
            issues.append(issue)

    # Calculate score: 100 - (issues * 15), clamped to 0-100
    # Adjust penalty based on severity
    total_penalty = 0
    for issue in issues:
        if issue.severity == "嚴重":
            total_penalty += 25
        elif issue.severity == "中等":
            total_penalty += 15
        else:
            total_penalty += 10

    overall_score = max(0, min(100, 100 - total_penalty))

    # Generate recommendations based on issues
    recommendations = []

    # Add specific recommendations based on issues
    for issue in issues:
        if issue.severity == "嚴重":
            recommendations.append(f"重要：{issue.position}方位的{issue.element}問題需優先處理")

    # Add general recommendations
    recommendations.extend(GENERAL_RECOMMENDATIONS[:3])  # Add top 3 general recommendations

    return FengshuiResponse(
        issues=issues,
        overall_score=overall_score,
        recommendations=recommendations,
    )


@router.get("/rules")
async def get_fengshui_rules():
    """Get all feng shui rules from 倪師 teachings."""
    return FENGSHUI_RULES


@router.get("/positions")
async def get_positions():
    """Get all valid positions for room placement."""
    return {
        "positions": [
            {"label": "東", "value": "東"},
            {"label": "西", "value": "西"},
            {"label": "南", "value": "南"},
            {"label": "北", "value": "北"},
            {"label": "東北", "value": "東北"},
            {"label": "東南", "value": "東南"},
            {"label": "西北", "value": "西北"},
            {"label": "西南", "value": "西南"},
            {"label": "中央", "value": "中央"},
        ],
        "elements": [
            {"label": "廚房", "value": "廚房"},
            {"label": "廁所", "value": "廁所"},
            {"label": "臥室", "value": "臥室"},
            {"label": "客廳", "value": "客廳"},
            {"label": "書房", "value": "書房"},
            {"label": "大門", "value": "門"},
        ],
    }
