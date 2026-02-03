"""Chart analysis API - 算命師風格版本"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/chart", tags=["Chart Analysis"])

RULES_DIR = Path(__file__).parent.parent / "rules"


def load_json_file(filename: str) -> Dict[str, Any]:
    file_path = RULES_DIR / filename
    if not file_path.exists():
        return {}
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


# Load all data
STARS_DATA = load_json_file("stars.json")
PALACES_DATA = load_json_file("palaces.json")
PATTERNS_DATA = load_json_file("patterns.json")
COMBINATIONS_DATA = load_json_file("combinations.json")
ANALYSIS_RULES = load_json_file("analysis_rules.json")
DETAILED_INTERP = load_json_file("detailed_interpretations.json")


# Accessor functions
def get_stars_data(): return STARS_DATA
def get_palaces_data(): return PALACES_DATA
def get_patterns_data(): return PATTERNS_DATA
def get_combinations_data(): return COMBINATIONS_DATA


def analyze_patterns(chart_data: Dict[str, Any], gender: str) -> List[Any]:
    from backend.models.schemas import MatchedPattern
    palaces = chart_data.get("palaces", {})
    if isinstance(palaces, list):
        palaces_dict = {}
        for p in palaces:
            if isinstance(p, dict) and "name" in p:
                palaces_dict[p["name"]] = {
                    "branch": p.get("earthlyBranch", p.get("branch", "")),
                    "stem": p.get("heavenlyStem", p.get("stem", "")),
                    "stars": p.get("stars", [])
                }
        palaces = palaces_dict
    raw_patterns = match_patterns(palaces, gender)
    return [MatchedPattern(
        pattern_name=p.get("name", ""),
        pattern_type=p.get("type", ""),
        meaning=p.get("meaning", ""),
        effect=p.get("effect", "")
    ) for p in raw_patterns]


def get_star_info(star_name: str) -> Optional[Dict[str, Any]]:
    base_name = star_name.rstrip("廟旺陷平得利")
    for category in ["北斗星", "南斗星", "六煞星", "輔星", "四化星"]:
        for star in STARS_DATA.get(category, []):
            if star.get("name") == base_name:
                return star
    return None


def get_stars_in_palace(palace_data: Dict[str, Any]) -> List[str]:
    stars = palace_data.get("stars", [])
    return [s.get("name", s) if isinstance(s, dict) else str(s) for s in stars]


def get_sihua_positions(palaces: Dict) -> Dict[str, str]:
    sihua = {"化祿": None, "化權": None, "化科": None, "化忌": None}
    for palace_name, palace_data in palaces.items():
        for star in palace_data.get("stars", []):
            if isinstance(star, dict):
                name = star.get("name", "")
                mutagen = star.get("mutagen", "")
                if name in sihua:
                    sihua[name] = palace_name
                if mutagen in sihua:
                    sihua[mutagen] = palace_name
            elif str(star) in sihua:
                sihua[str(star)] = palace_name
    return sihua


def has_star(palaces: Dict, palace_name: str, star_name: str) -> bool:
    palace = palaces.get(palace_name, {})
    stars = get_stars_in_palace(palace)
    return any(star_name in s for s in stars)


# ============ 算命師風格分析 ============

def generate_personality_reading(palaces: Dict, gender: str) -> List[str]:
    """生成個性與命格分析"""
    readings = []
    ming_gong = palaces.get("命宮", {})
    ming_stars = get_stars_in_palace(ming_gong)

    # 找出主星
    main_stars = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞",
                  "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"]

    for star in ming_stars:
        base_star = star.rstrip("廟旺陷平得利")
        if base_star in main_stars:
            interp = DETAILED_INTERP.get("命宮主星詳解", {}).get(base_star, {})

            if interp.get("基本性格"):
                readings.append(f"【命宮主星{base_star}】{interp['基本性格']}")

            # 檢查是否有輔弼
            if base_star == "紫微":
                has_zuofu = any("左輔" in s for s in ming_stars)
                has_youbi = any("右弼" in s for s in ming_stars)
                if has_zuofu and has_youbi:
                    readings.append(f"【大貴之格】{interp.get('有輔弼', '')}")
                elif not has_zuofu and not has_youbi:
                    readings.append(f"【注意】{interp.get('無輔弼', '')}")

            # 性別差異
            if gender == "男" and interp.get("男命"):
                readings.append(f"【男命特點】{interp['男命']}")
            elif gender == "女" and interp.get("女命"):
                readings.append(f"【女命特點】{interp['女命']}")

            # 廟旺陷
            if "廟" in star and interp.get("入廟"):
                readings.append(f"【入廟吉象】{interp['入廟']}")
            elif "陷" in star and interp.get("落陷"):
                readings.append(f"【落陷提醒】{interp['落陷']}")

            break  # 只取第一個主星

    return readings


def generate_career_reading(palaces: Dict, gender: str, sihua: Dict) -> List[str]:
    """生成事業分析"""
    readings = []
    ming_gong = palaces.get("命宮", {})
    guan_gong = palaces.get("官祿宮", {})
    ming_stars = get_stars_in_palace(ming_gong)
    guan_stars = get_stars_in_palace(guan_gong)

    # 從命宮主星判斷適合職業
    main_stars = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞",
                  "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"]

    for star in ming_stars:
        base_star = star.rstrip("廟旺陷平得利")
        if base_star in main_stars:
            interp = DETAILED_INTERP.get("命宮主星詳解", {}).get(base_star, {})
            if interp.get("適合職業"):
                readings.append(f"【適合職業】{interp['適合職業']}")
            break

    # 四化影響
    sihua_interp = DETAILED_INTERP.get("四化深入解讀", {})

    if sihua.get("化權") == "官祿宮":
        readings.append(f"【事業大吉】{sihua_interp.get('化權', {}).get('官祿宮', '')}")
    if sihua.get("化科") == "官祿宮":
        readings.append(f"【適合專業】{sihua_interp.get('化科', {}).get('官祿宮', '')}")
    if sihua.get("化祿") == "官祿宮":
        readings.append(f"【事業順遂】{sihua_interp.get('化祿', {}).get('官祿宮', '')}")
    if sihua.get("化忌") == "官祿宮":
        readings.append(f"【事業提醒】{sihua_interp.get('化忌', {}).get('官祿宮', '')}")

    # 老闆命判斷
    cai_stars = get_stars_in_palace(palaces.get("財帛宮", {}))
    if sihua.get("化權") == "財帛宮" or ("化權" in cai_stars and "祿存" in cai_stars):
        readings.append("【老闆命】化權祿存在財帛宮相逢，你一定會自己當老闆！不適合幫人打工，創業才能發揮你的能力。")

    # 機月同梁格
    all_stars = []
    for p in ["命宮", "財帛宮", "官祿宮", "遷移宮"]:
        all_stars.extend(get_stars_in_palace(palaces.get(p, {})))
    jyts = ["天機", "太陰", "天同", "天梁"]
    if sum(1 for s in jyts if any(s in star for star in all_stars)) >= 3:
        readings.append("【機月同梁格】命宮三方四正有天機、太陰、天同、天梁，這是「吏格」！你非常適合當公務員，考公職會很順利。")

    if not readings:
        readings.append("【事業運】需要綜合命宮和官祿宮的星曜來判斷，建議多方嘗試找到適合自己的方向。")

    return readings


def generate_wealth_reading(palaces: Dict, gender: str, sihua: Dict) -> List[str]:
    """生成財運分析"""
    readings = []
    cai_gong = palaces.get("財帛宮", {})
    cai_stars = get_stars_in_palace(cai_gong)
    ming_stars = get_stars_in_palace(palaces.get("命宮", {}))

    # 命宮主星的財運特點
    main_stars = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞",
                  "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"]

    for star in ming_stars:
        base_star = star.rstrip("廟旺陷平得利")
        if base_star in main_stars:
            interp = DETAILED_INTERP.get("命宮主星詳解", {}).get(base_star, {})
            if interp.get("財運特點"):
                readings.append(f"【財運特質】{interp['財運特點']}")
            break

    # 四化影響
    sihua_interp = DETAILED_INTERP.get("四化深入解讀", {})
    if sihua.get("化祿") == "財帛宮":
        readings.append(f"【財運大吉】{sihua_interp.get('化祿', {}).get('財帛宮', '')}")
    if sihua.get("化忌") == "財帛宮":
        readings.append(f"【財運提醒】{sihua_interp.get('化忌', {}).get('財帛宮', '')}")

    # 發財組合
    wealth_interp = DETAILED_INTERP.get("發財組合詳解", {})

    # 祿馬交馳
    if "祿存" in cai_stars and "天馬" in cai_stars:
        readings.append(f"【祿馬交馳】{wealth_interp.get('祿馬交馳', '')}")
    if "化祿" in cai_stars and "天馬" in cai_stars:
        readings.append(f"【化祿天馬】{wealth_interp.get('化祿天馬', '')}")

    # 火貪格
    all_stars = []
    for p_name, p_data in palaces.items():
        all_stars.extend(get_stars_in_palace(p_data))
    if any("貪狼" in s for s in all_stars) and any("火星" in s for s in all_stars):
        readings.append(f"【火貪格】{wealth_interp.get('火貪格', '')}")

    # 財星入財帛
    cai_xing = ["武曲", "貪狼", "祿存", "化祿"]
    if any(any(c in s for s in cai_stars) for c in cai_xing):
        readings.append(f"【財星入位】{wealth_interp.get('財星入財帛', '')}")

    if not readings:
        readings.append("【財運】你的財運屬於中等，需要靠自己努力賺取。不要期待天上掉下來的財富，腳踏實地最重要。")

    return readings


def generate_relationship_reading(palaces: Dict, gender: str, sihua: Dict) -> List[str]:
    """生成感情婚姻分析"""
    readings = []
    marriage_interp = DETAILED_INTERP.get("婚姻詳解", {})

    # 性別差異
    if gender == "男":
        readings.append(f"【看盤重點】{marriage_interp.get('男命看盤', '')}")
        primary_palace = "夫妻宮"
    else:
        readings.append(f"【看盤重點】{marriage_interp.get('女命看盤', '')}")
        primary_palace = "福德宮"

    primary_stars = get_stars_in_palace(palaces.get(primary_palace, {}))
    fuqi_stars = get_stars_in_palace(palaces.get("夫妻宮", {}))

    # 命宮主星的感情提醒
    ming_stars = get_stars_in_palace(palaces.get("命宮", {}))
    main_stars = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞",
                  "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"]

    for star in ming_stars:
        base_star = star.rstrip("廟旺陷平得利")
        if base_star in main_stars:
            interp = DETAILED_INTERP.get("命宮主星詳解", {}).get(base_star, {})
            if interp.get("感情提醒"):
                readings.append(f"【感情性格】{interp['感情提醒']}")
            break

    # 左輔右弼單守
    if ("左輔" in fuqi_stars and "右弼" not in fuqi_stars) or \
       ("右弼" in fuqi_stars and "左輔" not in fuqi_stars):
        readings.append(f"【二婚之象】{marriage_interp.get('左輔右弼單守', '')}")

    # 破軍
    if any("破軍" in s for s in fuqi_stars) or any("破軍" in s for s in primary_stars):
        readings.append(f"【婚姻波折】{marriage_interp.get('破軍入夫妻', '')}")

    # 桃花星
    taohua = ["紅鸞", "天喜", "貪狼", "廉貞"]
    if any(any(t in s for s in fuqi_stars) for t in taohua):
        readings.append(f"【桃花運旺】{marriage_interp.get('桃花星入夫妻', '')}")

    # 紅鸞入命
    if gender == "男" and any("紅鸞" in s for s in ming_stars):
        readings.append("【招美妻】紅鸞入命，男命必招美妻！你的另一半長相會很出眾。")

    # 化忌
    if sihua.get("化忌") == "夫妻宮":
        readings.append("【感情提醒】化忌入夫妻宮，感情路會比較辛苦。但只要用心經營，還是可以有幸福的婚姻。")

    # 破解方法
    if any("二婚" in r or "波折" in r for r in readings):
        readings.append(f"【化解方法】{marriage_interp.get('破解方法', '')}")

    if not readings:
        readings.append("【感情運】你的感情運屬於正常，只要用心經營就會有好結果。")

    return readings


def generate_health_reading(palaces: Dict, gender: str) -> List[str]:
    """生成健康分析"""
    readings = []
    jie_gong = palaces.get("疾厄宮", {})
    jie_branch = jie_gong.get("branch", "")
    jie_stars = get_stars_in_palace(jie_gong)

    # 地支對應臟腑
    body_mapping = {
        "子": "膽經、頭部", "丑": "肝臟、小腿",
        "寅": "肺部、右腳", "卯": "大腸、手指",
        "辰": "胃部、肩膀", "巳": "脾臟、面部",
        "午": "心臟、眼睛", "未": "小腸、唇舌",
        "申": "膀胱、筋骨", "酉": "腎臟、牙齒",
        "戌": "心包、下肢", "亥": "三焦、足踝"
    }

    if jie_branch in body_mapping:
        organ = body_mapping[jie_branch]
        readings.append(f"【身體弱點】疾厄宮在{jie_branch}宮，對應{organ}。這些部位是你的弱點，平時要特別注意保養。")

    # 煞星
    sha_xing = ["擎羊", "陀羅", "火星", "鈴星", "天空", "地劫"]
    sha_in_jie = [s for s in jie_stars if any(sha in s for sha in sha_xing)]
    if sha_in_jie:
        readings.append(f"【健康警示】疾厄宮有煞星（{', '.join(sha_in_jie)}），健康方面要多注意。建議定期體檢，不要輕忽小毛病。")

    # 危險組合
    danger_interp = DETAILED_INTERP.get("危險組合詳解", {})
    if any("廉貞" in s for s in jie_stars) and any("七殺" in s for s in jie_stars):
        readings.append(f"【特別注意】{danger_interp.get('廉貞七殺', '')}")

    if not readings:
        readings.append("【健康運】你的整體健康運還不錯，但還是要注意作息正常、飲食均衡。預防勝於治療！")

    return readings


def generate_warnings(palaces: Dict, gender: str, sihua: Dict) -> List[str]:
    """生成需要注意的事項"""
    warnings = []
    danger_interp = DETAILED_INTERP.get("危險組合詳解", {})

    # 化忌沖命
    if sihua.get("化忌") == "遷移宮":
        warnings.append(f"【大凶之象】{danger_interp.get('化忌沖命', '')}")

    # 檢查危險組合
    for palace_name, palace_data in palaces.items():
        stars = get_stars_in_palace(palace_data)

        if any("廉貞" in s for s in stars) and any("七殺" in s for s in stars):
            warnings.append(f"【廉貞七殺同宮於{palace_name}】{danger_interp.get('廉貞七殺', '')}")

        if any("廉貞" in s for s in stars) and any("破軍" in s for s in stars):
            warnings.append(f"【廉貞破軍同宮於{palace_name}】{danger_interp.get('廉貞破軍', '')}")

        if any("廉貞" in s and "陷" in s for s in stars) and any("貪狼" in s and "陷" in s for s in stars):
            warnings.append(f"【廉貞貪狼落陷於{palace_name}】{danger_interp.get('廉貞貪狼落陷', '')}")

    return warnings


def generate_recommendations(readings: Dict[str, List[str]], sihua: Dict) -> List[str]:
    """生成具體建議"""
    recs = []

    # 根據四化位置給建議
    if sihua.get("化祿") == "財帛宮":
        recs.append("把握財運機會，該投資的時候不要猶豫。")
    if sihua.get("化權") == "官祿宮":
        recs.append("積極爭取升遷或創業機會，你有領導的天命。")
    if sihua.get("化忌") == "夫妻宮":
        recs.append("感情上多包容、多溝通，不要太計較小事。")
    if sihua.get("化忌") == "財帛宮":
        recs.append("理財要保守，不要亂投資或借錢給別人。")

    # 通用建議
    if not recs:
        recs = [
            "多行善事，積德可以改運。",
            "遇到困難不要灰心，堅持就會有轉機。",
            "重大決定前可以再看一下流年運勢。"
        ]

    return recs


def generate_origin_palace_reading(palaces: Dict, origin_palace: Optional[Dict], sihua: Dict) -> List[str]:
    """生成來因宮分析"""
    readings = []

    if not origin_palace:
        return readings

    palace_name = origin_palace.get("palace", "")
    branch = origin_palace.get("branch", "")

    if not palace_name:
        return readings

    # 來因宮基本解讀
    origin_meanings = {
        "命宮": "來因在命宮，表示此生投胎是為了完成自我修行與成長，一切從自己開始，自己的態度決定命運。",
        "兄弟宮": "來因在兄弟宮，表示此生與兄弟姊妹、朋友有重要因緣，合夥事業或手足關係是人生重點。",
        "夫妻宮": "來因在夫妻宮，表示此生婚姻是命運的關鍵，另一半會深刻影響你的人生走向。",
        "子女宮": "來因在子女宮，表示此生與子女有深厚緣分，子女運及投資運是人生重點。",
        "財帛宮": "來因在財帛宮，表示此生與財富有特殊緣分，理財能力是人生課題。",
        "疾厄宮": "來因在疾厄宮，表示此生需要注意健康，身體是革命的本錢，養生很重要。",
        "遷移宮": "來因在遷移宮，表示此生適合外出發展，出外有貴人，離鄉背井反而有好運。",
        "交友宮": "來因在交友宮，表示此生人際關係是命運關鍵，朋友、部屬、合作夥伴影響深遠。",
        "官祿宮": "來因在官祿宮，表示此生事業運是人生重點，工作成就會帶來最大的滿足感。",
        "田宅宮": "來因在田宅宮，表示此生與不動產有緣，置產、家庭環境是人生重點。",
        "福德宮": "來因在福德宮，表示此生福報深厚，精神生活和內心修養是人生課題。",
        "父母宮": "來因在父母宮，表示此生與父母、長輩有重要因緣，孝順父母會帶來好運。",
    }

    if palace_name in origin_meanings:
        readings.append(f"【來因宮在{palace_name}】{origin_meanings[palace_name]}")

    # 檢查來因宮的四化
    origin_palace_data = palaces.get(palace_name, {})
    origin_stars = get_stars_in_palace(origin_palace_data)

    # 來因宮有化祿
    if any("化祿" in s for s in origin_stars) or sihua.get("化祿") == palace_name:
        readings.append(f"【來因宮化祿】來因宮見化祿，表示此生來享福的，基礎運勢不錯，起步比別人順利。")

    # 來因宮有化忌
    if any("化忌" in s for s in origin_stars) or sihua.get("化忌") == palace_name:
        readings.append(f"【來因宮化忌】來因宮見化忌，表示此生來還債的，在{palace_name}相關領域會比較辛苦，但也是修行的機會。")

    # 來因宮有化權
    if any("化權" in s for s in origin_stars) or sihua.get("化權") == palace_name:
        readings.append(f"【來因宮化權】來因宮見化權，表示此生來掌權的，在{palace_name}相關領域會有主導地位。")

    # 來因宮有化科
    if any("化科" in s for s in origin_stars) or sihua.get("化科") == palace_name:
        readings.append(f"【來因宮化科】來因宮見化科，表示此生來成名的，在{palace_name}相關領域會有好名聲。")

    return readings


# ============ API Models ============

class ReadingItem(BaseModel):
    category: str
    content: str


class ChartAnalysisResult(BaseModel):
    origin_palace_reading: List[str] = []
    personality: List[str]
    career: List[str]
    wealth: List[str]
    relationship: List[str]
    health: List[str]
    warnings: List[str]
    recommendations: List[str]
    # Legacy fields for compatibility
    palace_analyses: List[Dict[str, Any]] = []
    matched_patterns: List[Dict[str, Any]] = []
    overall_summary: str = ""
    career_analysis: str = ""
    wealth_analysis: str = ""
    relationship_analysis: str = ""
    health_analysis: str = ""


class OriginPalaceInfo(BaseModel):
    branch: str
    palace: str


class AnalyzeRequest(BaseModel):
    palaces: Dict[str, Dict[str, Any]]
    gender: str = "男"
    origin_palace: Optional[OriginPalaceInfo] = None


def match_patterns(palaces: Dict, gender: str) -> List[Dict]:
    matched = []
    ming_gong = palaces.get("命宮", {})
    ming_branch = ming_gong.get("branch", "")
    ming_stars = get_stars_in_palace(ming_gong)

    for pattern_type in ["吉格", "凶格", "特殊格局"]:
        for pattern in PATTERNS_DATA.get(pattern_type, []):
            conditions = pattern.get("conditions", {})
            if "命宮" in conditions:
                cond = conditions["命宮"]
                if isinstance(cond, dict):
                    required_branch = cond.get("branch")
                    required_stars = cond.get("stars", [])
                    branch_match = not required_branch or (
                        ming_branch == required_branch if isinstance(required_branch, str)
                        else ming_branch in required_branch
                    )
                    stars_match = all(
                        any(req.rstrip("廟旺陷") in star for star in ming_stars)
                        for req in required_stars
                    ) if required_stars else False
                    if branch_match and stars_match:
                        effect = pattern.get("effect", "")
                        gender_effect = pattern.get("gender_effect", {})
                        if gender_effect and gender in gender_effect:
                            effect = gender_effect[gender]
                        matched.append({
                            "name": pattern["name"],
                            "type": pattern_type,
                            "meaning": pattern.get("meaning", ""),
                            "effect": effect
                        })
    return matched


@router.post("/analyze", response_model=ChartAnalysisResult)
async def analyze_chart(request: AnalyzeRequest):
    """算命師風格的命盤分析"""
    palaces = request.palaces
    gender = request.gender
    origin_palace = request.origin_palace

    # 獲取四化位置
    sihua = get_sihua_positions(palaces)

    # 來因宮分析
    origin_palace_dict = {"branch": origin_palace.branch, "palace": origin_palace.palace} if origin_palace else None
    origin_palace_reading = generate_origin_palace_reading(palaces, origin_palace_dict, sihua)

    # 生成各部分分析
    personality = generate_personality_reading(palaces, gender)
    career = generate_career_reading(palaces, gender, sihua)
    wealth = generate_wealth_reading(palaces, gender, sihua)
    relationship = generate_relationship_reading(palaces, gender, sihua)
    health = generate_health_reading(palaces, gender)
    warnings = generate_warnings(palaces, gender, sihua)
    recommendations = generate_recommendations({
        "personality": personality,
        "career": career,
        "wealth": wealth,
        "relationship": relationship
    }, sihua)

    # 格局匹配
    matched_patterns = match_patterns(palaces, gender)

    # Legacy summary
    overall_summary = " ".join(personality[:2]) if personality else ""

    return ChartAnalysisResult(
        origin_palace_reading=origin_palace_reading,
        personality=personality,
        career=career,
        wealth=wealth,
        relationship=relationship,
        health=health,
        warnings=warnings,
        recommendations=recommendations,
        palace_analyses=[],
        matched_patterns=matched_patterns,
        overall_summary=overall_summary,
        career_analysis=" ".join(career),
        wealth_analysis=" ".join(wealth),
        relationship_analysis=" ".join(relationship),
        health_analysis=" ".join(health)
    )


# Existing endpoints
@router.get("/stars")
async def get_stars():
    return STARS_DATA

@router.get("/palaces")
async def get_palaces():
    return PALACES_DATA

@router.get("/patterns")
async def get_patterns():
    return PATTERNS_DATA

@router.get("/combinations")
async def get_combinations():
    return COMBINATIONS_DATA

@router.get("/analysis-rules")
async def get_analysis_rules():
    return ANALYSIS_RULES
