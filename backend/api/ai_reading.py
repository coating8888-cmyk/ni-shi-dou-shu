"""AI-powered chart reading using Claude API with 倪師 teachings + RAG."""

import hashlib
import os
import time
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import json
import re
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.config import Settings, get_settings
from backend.logger import get_logger

logger = get_logger("ai_reading")

router = APIRouter(prefix="/chart", tags=["AI Reading"])

VECTORS_DIR = Path(__file__).parent.parent.parent / "knowledge" / "vectors"
RULES_DIR = Path(__file__).parent.parent / "rules"

# RAG 快取：同命盤 1 小時內不重查向量庫
_rag_cache: Dict[str, Tuple[str, float]] = {}
_RAG_CACHE_TTL = 3600  # 1 hour


def _chart_hash(request: "AIReadingRequest") -> str:
    """產生命盤的唯一 hash，用於 RAG 快取鍵值。"""
    key_data = json.dumps({
        "palaces": request.palaces,
        "gender": request.gender,
    }, sort_keys=True, ensure_ascii=False)
    return hashlib.md5(key_data.encode()).hexdigest()


def _get_cached_rag(cache_key: str) -> Optional[str]:
    """取得快取的 RAG 結果，過期則清除。"""
    if cache_key in _rag_cache:
        result, ts = _rag_cache[cache_key]
        if time.time() - ts < _RAG_CACHE_TTL:
            return result
        del _rag_cache[cache_key]
    # 清除其他過期項目
    expired = [k for k, (_, ts) in _rag_cache.items() if time.time() - ts >= _RAG_CACHE_TTL]
    for k in expired:
        del _rag_cache[k]
    return None

# 向量庫客戶端（延遲初始化）
_chroma_client = None
_chroma_collection = None


def _get_collection():
    """取得 ChromaDB collection（延遲初始化，singleton）"""
    global _chroma_client, _chroma_collection
    if _chroma_collection is not None:
        return _chroma_collection
    try:
        import chromadb
        _chroma_client = chromadb.PersistentClient(path=str(VECTORS_DIR))
        _chroma_collection = _chroma_client.get_collection("ni_shi_knowledge")
        logger.info("向量庫已載入，共 %d 條", _chroma_collection.count())
        return _chroma_collection
    except Exception as e:
        logger.error("向量庫載入失敗: %s", e)
        return None


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
    overall_reading: str = ""
    palace_readings: Dict[str, str] = {}
    best_parts: str = ""
    caution_parts: str = ""
    origin_palace_reading: str = ""
    body_palace_reading: str = ""
    sihua_reading: str = ""
    decadal_reading: str = ""
    yearly_reading: str = ""
    career_reading: str = ""
    relationship_reading: str = ""
    health_reading: str = ""
    recommendations: str = ""


# ── RAG: 從命盤提取搜尋關鍵字 ──────────────────────

