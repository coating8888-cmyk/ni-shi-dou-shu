"""AI-enhanced analysis API endpoints."""

import json
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Depends

from backend.config import Settings, get_settings
from backend.models.schemas import (
    BirthDataRequest,
    AnalysisResult,
    MatchedPattern,
    PalaceAnalysis,
    FullAnalysisRequest,
)
from backend.api.chart import (
    analyze_patterns,
    get_stars_data,
    get_palaces_data,
    get_patterns_data,
    get_combinations_data,
)

router = APIRouter(prefix="/analysis", tags=["Analysis"])


def rule_based_analysis(
    birth_data: BirthDataRequest,
    chart_data: Optional[Dict[str, Any]] = None
) -> AnalysisResult:
    """
    Perform rule-based analysis using 倪師 teachings.

    This function analyzes the chart based on the rules defined in the JSON files,
    without requiring AI/OpenAI integration.

    Args:
        birth_data: The birth data request
        chart_data: Optional pre-calculated chart data

    Returns:
        AnalysisResult with rule-based interpretations
    """
    gender = birth_data.gender.value

    # Load rule data
    stars_data = get_stars_data()
    palaces_data = get_palaces_data()
    combinations_data = get_combinations_data()

    # Analyze patterns if chart data is available
    matched_patterns: List[MatchedPattern] = []
    if chart_data:
        matched_patterns = analyze_patterns(chart_data, gender)

    # Generate palace analyses
    palace_analyses: List[PalaceAnalysis] = []
    palaces_list = palaces_data.get("十二宮", [])

    for palace in palaces_list:
        palace_id = palace.get("id", "")
        palace_name = palace.get("name", "")
        meaning = palace.get("meaning", "")
        analysis_points = palace.get("analysis", [])
        notes = palace.get("notes", "")

        # Get stars in this palace from chart_data if available
        stars_in_palace: List[str] = []
        if chart_data and "palaces" in chart_data:
            palace_data = chart_data["palaces"].get(palace_name, {})
            stars_in_palace = [
                s.get("name", s) if isinstance(s, dict) else s
                for s in palace_data.get("stars", [])
            ]

        # Generate interpretation based on palace meaning and notes
        interpretation = meaning
        if notes:
            interpretation += f"。{notes}"

        palace_analyses.append(PalaceAnalysis(
            palace_id=palace_id,
            palace_name=palace_name,
            stars=stars_in_palace,
            interpretation=interpretation,
            key_points=analysis_points,
        ))

    # Generate overall analyses based on gender and patterns
    overall_fortune = _generate_overall_fortune(matched_patterns, gender)
    career_analysis = _generate_career_analysis(matched_patterns, palaces_data, gender)
    relationship_analysis = _generate_relationship_analysis(matched_patterns, gender)
    health_analysis = _generate_health_analysis(palaces_data)
    wealth_analysis = _generate_wealth_analysis(matched_patterns, gender)

    # Generate recommendations
    recommendations = _generate_recommendations(matched_patterns, combinations_data)

    return AnalysisResult(
        birth_data=birth_data,
        matched_patterns=matched_patterns,
        palace_analyses=palace_analyses,
        overall_fortune=overall_fortune,
        career_analysis=career_analysis,
        relationship_analysis=relationship_analysis,
        health_analysis=health_analysis,
        wealth_analysis=wealth_analysis,
        recommendations=recommendations,
        analysis_method="rule_based",
    )


def _generate_overall_fortune(patterns: List[MatchedPattern], gender: str) -> str:
    """Generate overall fortune summary based on matched patterns."""
    if not patterns:
        return "需要完整命盤資料進行分析。"

    auspicious = [p for p in patterns if p.pattern_type == "吉格"]
    inauspicious = [p for p in patterns if p.pattern_type == "凶格"]

    if len(auspicious) > len(inauspicious):
        fortune = "整體命格偏吉，"
        if auspicious:
            fortune += f"有{auspicious[0].pattern_name}等吉格，主{auspicious[0].meaning}。"
    elif inauspicious:
        fortune = "命格中有需注意之處，"
        fortune += f"有{inauspicious[0].pattern_name}，{inauspicious[0].meaning}。"
    else:
        fortune = "命格平穩，無特別吉凶格局。"

    return fortune


