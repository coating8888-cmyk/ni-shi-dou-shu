"""AI-powered chart reading using Claude API with 倪師 teachings."""

import os
from pathlib import Path
from typing import Dict, List, Any, Optional
import json
import re
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from backend.config import Settings, get_settings

router = APIRouter(prefix="/chart", tags=["AI Reading"])

KNOWLEDGE_DIR = Path(__file__).parent.parent.parent / "knowledge" / "processed" / "extracted"


class DecadalFortune(BaseModel):
    index: int
    heavenlyStem: str
    earthlyBranch: str
    palaceName: str
    startAge: int
    endAge: int


class YearlyFortune(BaseModel):
    year: int
    heavenlyStem: str
    earthlyBranch: str
    palaceName: str
    age: int


class AIReadingRequest(BaseModel):
    """Request for AI-powered reading."""
    palaces: Dict[str, Dict[str, Any]]
    gender: str = "男"
    age: int = 30
    origin_palace: Optional[Dict[str, str]] = None
    current_decadal: Optional[DecadalFortune] = None
    current_yearly: Optional[YearlyFortune] = None
    five_elements_class: str = ""
    soul_star: str = ""
    body_star: str = ""


class AIReadingResponse(BaseModel):
    """AI reading response with all sections (Plan B - one API call for all)."""
    success: bool
    error: Optional[str] = None
    # 各區塊分析（倪師版）
    overall_reading: str = ""        # 命主總批
    palace_readings: Dict[str, str] = {}  # 十二宮分析 {"命宮": "...", "夫妻宮": "..."}
    best_parts: str = ""             # 整張盤最好的地方
    caution_parts: str = ""          # 整張盤最需要注意的地方
    origin_palace_reading: str = ""  # 來因宮解析
    body_palace_reading: str = ""    # 身宮解析
    sihua_reading: str = ""          # 四化解析
    decadal_reading: str = ""        # 大限解析
    yearly_reading: str = ""         # 流年解析
    career_reading: str = ""         # 適合工作類型
    relationship_reading: str = ""   # 感情婚姻
    health_reading: str = ""         # 健康分析
    recommendations: str = ""        # 人生升級心法


RULES_DIR = Path(__file__).parent.parent / "rules"


def load_knowledge_base() -> str:
    """Load the 倪師 teachings for context."""
    knowledge_texts = []

    # 載入規則檔案（優先）
    rule_files = [
        "ni_shi_principles.json",      # 倪師核心原則
        "palace_analysis_criteria.json", # 十二宮分析要點
        "huaji_rules.json",            # 化忌規則
        "case_studies.json",           # 批命案例
    ]

    for filename in rule_files:
        file_path = RULES_DIR / filename
        if file_path.exists():
            try:
                content = file_path.read_text(encoding='utf-8')
                knowledge_texts.append(f"=== {filename} ===\n{content}\n")
            except Exception as e:
                print(f"Error loading {filename}: {e}")

    # Priority files for 紫微斗數 transcript
    priority_files = [
        "【听课笔记】天-天机（可打印）.txt",
        "text_天机道听课笔记.txt",
    ]

    for filename in priority_files:
        file_path = KNOWLEDGE_DIR / filename
        if file_path.exists():
            try:
                content = file_path.read_text(encoding='utf-8')
                # Limit content size to avoid token limits
                if len(content) > 15000:
                    content = content[:15000] + "\n...(內容截斷)"
                knowledge_texts.append(f"=== {filename} ===\n{content}\n")
            except Exception as e:
                print(f"Error loading {filename}: {e}")

    return "\n".join(knowledge_texts) if knowledge_texts else ""


def format_chart_data(request: AIReadingRequest) -> str:
    """Format chart data for the AI prompt."""
    lines = []
    lines.append(f"性別：{request.gender}")
    lines.append(f"年齡：{request.age}歲（虛歲）")
    lines.append(f"五行局：{request.five_elements_class}")
    lines.append(f"命主星：{request.soul_star}")
    lines.append(f"身主星：{request.body_star}")

    if request.origin_palace:
        lines.append(f"來因宮：{request.origin_palace.get('palace', '')}（{request.origin_palace.get('branch', '')}）")

    if request.current_decadal:
        lines.append(f"目前大限：第{request.current_decadal.index}大限（{request.current_decadal.startAge}-{request.current_decadal.endAge}歲），走{request.current_decadal.palaceName}")

    if request.current_yearly:
        lines.append(f"今年流年：{request.current_yearly.year}年，走{request.current_yearly.palaceName}")

    lines.append("\n【十二宮配置】")
    for palace_name, palace_data in request.palaces.items():
        stars = palace_data.get("stars", [])
        star_names = []
        for star in stars:
            if isinstance(star, dict):
                name = star.get("name", "")
                brightness = star.get("brightness", "")
                mutagen = star.get("mutagen", "")
                star_str = name
                if brightness:
                    star_str += f"({brightness})"
                if mutagen:
                    star_str += f"化{mutagen}"
                star_names.append(star_str)
            else:
                star_names.append(str(star))

        branch = palace_data.get("branch", "")
        stem = palace_data.get("stem", "")
        lines.append(f"{palace_name}（{stem}{branch}）：{', '.join(star_names) if star_names else '無主星'}")

    return "\n".join(lines)


