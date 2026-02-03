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
    # 各區塊分析
    overall_reading: str = ""        # 總盤解析
    palace_readings: Dict[str, str] = {}  # 各宮位解析 {"命宮": "...", "夫妻宮": "..."}
    origin_palace_reading: str = ""  # 來因宮解析
    body_palace_reading: str = ""    # 身宮解析
    sihua_reading: str = ""          # 四化解析
    decadal_reading: str = ""        # 大限解析
    yearly_reading: str = ""         # 流年解析
    career_reading: str = ""         # 適合工作類型
    relationship_reading: str = ""   # 感情婚姻
    health_reading: str = ""         # 健康分析
    recommendations: str = ""        # 修練心法與建議


def load_knowledge_base() -> str:
    """Load the 倪師 teachings for context."""
    knowledge_texts = []

    # Priority files for 紫微斗數
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
                if len(content) > 30000:
                    content = content[:30000] + "\n...(內容截斷)"
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
    return f"""你是紫微斗數專家，熟讀倪海廈老師的教學。

## 你的風格
- 專業、幽默、易懂
- 直接給答案，不要繞圈子
- 說人話，不要文謅謅
- 適度幽默但不油腔滑調
- 不要過度情緒化（少用「哇」「真的很棒」「太厲害了」這類詞）
- 該說好就說好，該說要注意就直說，不用包裝太多

## 倪師核心教學
{knowledge[:20000] if knowledge else "（講義載入中）"}

## 分析原則
1. 命好不如限好 - 大運比本命重要
2. 三方四正一起看
3. 男命看夫妻宮，女命先看福德宮
4. 化忌是功課，不是壞事
5. 結合年齡和目前大限來分析
6. 給具體可執行的建議，不要空話"""


def build_user_prompt(chart_data: str) -> str:
    """Build the user prompt with chart data - returns JSON for all sections."""
    return f"""分析這個命盤，直接給結論和建議。

{chart_data}

請以 JSON 格式回傳，每個欄位都要填：

```json
{{
  "overall_reading": "總盤分析（至少200字）：1.命格特點與人生主軸 2.主星組合代表什麼性格 3.整體優勢與需要注意的地方 4.這輩子的大方向建議",
  "palace_readings": {{
    "命宮": "詳細分析（至少80字）：主星特質、亮度影響、有四化要說明具體影響、給這個宮位的建議",
    "兄弟宮": "詳細分析（至少60字）：與手足關係、合作運、有四化要說明",
    "夫妻宮": "詳細分析（至少80字）：感情模式、配偶特質、婚姻建議、有四化要說明",
    "子女宮": "詳細分析（至少60字）：子女緣、與晚輩關係、有四化要說明",
    "財帛宮": "詳細分析（至少80字）：賺錢方式、財運特質、理財建議、有四化要說明",
    "疾厄宮": "詳細分析（至少80字）：身體弱點、要注意的疾病、養生建議",
    "遷移宮": "詳細分析（至少60字）：外出運、貴人運、有四化要說明",
    "交友宮": "詳細分析（至少60字）：人際關係、朋友運、有四化要說明",
    "官祿宮": "詳細分析（至少80字）：事業運、適合的工作類型、發展建議、有四化要說明",
    "田宅宮": "詳細分析（至少60字）：不動產運、家庭環境、有四化要說明",
    "福德宮": "詳細分析（至少60字）：精神生活、興趣愛好、內心世界",
    "父母宮": "詳細分析（至少60字）：與長輩關係、遺傳、有四化要說明"
  }},
  "origin_palace_reading": "來因宮詳細分析（至少150字）：1.來因宮在哪個宮位 2.代表此生投胎的原因 3.人生課題是什麼 4.如何修練這個課題 5.具體的行動建議",
  "body_palace_reading": "身宮詳細分析（至少150字）：1.身宮在哪個宮位 2.身宮主星是什麼 3.後天努力的方向 4.中年後的發展重點 5.具體建議",
  "sihua_reading": "四化詳細分析（至少200字）：1.化祿在哪宮、代表什麼福氣、如何善用 2.化權在哪宮、代表什麼權力、如何發揮 3.化科在哪宮、代表什麼貴人、如何把握 4.化忌在哪宮、代表什麼功課、如何化解",
  "decadal_reading": "大限詳細分析（至少350字）：1.目前走第幾大限、大限宮位在哪 2.大限宮位的星曜組合代表什麼 3.這十年的整體運勢走向 4.事業運如何、有什麼機會 5.財運如何、理財建議 6.感情運如何、桃花運 7.健康要注意什麼 8.這十年最需要把握的機會 9.這十年最需要避開的風險 10.具體的行動建議",
  "yearly_reading": "流年詳細分析（至少250字）：1.今年流年命宮在哪個宮位 2.流年星曜組合 3.今年整體運勢評分 4.事業運：機會與挑戰 5.財運：收入與支出 6.感情運：桃花與關係 7.健康運：要注意什麼 8.今年的關鍵月份 9.今年最該做的事 10.今年最該避免的事",
  "career_reading": "事業詳細分析（至少200字）：1.根據命宮主星適合什麼類型的工作 2.根據官祿宮分析事業發展方向 3.適合創業還是上班 4.適合的行業列舉（至少5個）5.事業發展的具體建議 6.要避免的職業類型",
  "relationship_reading": "感情詳細分析（至少200字）：1.感情模式與態度 2.適合什麼類型的對象（具體描述）3.何時容易遇到對象（大限、流年）4.婚前要注意什麼 5.婚後相處建議 6.感情中的優勢與劣勢 7.給單身者的建議 8.給已婚者的建議",
  "health_reading": "健康詳細分析（至少200字）：1.根據疾厄宮分析身體弱點 2.容易有什麼疾病 3.哪些器官要特別注意 4.飲食建議 5.運動建議 6.作息建議 7.養生重點 8.定期檢查建議",
  "recommendations": "修練心法與建議（至少250字）：1.這輩子最重要的人生功課是什麼 2.性格上要如何調整 3.人際關係上的建議 4.財務管理的建議 5.事業發展的建議 6.感情經營的建議 7.健康維護的建議 8.精神修練的建議（列出5-8點具體可執行的建議）"
}}
```

要求：
1. 每個欄位都要達到指定的最低字數
2. 專業、幽默、直接，像老師在教學生
3. 結合實際命盤的星曜組合來說，不要講空話
4. 有四化的宮位要特別說明四化的影響
5. 給具體可執行的建議，不要只說「要注意」
6. 只回傳 JSON"""


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