def _generate_career_analysis(
    patterns: List[MatchedPattern],
    palaces_data: Dict[str, Any],
    gender: str
) -> str:
    """Generate career analysis."""
    career_patterns = [
        p for p in patterns
        if any(keyword in (p.effect or "") for keyword in ["武官", "文官", "公務", "事業", "老闆"])
    ]

    if career_patterns:
        analysis = f"事業方面：{career_patterns[0].meaning}"
        if career_patterns[0].effect:
            analysis += f"，{career_patterns[0].effect}。"
        return analysis

    # Default analysis based on gender
    if gender == "男":
        return "事業運需看官祿宮及三方四正星曜配置。官祿宮最喜化權入宮。"
    else:
        return "事業運需看官祿宮，女命亦重福德宮。"


def _generate_relationship_analysis(patterns: List[MatchedPattern], gender: str) -> str:
    """Generate relationship analysis."""
    relationship_patterns = [
        p for p in patterns
        if any(keyword in (p.meaning or "") for keyword in ["婚", "桃花", "夫妻", "配偶"])
    ]

    if relationship_patterns:
        return f"感情方面：{relationship_patterns[0].meaning}。"

    # Default based on gender
    if gender == "男":
        return "婚姻運需看夫妻宮及福德宮配置。"
    else:
        return "女命婚姻最重福德宮，次看夫妻宮。"


def _generate_health_analysis(palaces_data: Dict[str, Any]) -> str:
    """Generate health analysis."""
    palaces = palaces_data.get("十二宮", [])
    jie_palace = next((p for p in palaces if p.get("id") == "jie"), None)

    if jie_palace:
        body_mapping = jie_palace.get("body_mapping", {})
        return "健康方面：需注意疾厄宮所在地支對應的身體部位。" + jie_palace.get("notes", "")

    return "健康方面：需根據疾厄宮星曜配置進行分析。"


def _generate_wealth_analysis(patterns: List[MatchedPattern], gender: str) -> str:
    """Generate wealth analysis."""
    wealth_patterns = [
        p for p in patterns
        if any(keyword in (p.meaning or "") + (p.effect or "") for keyword in ["財", "富", "祿"])
    ]

    if wealth_patterns:
        return f"財運方面：{wealth_patterns[0].meaning}。"

    return "財運需看財帛宮配置，財星(武曲、貪狼、祿存、化祿)入財帛宮為佳。"


def _generate_recommendations(
    patterns: List[MatchedPattern],
    combinations_data: Dict[str, Any]
) -> List[str]:
    """Generate recommendations based on analysis."""
    recommendations: List[str] = []

    # Check for specific patterns and add recommendations
    for pattern in patterns:
        if pattern.pattern_type == "凶格":
            # Look for remedies in combinations data
            remedies = combinations_data.get("破解方法", [])
            for remedy in remedies:
                if any(keyword in pattern.pattern_name for keyword in remedy.get("issue", "").split()):
                    recommendations.extend(remedy.get("remedies", []))

        if "公務" in (pattern.effect or "") or "吏" in (pattern.meaning or ""):
            recommendations.append("適合考取公職或在公家單位任職")

        if "武官" in (pattern.effect or ""):
            recommendations.append("適合軍警或需要領導力的工作")

    # Add general recommendations if none specific
    if not recommendations:
        recommendations = [
            "建議定期檢視命盤流年運勢",
            "重大決定前可參考命盤三方四正",
            "注意命盤中凶星所在宮位對應之事項",
        ]

    # Remove duplicates while preserving order
    seen = set()
    unique_recommendations = []
    for r in recommendations:
        if r not in seen:
            seen.add(r)
            unique_recommendations.append(r)

    return unique_recommendations[:5]  # Limit to 5 recommendations