def extract_search_queries(request: AIReadingRequest) -> List[str]:
    """從命盤數據提取多組搜尋查詢，用於向量搜尋"""
    queries = []

    # 1. 命宮主星（最重要）
    ming_palace = request.palaces.get("命宮", {})
    ming_stars = _get_star_names(ming_palace)
    if ming_stars:
        queries.append(f"命宮 {' '.join(ming_stars)} 性格 事業")

    # 2. 四化位置（化忌最重要）
    for palace_name, palace_data in request.palaces.items():
        for star in palace_data.get("stars", []):
            if isinstance(star, dict) and star.get("mutagen"):
                mutagen = star["mutagen"]
                star_name = star.get("name", "")
                if mutagen == "忌":
                    queries.append(f"{star_name}化忌 {palace_name} 化忌對沖")
                elif mutagen == "祿":
                    queries.append(f"{star_name}化祿 {palace_name}")

    # 3. 三方四正核心宮位
    key_palaces = ["財帛宮", "官祿宮", "遷移宮", "夫妻宮", "福德宮"]
    for p_name in key_palaces:
        p_data = request.palaces.get(p_name, {})
        stars = _get_star_names(p_data)
        if stars:
            queries.append(f"{p_name} {' '.join(stars[:2])}")

    # 4. 性別特定查詢
    if request.gender == "女":
        fude = request.palaces.get("福德宮", {})
        fude_stars = _get_star_names(fude)
        queries.append(f"女命 福德宮 {' '.join(fude_stars[:2]) if fude_stars else ''}")
    else:
        queries.append(f"男命 事業 {' '.join(ming_stars[:2]) if ming_stars else ''}")

    # 5. 大限查詢
    if request.current_decadal:
        p_name = request.current_decadal.palaceName
        p_data = request.palaces.get(p_name, {})
        stars = _get_star_names(p_data)
        queries.append(f"大限 {p_name} {' '.join(stars[:2]) if stars else ''} 十年運勢")

    # 6. 流年查詢
    if request.current_yearly:
        queries.append(f"流年 {request.current_yearly.palaceName} 宮有宮性")

    # 7. 疾厄宮健康
    jiee = request.palaces.get("疾厄宮", {})
    jiee_stars = _get_star_names(jiee)
    branch = jiee.get("branch", "")
    if jiee_stars or branch:
        queries.append(f"疾厄宮 {branch} {' '.join(jiee_stars[:2]) if jiee_stars else ''} 健康")

    # 8. 來因宮
    if request.origin_palace:
        queries.append(f"來因宮 {request.origin_palace.get('palace', '')} 投胎原因")

    return queries[:12]  # 最多 12 個查詢


def _get_star_names(palace_data: Dict) -> List[str]:
    """從宮位數據提取星曜名稱"""
    names = []
    for star in palace_data.get("stars", []):
        if isinstance(star, dict):
            name = star.get("name", "")
            if name:
                names.append(name)
        elif isinstance(star, str):
            names.append(star)
    return names


# ── RAG: 向量搜尋 + 加權合併 ──────────────────────

def query_knowledge_rag(queries: List[str], max_total: int = 40) -> str:
    """分層 RAG 搜尋：規則+講義用向量搜，天紀原文用關鍵字+向量混合"""
    collection = _get_collection()
    if not collection:
        return _fallback_load_rules()

    seen_ids = set()
    results_pool = []

    def _add_results(result, boost: float = 1.0):
        for doc, meta, dist in zip(
            result["documents"][0],
            result["metadatas"][0],
            result["distances"][0],
        ):
            doc_id = f"{meta.get('source', '')}_{meta.get('chunk_index', 0)}"
            if doc_id in seen_ids:
                continue
            seen_ids.add(doc_id)
            weight = meta.get("weight", 5)
            score = (1.0 / max(dist, 0.01)) * (weight / 10.0) * boost
            results_pool.append({
                "doc": doc,
                "source": meta.get("source", ""),
                "category": meta.get("category", ""),
                "weight": weight,
                "distance": dist,
                "score": score,
            })

    # ── 第一層：規則 + AI 講義（向量搜尋品質好）──
    high_quality_cats = ["rules", "ai_lecture"]
    for query in queries:
        try:
            result = collection.query(
                query_texts=[query],
                n_results=4,
                where={"category": {"$in": high_quality_cats}},
            )
            _add_results(result, boost=1.5)
        except Exception as e:
            logger.warning("規則搜尋失敗: %s", e)

    # ── 第二層：天紀紫微斗數內容（限定 tianji 分類）──
    tianji_cats = ["tianji_ziwei", "tianji_full", "tianji_renjian", "tianji_yijing"]
    for query in queries[:6]:  # 前 6 個最重要的查詢
        try:
            result = collection.query(
                query_texts=[query],
                n_results=3,
                where={"category": {"$in": tianji_cats}},
            )
            _add_results(result, boost=1.2)
        except Exception as e:
            logger.warning("天紀搜尋失敗: %s", e)

    # ── 第三層：健康相關（如果有疾厄宮查詢）──
    health_queries = [q for q in queries if "疾厄" in q or "健康" in q]
    if health_queries:
        health_cats = ["bagang", "renji_zhenjiu", "tianji_renjian"]
        for query in health_queries:
            try:
                result = collection.query(
                    query_texts=[query],
                    n_results=3,
                    where={"category": {"$in": health_cats}},
                )
                _add_results(result, boost=1.0)
            except Exception as e:
                logger.warning("健康搜尋失敗: %s", e)

    # 按加權分數排序，取 top N
    results_pool.sort(key=lambda x: -x["score"])
    top_results = results_pool[:max_total]

    # 過濾太短或無意義的結果
    top_results = [r for r in top_results if len(r["doc"]) > 30]

    # 組裝知識文本
    knowledge_parts = []
    for r in top_results:
        knowledge_parts.append(r["doc"])

    rag_text = "\n\n---\n\n".join(knowledge_parts)
    logger.info("%d 查詢 → %d 結果 → top %d, %d 字", len(queries), len(results_pool), len(top_results), len(rag_text))

    return rag_text