def build_system_prompt(knowledge: str) -> str:
    """Build the system prompt with 倪師 teachings."""
    return f"""你是紫微斗數專家，完全遵循倪海廈老師的教學體系。

## 你的風格
- 專業、幽默、易懂
- 直接給答案，不要繞圈子
- 說人話，不要文謅謅
- 適度幽默但不油腔滑調
- 不要過度情緒化（少用「哇」「真的很棒」「太厲害了」這類詞）
- 該說好就說好，該說要注意就直說，不用包裝太多

## 倪師核心原則（必須遵守）
1. 【三方四正】看任何一宮必須同時看三方四正，不可單獨看一宮
2. 【命好不如限好】大運比本命重要，限好比命好還佳
3. 【吉處藏凶必凶】看到都是吉星時，裡面有一顆煞星落陷，必凶
4. 【凶處藏吉平安】看到都是煞星但都入廟，有一顆吉星入廟，平安
5. 【六煞獨守】陀羅擎羊火鈴空劫，六煞星一星獨守時皆為凶災
6. 【化忌對沖最凶】化忌在本宮力量弱，對沖力量最大（半空折翅）
7. 【女命先看福德】女命看盤先看福德宮再看夫妻宮，福德代表一生福祿和先生
8. 【天府不能解厄】天府星不能解厄制化，除非逢三台八座
9. 【宮有宮性】流年落入哪個宮，該宮的性質就會發動
10.【人地勝天】命占三分之一、陽宅三分之一、人事三分之一，人+地可以化解天

## 倪師教學資料
{knowledge[:25000] if knowledge else "（講義載入中）"}

## 批命方法（倪師版）
1. 先定命宮的三方四正（命、財帛、官祿、遷移）
2. 看本命（指點迷津，批終生）
3. 再批流年（看十年大運、小流年）
4. 結合年齡和目前大限來具體分析
5. 給具體可執行的建議，不要空話"""


def build_user_prompt(chart_data: str) -> str:
    """Build the user prompt with chart data - returns JSON for all sections."""
    return f"""分析這個命盤，直接給結論和建議。

{chart_data}

請以 JSON 格式回傳，每個欄位都要填：

```json
{{
  "overall_reading": "【命主總批】（200-300字）：1.命格特點與人生主軸 2.主星組合代表什麼性格 3.這輩子的大方向建議（根據倪師教學：先看三方四正，命好不如限好）",
  "palace_readings": {{
    "命宮": "（100字）：主星特質、亮度影響、三方四正會的星、有四化要說明，從個性可看出成敗",
    "兄弟宮": "（80字）：兄弟姐妹數量和關係、合夥吉凶、化忌三種解釋",
    "夫妻宮": "（100字）：配偶特質、婚姻狀況、必須同時看福德宮",
    "子女宮": "（80字）：子女緣、有無子女、化忌代表無子",
    "財帛宮": "（100字）：先天財還是後天財、正財還是橫財、適合做生意還是領薪水",
    "疾厄宮": "（100字）：煞星在哪個地支決定哪個器官有病（子膽丑肝寅肺卯腸辰胃巳脾午心未小腸申膀胱酉腎戌心包亥三焦）",
    "遷移宮": "（80字）：適合本地還是外地發展、外地貴人運",
    "交友宮": "（80字）：能否合夥、朋友是貴人還是小人、化忌代表合夥必敗",
    "官祿宮": "（100字）：文官還是武官、官帶星大小決定官位高低、適合創業還是上班",
    "田宅宮": "（80字）：祖業、不動產運、居家安全、化忌破祖業",
    "福德宮": "（100字）：一生福報、女命最重要（代表先生和福祿）、化忌一世不順",
    "父母宮": "（80字）：與父母關係、祖上庇蔭、化祿代表祖上有產業"
  }},
  "best_parts": "【整張盤最好的地方】（150字）：1.哪些宮位星曜組合最佳 2.科權祿會在哪裡 3.最大的先天優勢是什麼 4.如何善用這些優勢",
  "caution_parts": "【整張盤最需要注意的地方】（150字）：1.化忌在哪裡、代表什麼功課 2.煞星落陷在哪裡 3.吉處藏凶的地方 4.如何預防或化解",
  "origin_palace_reading": "【來因宮解析】（100字）：1.來因宮在哪個宮位 2.此生投胎的原因和課題 3.如何修練",
  "body_palace_reading": "【身宮解析】（100字）：1.身宮在哪個宮位 2.後天努力方向（財帛=私企、官祿=公職、遷移=外地）3.七殺臨身最忌",
  "sihua_reading": "【四化解析】（200字）：1.化祿在哪宮、福氣來源 2.化權在哪宮、權力來源 3.化科在哪宮、貴人來源 4.化忌在哪宮、功課和化解方法（化忌對沖比本宮還凶）",
  "decadal_reading": "【大限解析】（300字）：1.目前第幾大限、在哪個宮位 2.大限三方四正的星曜組合 3.這十年運勢走向 4.事業財運感情健康分析 5.最需要把握的機會 6.最需要避開的風險 7.具體行動建議",
  "yearly_reading": "【流年解析】（200字）：1.今年流年在哪個宮位（宮有宮性，落入財帛阻力在財、落入遷移驛馬動）2.流年星曜組合 3.事業財運感情健康 4.關鍵月份 5.今年該做和該避免的事",
  "career_reading": "【適合工作類型】（200字）：1.根據命宮和官祿宮判斷適合的職業方向 2.適合創業還是上班 3.具體行業推薦（至少5個）4.要避免的職業",
  "relationship_reading": "【感情婚姻】（200字）：1.感情模式 2.適合的對象類型 3.何時容易遇到（大限流年）4.婚前婚後建議 5.女命要特別看福德宮",
  "health_reading": "【健康分析】（150字）：1.疾厄宮煞星在哪個地支對應哪個器官 2.需要注意的疾病 3.養生建議",
  "recommendations": "【人生升級心法】（250字）：1.這輩子最重要的功課 2.性格調整建議 3.人際財務事業感情健康各面向的具體建議（列出5-8點可執行的建議）4.參考倪師：命占三分之一、陽宅三分之一、人事三分之一，人+地大於天"
}}
```

分析原則（倪師版）：
1. 看任何一宮必須同時看三方四正
2. 命好不如限好，限好比命好還佳
3. 男命看夫妻宮，女命先看福德宮
4. 化忌對沖比在本宮還凶
5. 宮有宮性，流年落入哪個宮就論哪個事
6. 煞星落陷是吉處藏凶
7. 六煞星一星獨守皆為凶災
8. 只回傳 JSON"""