async def ai_analysis(
    birth_data: BirthDataRequest,
    chart_data: Optional[Dict[str, Any]],
    rule_based_result: AnalysisResult,
    settings: Settings
) -> AnalysisResult:
    """
    Enhance analysis using OpenAI API.

    This function takes the rule-based analysis and enhances it with AI-generated
    insights based on 倪師 teachings.

    Args:
        birth_data: The birth data request
        chart_data: Optional pre-calculated chart data
        rule_based_result: The base rule-based analysis result
        settings: Application settings (contains OpenAI API key)

    Returns:
        Enhanced AnalysisResult with AI insights
    """
    if not settings.openai_api_key:
        # Return rule-based result if no API key
        return rule_based_result

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)

        # Prepare context from rules
        patterns_data = get_patterns_data()
        stars_data = get_stars_data()

        # Build prompt
        system_prompt = """你是一位精通倪海廈老師紫微斗數教學的命理分析師。
請根據提供的命盤資料和已匹配的格局，給出更詳細的分析和建議。
分析應該：
1. 基於倪師的教學原則
2. 結合格局和星曜的相互影響
3. 給出具體、實用的建議
4. 語氣親切但專業"""

        user_prompt = f"""請分析以下命盤資料：

出生資料：
- 年：{birth_data.year}
- 月：{birth_data.month}
- 日：{birth_data.day}
- 時：{birth_data.hour}
- 性別：{birth_data.gender.value}

已匹配格局：
{json.dumps([p.model_dump() for p in rule_based_result.matched_patterns], ensure_ascii=False, indent=2)}

請提供：
1. 整體運勢分析
2. 事業建議
3. 感情建議
4. 健康提醒
5. 財運分析
6. 具體建議事項"""

        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=2000,
        )

        ai_response = response.choices[0].message.content or ""

        # Parse AI response and update result
        # This is a simplified parsing - in production you might want structured output
        enhanced_result = rule_based_result.model_copy()
        enhanced_result.analysis_method = "ai_enhanced"

        # Try to extract sections from AI response
        if "整體" in ai_response:
            enhanced_result.overall_fortune = ai_response.split("事業")[0].strip()
        if "事業" in ai_response:
            career_section = ai_response.split("事業")[1].split("感情")[0] if "感情" in ai_response else ""
            if career_section:
                enhanced_result.career_analysis = career_section.strip()
        if "感情" in ai_response:
            relationship_section = ai_response.split("感情")[1].split("健康")[0] if "健康" in ai_response else ""
            if relationship_section:
                enhanced_result.relationship_analysis = relationship_section.strip()
        if "健康" in ai_response:
            health_section = ai_response.split("健康")[1].split("財運")[0] if "財運" in ai_response else ""
            if health_section:
                enhanced_result.health_analysis = health_section.strip()
        if "財運" in ai_response:
            wealth_section = ai_response.split("財運")[1].split("建議")[0] if "建議" in ai_response else ""
            if wealth_section:
                enhanced_result.wealth_analysis = wealth_section.strip()

        return enhanced_result

    except ImportError:
        # OpenAI not installed
        return rule_based_result
    except Exception as e:
        # Log error and return rule-based result
        print(f"AI analysis error: {e}")
        return rule_based_result


@router.post("/full", response_model=AnalysisResult)
async def full_analysis(
    request: FullAnalysisRequest,
    settings: Settings = Depends(get_settings)
):
    """
    Perform full analysis on birth data.

    This endpoint performs a comprehensive analysis using both rule-based
    interpretation from 倪師 teachings and optional AI enhancement.

    Args:
        request: Full analysis request with birth data and options
        settings: Application settings (injected)

    Returns:
        Complete analysis result
    """
    # First, perform rule-based analysis
    chart_dict = request.chart_data.model_dump() if request.chart_data else None
    result = rule_based_analysis(request.birth_data, chart_dict)

    # If AI analysis requested and API key available
    if request.include_ai and settings.openai_api_key:
        result = await ai_analysis(
            request.birth_data,
            chart_dict,
            result,
            settings
        )

    return result


@router.post("/rule-based", response_model=AnalysisResult)
async def rule_based_endpoint(request: FullAnalysisRequest):
    """
    Perform rule-based analysis only (no AI).

    This endpoint uses only the 倪師 teachings encoded in the rules JSON files.

    Args:
        request: Analysis request with birth data

    Returns:
        Rule-based analysis result
    """
    chart_dict = request.chart_data.model_dump() if request.chart_data else None
    return rule_based_analysis(request.birth_data, chart_dict)