def _fallback_load_rules() -> str:
    """向量庫不可用時的降級方案：直接載入規則 JSON"""
    knowledge_texts = []
    rule_files = [
        "ni_shi_principles.json",
        "palace_analysis_criteria.json",
        "huaji_rules.json",
        "ni_shi_quotes.json",
    ]
    for filename in rule_files:
        file_path = RULES_DIR / filename
        if file_path.exists():
            try:
                content = file_path.read_text(encoding='utf-8')
                knowledge_texts.append(f"=== {filename} ===\n{content}\n")
            except Exception:
                pass
    return "\n".join(knowledge_texts)


def load_knowledge_for_chart(request: AIReadingRequest) -> str:
    """根據命盤動態搜尋相關知識（RAG 主入口，含快取）"""
    cache_key = _chart_hash(request)
    cached = _get_cached_rag(cache_key)
    if cached is not None:
        logger.info("RAG cache hit (key=%s)", cache_key[:8])
        return cached

    queries = extract_search_queries(request)
    rag_knowledge = query_knowledge_rag(queries)

    _rag_cache[cache_key] = (rag_knowledge, time.time())
    logger.info("RAG cache miss → stored (key=%s)", cache_key[:8])
    return rag_knowledge


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


def build_system_prompt(rag_knowledge: str) -> str:
    """Build the system prompt with 倪師 teachings (RAG-powered)."""
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

## 與此命盤相關的倪師教學（RAG 動態檢索）
以下資料是根據此命盤的星曜配置、四化位置、大限流年等從倪師知識庫中檢索出的最相關內容。
請仔細閱讀並融入分析中。

{rag_knowledge[:30000] if rag_knowledge else "（知識庫載入中）"}

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

## 篇幅要求
- 總字數上限：6000 字
- 根據命盤特點自行分配各區塊篇幅
- 重要的、複雜的多說；簡單的、普通的少說
- 有特殊格局或化忌的宮位要詳細解釋
- 大限流年如果走到關鍵宮位要多著墨

請以 JSON 格式回傳，每個欄位都要填：

