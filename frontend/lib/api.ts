/**
 * API client for 倪師斗數 backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============ Chart Analysis Types ============

export interface StarAnalysis {
  name: string;
  brightness?: string;
  nature?: string;
  represents: string[];
  interpretation: string;
}

export interface PalaceAnalysisResult {
  palace_name: string;
  earthly_branch: string;
  stars: StarAnalysis[];
  interpretation: string;
  key_points: string[];
  warnings: string[];
}

export interface PatternMatch {
  name: string;
  type: string; // 吉格, 凶格, 特殊格局
  meaning: string;
  effect: string;
}

export interface DangerousCombination {
  type: string;
  combination: string;
  palace: string;
  effect: string;
  severity: string;
  remedy?: string;
}

export interface WealthCombination {
  type: string;
  combination: string;
  palace: string;
  effect: string;
}

export interface ChartAnalysisResult {
  // 新版批命結構
  overall_analysis?: string[];           // 總盤解析
  palace_readings?: Record<string, string[]>;  // 各宮位解析 (宮位名 -> 解讀)
  sihua_analysis?: string[];             // 四化解析
  major_fortune?: string[];              // 大運解析
  suitable_careers?: string[];           // 適合工作類型
  personality_cultivation?: string[];    // 個性&自我修練心法
  origin_palace_reading?: string[];      // 來因宮解析
  // Legacy fields for compatibility
  personality?: string[];
  career?: string[];
  wealth?: string[];
  relationship?: string[];
  health?: string[];
  warnings?: string[];
  recommendations?: string[];
  palace_analyses?: PalaceAnalysisResult[];
  matched_patterns?: PatternMatch[];
  overall_summary?: string;
  career_analysis?: string;
  wealth_analysis?: string;
  relationship_analysis?: string;
  health_analysis?: string;
  dangerous_combinations?: DangerousCombination[];
  wealth_combinations?: WealthCombination[];
}

export interface ChartPalaceData {
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: Array<{
    name: string;
    type: string;
    brightness?: string;
    mutagen?: string;
  }>;
  minorStars: Array<{
    name: string;
    type: string;
    brightness?: string;
    mutagen?: string;
  }>;
  isSoulPalace: boolean;
  isBodyPalace: boolean;
}

/**
 * Analyze chart with palace-by-palace interpretation
 */
export async function analyzeChart(
  palaces: ChartPalaceData[],
  gender: '男' | '女' = '男',
  originPalace?: { branch: string; palace: string }
): Promise<ChartAnalysisResult | null> {
  try {
    // Convert palaces array to dictionary format expected by backend
    const palacesDict: Record<string, {
      branch: string;
      stem: string;
      stars: Array<{ name: string; brightness?: string; mutagen?: string }>;
    }> = {};

    for (const palace of palaces) {
      palacesDict[palace.name] = {
        branch: palace.earthlyBranch,
        stem: palace.heavenlyStem,
        stars: [
          ...palace.majorStars.map(s => ({
            name: s.name,
            brightness: s.brightness,
            mutagen: s.mutagen,
          })),
          ...palace.minorStars.map(s => ({
            name: s.name,
            brightness: s.brightness,
            mutagen: s.mutagen,
          })),
        ],
      };
    }

    const res = await fetch(`${API_BASE}/chart/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        palaces: palacesDict,
        gender,
        origin_palace: originPalace,
      }),
    });

    if (!res.ok) {
      console.error('analyzeChart API error:', res.status, await res.text());
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('analyzeChart error:', error);
    return null;
  }
}

/**
 * Check if backend is healthy
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get star definitions from backend
 */
export async function getStarsData(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${API_BASE}/chart/stars`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Get pattern definitions from backend
 */
export async function getPatternsData(): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${API_BASE}/chart/patterns`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ============ Feng Shui API ============

export interface RoomPosition {
  position: string;
  element: string;
}

export interface FengshuiIssue {
  position: string;
  element: string;
  effect: string;
  remedy: string;
  severity: string;
}

export interface FengshuiResponse {
  issues: FengshuiIssue[];
  overall_score: number;
  recommendations: string[];
}

export async function analyzeFengshui(rooms: RoomPosition[]): Promise<FengshuiResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/fengshui/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooms }),
    });

    if (!res.ok) {
      console.error('analyzeFengshui API error:', res.status);
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('analyzeFengshui error:', error);
    return null;
  }
}

// ============ Divination API ============

export interface DivinationResult {
  method: string;
  hexagram: string;
  interpretation: string;
  advice: string;
  nature: string;
  timing: string;
}

export async function divine(question: string): Promise<DivinationResult | null> {
  try {
    const res = await fetch(`${API_BASE}/divination/divine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: '六壬速斷', question }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ============ AI Reading ============

export interface AIReadingRequest {
  palaces: Record<string, {
    branch: string;
    stem: string;
    stars: Array<{ name: string; brightness?: string; mutagen?: string }>;
  }>;
  gender: string;
  age: number;
  origin_palace?: { branch: string; palace: string };
  current_decadal?: {
    index: number;
    heavenlyStem: string;
    earthlyBranch: string;
    palaceName: string;
    startAge: number;
    endAge: number;
  };
  current_yearly?: {
    year: number;
    heavenlyStem: string;
    earthlyBranch: string;
    palaceName: string;
    age: number;
  };
  five_elements_class: string;
  soul_star: string;
  body_star: string;
}

export interface AIReadingResponse {
  success: boolean;
  error?: string;
  // 各區塊分析 (Plan B - 一次 API 呼叫)
  overall_reading: string;                    // 總盤解析
  palace_readings?: Record<string, string>;   // 各宮位解析 {"命宮": "...", "夫妻宮": "..."}
  origin_palace_reading?: string;             // 來因宮解析
  body_palace_reading?: string;               // 身宮解析
  sihua_reading?: string;                     // 四化解析
  decadal_reading?: string;                   // 大限解析
  yearly_reading?: string;                    // 流年解析
  career_reading?: string;                    // 適合工作類型
  relationship_reading?: string;              // 感情婚姻
  health_reading?: string;                    // 健康分析
  recommendations?: string;                   // 修練心法與建議
}

/**
 * Get AI-powered chart reading using Claude
 */
export async function getAIReading(request: AIReadingRequest): Promise<AIReadingResponse> {
  try {
    const res = await fetch(`${API_BASE}/chart/ai-reading`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      return {
        overall_reading: '',
        success: false,
        error: `API 錯誤: ${res.status}`,
      };
    }

    return res.json();
  } catch (error) {
    return {
      overall_reading: '',
      success: false,
      error: `網路錯誤: ${error}`,
    };
  }
}

/**
 * Check if AI reading is available
 */
export async function checkAIStatus(): Promise<{
  ai_available: boolean;
  knowledge_available: boolean;
}> {
  try {
    const res = await fetch(`${API_BASE}/chart/ai-status`);
    if (!res.ok) return { ai_available: false, knowledge_available: false };
    return res.json();
  } catch {
    return { ai_available: false, knowledge_available: false };
  }
}

// ============ Divination Rules ============

export interface DivinationRuleResult {
  name: string;
  nature: string;
  description?: string;
}

export interface DivinationRules {
  methods: string[];
  descriptions: Record<string, string>;
  description?: string;
  usage?: string;
  results?: DivinationRuleResult[];
}

export async function getDivinationRules(): Promise<DivinationRules | null> {
  try {
    const res = await fetch(`${API_BASE}/divination/rules`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