@router.post("/ai-reading", response_model=AIReadingResponse)
async def get_ai_reading(
    request: AIReadingRequest,
    settings: Settings = Depends(get_settings)
):
    """Get AI-powered chart reading using Claude."""

    # Check if Anthropic API key is available
    api_key = settings.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY", "")

    if not api_key:
        return AIReadingResponse(
            overall_reading="",
            success=False,
            error="未設定 Anthropic API Key。請在 .env 檔案中設定 ANTHROPIC_API_KEY。"
        )

    try:
        import anthropic

        # Load knowledge base
        knowledge = load_knowledge_base()

        # Format chart data
        chart_data = format_chart_data(request)

        # Build prompts
        system_prompt = build_system_prompt(knowledge)
        user_prompt = build_user_prompt(chart_data)

        # Call Claude API
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=8000,  # 增加 token 上限以容納詳細分析
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )

        # Extract response
        response_text = message.content[0].text if message.content else ""

        # 解析 JSON 回應
        try:
            # 嘗試提取 JSON（可能被包在 ```json ``` 中）
            json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
            if json_match:
                json_str = json_match.group(1)
            else:
                # 直接嘗試解析整個回應
                json_str = response_text

            parsed = json.loads(json_str)

            # 處理欄位可能是 list 的情況，轉換為 string
            def ensure_string(value) -> str:
                if isinstance(value, list):
                    return "\n".join(str(item) for item in value)
                return str(value) if value else ""

            return AIReadingResponse(
                success=True,
                overall_reading=ensure_string(parsed.get("overall_reading", "")),
                palace_readings=parsed.get("palace_readings", {}),
                best_parts=ensure_string(parsed.get("best_parts", "")),
                caution_parts=ensure_string(parsed.get("caution_parts", "")),
                origin_palace_reading=ensure_string(parsed.get("origin_palace_reading", "")),
                body_palace_reading=ensure_string(parsed.get("body_palace_reading", "")),
                sihua_reading=ensure_string(parsed.get("sihua_reading", "")),
                decadal_reading=ensure_string(parsed.get("decadal_reading", "")),
                yearly_reading=ensure_string(parsed.get("yearly_reading", "")),
                career_reading=ensure_string(parsed.get("career_reading", "")),
                relationship_reading=ensure_string(parsed.get("relationship_reading", "")),
                health_reading=ensure_string(parsed.get("health_reading", "")),
                recommendations=ensure_string(parsed.get("recommendations", "")),
            )

        except json.JSONDecodeError:
            # JSON 解析失敗，回傳原始文字到 overall_reading
            return AIReadingResponse(
                success=True,
                overall_reading=response_text,
            )

    except ImportError:
        return AIReadingResponse(
            overall_reading="",
            success=False,
            error="未安裝 anthropic 套件。請執行 pip install anthropic"
        )
    except Exception as e:
        return AIReadingResponse(
            overall_reading="",
            success=False,
            error=f"AI 分析時發生錯誤：{str(e)}"
        )


@router.get("/ai-status")
async def check_ai_status(settings: Settings = Depends(get_settings)):
    """Check if AI reading is available."""
    api_key = settings.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY", "")
    knowledge_available = KNOWLEDGE_DIR.exists() and any(KNOWLEDGE_DIR.iterdir())

    return {
        "ai_available": bool(api_key),
        "knowledge_available": knowledge_available,
        "knowledge_path": str(KNOWLEDGE_DIR),
    }