```json
{{
  "overall_reading": "【命主總批】命格特點與人生主軸、主星組合代表什麼性格、這輩子的大方向建議（根據倪師教學：先看三方四正，命好不如限好）",
  "palace_readings": {{
    "命宮": "主星特質、亮度影響、三方四正會的星、有四化要說明，從個性可看出成敗",
    "兄弟宮": "兄弟姐妹數量和關係、合夥吉凶、化忌三種解釋",
    "夫妻宮": "配偶特質、婚姻狀況、必須同時看福德宮",
    "子女宮": "子女緣、有無子女、化忌代表無子",
    "財帛宮": "先天財還是後天財、正財還是橫財、適合做生意還是領薪水",
    "疾厄宮": "煞星在哪個地支決定哪個器官有病（子膽丑肝寅肺卯腸辰胃巳脾午心未小腸申膀胱酉腎戌心包亥三焦）",
    "遷移宮": "適合本地還是外地發展、外地貴人運",
    "交友宮": "能否合夥、朋友是貴人還是小人、化忌代表合夥必敗",
    "官祿宮": "文官還是武官、官帶星大小決定官位高低、適合創業還是上班",
    "田宅宮": "祖業、不動產運、居家安全、化忌破祖業",
    "福德宮": "一生福報、女命最重要（代表先生和福祿）、化忌一世不順",
    "父母宮": "與父母關係、祖上庇蔭、化祿代表祖上有產業"
  }},
  "best_parts": "【整張盤最好的地方】哪些宮位星曜組合最佳、科權祿會在哪裡、最大的先天優勢是什麼、如何善用這些優勢",
  "caution_parts": "【整張盤最需要注意的地方】化忌在哪裡代表什麼功課、煞星落陷在哪裡、吉處藏凶的地方、如何預防或化解",
  "origin_palace_reading": "【來因宮解析】來因宮在哪個宮位、此生投胎的原因和課題、如何修練",
  "body_palace_reading": "【身宮解析】身宮在哪個宮位、後天努力方向（財帛=私企、官祿=公職、遷移=外地）、七殺臨身最忌",
  "sihua_reading": "【四化解析】化祿在哪宮福氣來源、化權在哪宮權力來源、化科在哪宮貴人來源、化忌在哪宮功課和化解方法（化忌對沖比本宮還凶）",
  "decadal_reading": "【大限解析】目前第幾大限在哪個宮位、大限三方四正的星曜組合、這十年運勢走向、事業財運感情健康分析、最需要把握的機會、最需要避開的風險、具體行動建議",
  "yearly_reading": "【流年解析】今年流年在哪個宮位（宮有宮性，落入財帛阻力在財、落入遷移驛馬動）、流年星曜組合、事業財運感情健康、關鍵月份、今年該做和該避免的事",
  "career_reading": "【適合工作類型】根據命宮和官祿宮判斷適合的職業方向、適合創業還是上班、具體行業推薦（至少5個）、要避免的職業",
  "relationship_reading": "【感情婚姻】感情模式、適合的對象類型、何時容易遇到（大限流年）、婚前婚後建議、女命要特別看福德宮",
  "health_reading": "【健康分析】疾厄宮煞星在哪個地支對應哪個器官、需要注意的疾病、養生建議",
  "recommendations": "【人生升級心法】這輩子最重要的功課、性格調整建議、人際財務事業感情健康各面向的具體建議（列出5-8點可執行的建議）、參考倪師：命占三分之一、陽宅三分之一、人事三分之一，人+地大於天"
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


def _repair_json(json_str: str) -> Optional[str]:
    """嘗試修復常見的 JSON 格式問題"""
    if not json_str:
        return None
    s = json_str
    # 移除控制字元（保留 \n \t）
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)
    # 移除尾逗號（例如 ,} 或 ,]）
    s = re.sub(r',\s*([}\]])', r'\1', s)
    # 修復未閉合的括號
    open_braces = s.count('{') - s.count('}')
    open_brackets = s.count('[') - s.count(']')
    if open_braces > 0:
        s += '}' * open_braces
    if open_brackets > 0:
        s += ']' * open_brackets
    return s


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

        # RAG: 根據命盤動態搜尋相關知識
        rag_knowledge = load_knowledge_for_chart(request)

        # Format chart data
        chart_data = format_chart_data(request)

        # Build prompts
        system_prompt = build_system_prompt(rag_knowledge)
        user_prompt = build_user_prompt(chart_data)

        # Call Claude API
        client = anthropic.Anthropic(api_key=api_key)

        message = client.messages.create(
            model=settings.claude_model,
            max_tokens=8000,  # 增加 token 上限以容納詳細分析
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_prompt}
            ]
        )

        # Extract response
        response_text = message.content[0].text if message.content else ""

        # 處理欄位可能是 list 的情況，轉換為 string
        def ensure_string(value) -> str:
            if isinstance(value, list):
                return "\n".join(str(item) for item in value)
            return str(value) if value else ""

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
            # JSON 修復嘗試
            repaired = _repair_json(json_str)
            if repaired:
                try:
                    parsed = json.loads(repaired)
                    logger.info("JSON 修復成功")
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
                    pass
            # 修復也失敗，回傳原始文字到 overall_reading
            logger.warning("JSON 解析與修復均失敗，fallback 到 overall_reading")
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


def _parse_ai_response(response_text: str) -> dict:
    """Parse AI response text into structured dict. Shared by both endpoints."""
    def ensure_string(value) -> str:
        if isinstance(value, list):
            return "\n".join(str(item) for item in value)
        return str(value) if value else ""

    json_match = re.search(r'```json\s*([\s\S]*?)\s*```', response_text)
    json_str = json_match.group(1) if json_match else response_text

    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError:
        repaired = _repair_json(json_str)
        if repaired:
            try:
                parsed = json.loads(repaired)
                logger.info("JSON 修復成功（stream）")
            except json.JSONDecodeError:
                return {"success": True, "overall_reading": response_text}
        else:
            return {"success": True, "overall_reading": response_text}

    return {
        "success": True,
        "overall_reading": ensure_string(parsed.get("overall_reading", "")),
        "palace_readings": parsed.get("palace_readings", {}),
        "best_parts": ensure_string(parsed.get("best_parts", "")),
        "caution_parts": ensure_string(parsed.get("caution_parts", "")),
        "origin_palace_reading": ensure_string(parsed.get("origin_palace_reading", "")),
        "body_palace_reading": ensure_string(parsed.get("body_palace_reading", "")),
        "sihua_reading": ensure_string(parsed.get("sihua_reading", "")),
        "decadal_reading": ensure_string(parsed.get("decadal_reading", "")),
        "yearly_reading": ensure_string(parsed.get("yearly_reading", "")),
        "career_reading": ensure_string(parsed.get("career_reading", "")),
        "relationship_reading": ensure_string(parsed.get("relationship_reading", "")),
        "health_reading": ensure_string(parsed.get("health_reading", "")),
        "recommendations": ensure_string(parsed.get("recommendations", "")),
    }


@router.post("/ai-reading-stream")
async def get_ai_reading_stream(
    request: AIReadingRequest,
    settings: Settings = Depends(get_settings),
):
    """SSE streaming endpoint for AI chart reading."""

    api_key = settings.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        async def error_stream():
            yield f"event: error\ndata: {json.dumps({'error': '未設定 Anthropic API Key'})}\n\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    async def event_generator():
        try:
            import anthropic

            # RAG search
            rag_knowledge = load_knowledge_for_chart(request)
            yield f"event: rag_complete\ndata: {json.dumps({'status': 'RAG 搜尋完成'})}\n\n"

            # Build prompts
            chart_data = format_chart_data(request)
            system_prompt = build_system_prompt(rag_knowledge)
            user_prompt = build_user_prompt(chart_data)

            # Stream with AsyncAnthropic
            async_client = anthropic.AsyncAnthropic(api_key=api_key)
            full_text = ""

            async with async_client.messages.stream(
                model=settings.claude_model,
                max_tokens=8000,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                async for text in stream.text_stream:
                    full_text += text
                    # Send each text chunk
                    yield f"event: text\ndata: {json.dumps({'text': text})}\n\n"

            # Parse complete response
            result = _parse_ai_response(full_text)
            yield f"event: complete\ndata: {json.dumps(result)}\n\n"

        except ImportError:
            yield f"event: error\ndata: {json.dumps({'error': '未安裝 anthropic 套件'})}\n\n"
        except Exception as e:
            logger.error("串流 AI 分析錯誤: %s", e)
            yield f"event: error\ndata: {json.dumps({'error': f'AI 分析錯誤：{str(e)}'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/ai-status")
async def check_ai_status(settings: Settings = Depends(get_settings)):
    """Check if AI reading is available."""
    api_key = settings.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY", "")
    collection = _get_collection()
    vector_count = collection.count() if collection else 0

    return {
        "ai_available": bool(api_key),
        "rag_enabled": collection is not None,
        "vector_count": vector_count,
        "vectors_path": str(VECTORS_DIR),
    }
