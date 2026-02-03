from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import date


class Gender(str, Enum):
    """Gender enumeration for birth data."""

    MALE = "男"
    FEMALE = "女"


class BirthDataRequest(BaseModel):
    """Request model for birth data input."""

    year: int = Field(..., ge=1900, le=2100, description="Birth year")
    month: int = Field(..., ge=1, le=12, description="Birth month")
    day: int = Field(..., ge=1, le=31, description="Birth day")
    hour: int = Field(..., ge=0, le=23, description="Birth hour (0-23)")
    gender: Gender = Field(..., description="Gender (男/女)")
    is_lunar: bool = Field(default=False, description="Whether the date is in lunar calendar")
    is_leap_month: bool = Field(default=False, description="Whether it's a leap month")

    model_config = {
        "json_schema_extra": {
            "example": {
                "year": 1990,
                "month": 5,
                "day": 15,
                "hour": 10,
                "gender": "男",
                "is_lunar": False,
                "is_leap_month": False,
            }
        }
    }


class StarInfo(BaseModel):
    """Model for star information."""

    id: str = Field(..., description="Star identifier")
    name: str = Field(..., description="Star name")
    nature: Optional[str] = Field(None, description="Star nature")
    yinyang: Optional[str] = Field(None, description="Yin/Yang attribute")
    represents: Optional[List[str]] = Field(None, description="What the star represents")
    appearance: Optional[List[str]] = Field(None, description="Physical appearance traits")
    personality: Optional[List[str]] = Field(None, description="Personality traits")
    notes: Optional[str] = Field(None, description="Additional notes")


class PalaceInfo(BaseModel):
    """Model for palace (宮位) information."""

    id: str = Field(..., description="Palace identifier")
    name: str = Field(..., description="Palace name")
    meaning: str = Field(..., description="Palace meaning")
    branch: Optional[str] = Field(None, description="Earthly branch")
    body_part: Optional[str] = Field(None, description="Related body part")
    face_part: Optional[str] = Field(None, description="Related face part")
    analysis: Optional[List[str]] = Field(None, description="Analysis aspects")
    notes: Optional[str] = Field(None, description="Additional notes")


class PatternInfo(BaseModel):
    """Model for pattern (格局) information."""

    id: str = Field(..., description="Pattern identifier")
    name: str = Field(..., description="Pattern name")
    conditions: Dict[str, Any] = Field(..., description="Pattern conditions")
    meaning: str = Field(..., description="Pattern meaning")
    effect: Optional[str] = Field(None, description="Pattern effect")
    gender_effect: Optional[Dict[str, str]] = Field(None, description="Gender-specific effects")
    notes: Optional[str] = Field(None, description="Additional notes")


class CombinationInfo(BaseModel):
    """Model for star combination information."""

    id: str = Field(..., description="Combination identifier")
    stars: List[str] = Field(..., description="Stars involved")
    effect: Any = Field(..., description="Combination effect")
    condition: Optional[str] = Field(None, description="Condition for the combination")
    severity: Optional[str] = Field(None, description="Severity level")


class MatchedPattern(BaseModel):
    """Model for a matched pattern in analysis."""

    pattern_id: str = Field(..., description="Pattern ID")
    pattern_name: str = Field(..., description="Pattern name")
    pattern_type: str = Field(..., description="Type: 吉格/凶格/特殊格局")
    meaning: str = Field(..., description="Pattern meaning")
    effect: Optional[str] = Field(None, description="Pattern effect")
    relevance: float = Field(..., ge=0.0, le=1.0, description="How relevant/confident this match is")


class PalaceAnalysis(BaseModel):
    """Model for individual palace analysis."""

    palace_id: str = Field(..., description="Palace ID")
    palace_name: str = Field(..., description="Palace name")
    stars: List[str] = Field(default_factory=list, description="Stars in this palace")
    interpretation: str = Field(..., description="Palace interpretation")
    key_points: List[str] = Field(default_factory=list, description="Key points for this palace")


class AnalysisResult(BaseModel):
    """Model for complete analysis result."""

    # Basic info
    birth_data: BirthDataRequest = Field(..., description="Original birth data")

    # Pattern analysis
    matched_patterns: List[MatchedPattern] = Field(
        default_factory=list, description="Matched patterns"
    )

    # Palace analysis
    palace_analyses: List[PalaceAnalysis] = Field(
        default_factory=list, description="Individual palace analyses"
    )

    # Overall analysis
    overall_fortune: str = Field("", description="Overall fortune summary")
    career_analysis: str = Field("", description="Career analysis")
    relationship_analysis: str = Field("", description="Relationship analysis")
    health_analysis: str = Field("", description="Health analysis")
    wealth_analysis: str = Field("", description="Wealth analysis")

    # Recommendations
    recommendations: List[str] = Field(
        default_factory=list, description="Recommendations based on the analysis"
    )

    # Metadata
    analysis_method: str = Field(
        default="rule_based", description="Analysis method used (rule_based/ai_enhanced)"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "birth_data": {
                    "year": 1990,
                    "month": 5,
                    "day": 15,
                    "hour": 10,
                    "gender": "男",
                    "is_lunar": False,
                    "is_leap_month": False,
                },
                "matched_patterns": [
                    {
                        "pattern_id": "jiyue_tongliang",
                        "pattern_name": "機月同梁",
                        "pattern_type": "吉格",
                        "meaning": "吏也，公家單位工作",
                        "effect": "適合公務員",
                        "relevance": 0.85,
                    }
                ],
                "palace_analyses": [],
                "overall_fortune": "命格清貴，適合公職發展",
                "career_analysis": "適合公務員或教職",
                "relationship_analysis": "婚姻平順",
                "health_analysis": "注意腸胃健康",
                "wealth_analysis": "財運穩健",
                "recommendations": ["可考慮公職考試", "注意飲食規律"],
                "analysis_method": "rule_based",
            }
        }
    }


class ChartData(BaseModel):
    """Model for chart data from frontend."""

    palaces: Dict[str, Dict[str, Any]] = Field(..., description="Palace data with stars")
    body_palace: Optional[str] = Field(None, description="Body palace location")
    five_elements: Optional[str] = Field(None, description="Five elements")


class FullAnalysisRequest(BaseModel):
    """Request model for full analysis with chart data."""

    birth_data: BirthDataRequest = Field(..., description="Birth data")
    chart_data: Optional[ChartData] = Field(None, description="Pre-calculated chart data")
    include_ai: bool = Field(default=False, description="Whether to include AI analysis")
