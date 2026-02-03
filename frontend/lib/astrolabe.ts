import { astro } from 'iztro';
import { BirthData } from './types';

// ============================================
// 倪師亮度覆蓋表 - 修正 iztro 與倪師說法不同之處
// 格式: { "星名": { "地支": "亮度" } }
// 亮度: 廟、旺、得、利、平、不、陷
// ============================================
const NI_SHI_BRIGHTNESS_OVERRIDE: Record<string, Record<string, string>> = {
  // 太陰（月亮）亮度 - 根據倪師：看月亮什麼時候亮
  // 酉（5-7pm）月亮看得到 → 旺
  // 戌（7-9pm）月亮開始亮 → 旺
  // 亥（9-11pm）月亮很亮 → 廟
  // 子（11pm-1am）月亮最亮 → 廟
  // 丑（1-3am）月亮還是亮 → 廟
  // 寅（3-5am）月亮要下去了 → 旺
  // 卯（5-7am）天快亮了，月亮還看得到 → 得
  // 辰（7-9am）太陽出來了 → 利
  // 巳（9-11am）太陽高照 → 平
  // 午（11am-1pm）正中午 → 不
  // 未（1-3pm）下午 → 平
  // 申（3-5pm）傍晚前 → 利
  '太陰': {
    '子': '廟',
    '丑': '廟',
    '寅': '旺',
    '卯': '得',
    '辰': '利',
    '巳': '平',
    '午': '不',
    '未': '平',
    '申': '利',
    '酉': '旺',
    '戌': '旺',
    '亥': '廟',
  },
  // 太陽亮度 - 根據倪師：看太陽什麼時候亮
  // 巳（9-11am）太陽升起 → 旺
  // 午（11am-1pm）正中午最亮 → 廟
  // 未（1-3pm）下午還是亮 → 廟
  // 申（3-5pm）太陽西斜 → 旺
  // 酉（5-7pm）太陽要下山 → 得
  // 戌（7-9pm）天黑了 → 利
  // 亥（9-11pm）晚上 → 平
  // 子（11pm-1am）半夜 → 不
  // 丑（1-3am）半夜 → 不
  // 寅（3-5am）天快亮 → 平
  // 卯（5-7am）太陽出來 → 利
  // 辰（7-9am）早上 → 得
  '太陽': {
    '子': '不',
    '丑': '不',
    '寅': '平',
    '卯': '利',
    '辰': '得',
    '巳': '旺',
    '午': '廟',
    '未': '廟',
    '申': '旺',
    '酉': '得',
    '戌': '利',
    '亥': '平',
  },
  // 祿存亮度 - 根據倪師教導
  // TODO: 請補充完整的祿存亮度表
  '祿存': {
    '子': '廟',
    '丑': '廟',
    '寅': '廟',
    '卯': '廟',
    '辰': '廟',
    '巳': '廟',
    '午': '廟',
    '未': '廟',
    '申': '廟',
    '酉': '廟',  // 1991辛年祿存在酉，廟
    '戌': '廟',
    '亥': '廟',
  },
};

// 取得星曜亮度（優先用倪師覆蓋表）
function getStarBrightness(starName: string, earthlyBranch: string, originalBrightness?: string): string | undefined {
  // 檢查是否有倪師覆蓋
  const override = NI_SHI_BRIGHTNESS_OVERRIDE[starName];
  if (override && override[earthlyBranch]) {
    return override[earthlyBranch];
  }
  // 否則用原本的
  return originalBrightness;
}

export interface StarData {
  name: string;
  type: string;
  brightness?: string;
  mutagen?: string;
}

export interface PalaceData {
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: StarData[];
  minorStars: StarData[];
  adjectiveStars: StarData[];
  isBodyPalace: boolean;
  isSoulPalace: boolean;
}

// 大限資料
export interface DecadalFortune {
  index: number;           // 第幾大限
  heavenlyStem: string;    // 天干
  earthlyBranch: string;   // 地支
  palaceName: string;      // 宮位名稱
  startAge: number;        // 起始年齡
  endAge: number;          // 結束年齡
  stars?: StarData[];      // 大限星曜
}

// 流年資料
export interface YearlyFortune {
  year: number;            // 西元年
  heavenlyStem: string;    // 天干
  earthlyBranch: string;   // 地支
  palaceName: string;      // 宮位名稱
  age: number;             // 該年虛歲
  stars?: StarData[];      // 流年星曜
}

export interface AstrolabeData {
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  time: string;
  timeRange: string;
  gender: string;
  fiveElementsClass: string;
  soulStar: string;
  bodyStar: string;
  earthlyBranchOfSoulPalace: string;
  earthlyBranchOfBodyPalace: string;
  zodiac: string;
  sign: string;
  palaces: PalaceData[];
  // 新增欄位
  birthYear: number;
  age: number;              // 虛歲
  realAge: number;          // 實歲
  currentDecadal?: DecadalFortune;   // 目前大限
  currentYearly?: YearlyFortune;     // 今年流年
  decadalFortunes?: DecadalFortune[]; // 所有大限
}

// 計算年齡
function calculateAge(birthYear: number, birthMonth: number, birthDay: number): { realAge: number; age: number } {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  // 實歲計算
  let realAge = currentYear - birthYear;
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    realAge--;
  }

  // 虛歲 = 實歲 + 1 (農曆算法，出生即一歲)
  const age = realAge + 1;

  return { realAge: Math.max(0, realAge), age: Math.max(1, age) };
}

// 根據五行局取得起運歲數
function getStartAge(fiveElementsClass: string): number {
  const startAgeMap: Record<string, number> = {
    '水二局': 2,
    '木三局': 3,
    '金四局': 4,
    '土五局': 5,
    '火六局': 6,
  };
  return startAgeMap[fiveElementsClass] || 5;
}

export function calculateAstrolabe(data: BirthData): AstrolabeData {
  // Format date as YYYY-M-D (iztro expects this format)
  const dateStr = `${data.year}-${data.month}-${data.day}`;

  // Use iztro to calculate the astrolabe
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let astrolabe: any;

  if (data.isLunar) {
    // For lunar date: byLunar(lunarDateStr, timeIndex, gender, isLeapMonth, fixLeap, language)
    astrolabe = astro.byLunar(dateStr, data.hour, data.gender, false, true, 'zh-TW');
  } else {
    // For solar date: bySolar(solarDate, timeIndex, gender, fixLeap, language)
    astrolabe = astro.bySolar(dateStr, data.hour, data.gender, true, 'zh-TW');
  }

  // ============================================
  // 身宮位置 - 使用 iztro 計算的身宮地支
  // iztro 的 earthlyBranchOfBodyPalace 是根據月份+時辰計算的
  // 找到該地支對應的宮位即為身宮
  // ============================================
  const bodyPalaceBranch = astrolabe.earthlyBranchOfBodyPalace;

  // Debug log
  console.log('[身宮計算] iztro身宮地支:', bodyPalaceBranch);

  // 檢查宮位地支是否匹配身宮
  const isBodyPalaceMatch = (palaceEarthlyBranch: string): boolean => {
    const match = palaceEarthlyBranch === bodyPalaceBranch;
    if (match) console.log('[身宮匹配] 地支:', palaceEarthlyBranch);
    return match;
  };

  // Map palaces from iztro result，並套用倪師亮度覆蓋 + 身宮修正
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const palaces: PalaceData[] = astrolabe.palaces.map((palace: any) => ({
    name: palace.name,
    heavenlyStem: palace.heavenlyStem,
    earthlyBranch: palace.earthlyBranch,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    majorStars: palace.majorStars.map((star: any) => ({
      name: star.name,
      type: star.type,
      brightness: getStarBrightness(star.name, palace.earthlyBranch, star.brightness),
      mutagen: star.mutagen,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    minorStars: palace.minorStars.map((star: any) => ({
      name: star.name,
      type: star.type,
      brightness: getStarBrightness(star.name, palace.earthlyBranch, star.brightness),
      mutagen: star.mutagen,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adjectiveStars: palace.adjectiveStars.map((star: any) => ({
      name: star.name,
      type: star.type,
    })),
    // 身宮：根據 iztro 計算的身宮地支找到對應宮位
    isBodyPalace: isBodyPalaceMatch(palace.earthlyBranch),
    isSoulPalace: palace.name === '命宮',
  }));

  // 計算年齡
  const { realAge, age } = calculateAge(data.year, data.month, data.day);

  // 計算大限
  const startAge = getStartAge(astrolabe.fiveElementsClass);
  const currentYear = new Date().getFullYear();

  // 計算所有大限 (12個大限，每個10年)
  const decadalFortunes: DecadalFortune[] = [];
  const palaceOrder = ['命宮', '父母宮', '福德宮', '田宅宮', '官祿宮', '交友宮',
                       '遷移宮', '疾厄宮', '財帛宮', '子女宮', '夫妻宮', '兄弟宮'];
  // 逆行順序 (陰男陽女)
  const palaceOrderReverse = ['命宮', '兄弟宮', '夫妻宮', '子女宮', '財帛宮', '疾厄宮',
                              '遷移宮', '交友宮', '官祿宮', '田宅宮', '福德宮', '父母宮'];

  // 判斷大限行進方向：陽男陰女順行，陰男陽女逆行
  const yearStem = astrolabe.chineseDate?.charAt(0) || '';
  const yangStems = ['甲', '丙', '戊', '庚', '壬'];
  const isYangYear = yangStems.includes(yearStem);
  const isMale = data.gender === '男';
  const isForward = (isYangYear && isMale) || (!isYangYear && !isMale);

  const orderToUse = isForward ? palaceOrder : palaceOrderReverse;

  for (let i = 0; i < 12; i++) {
    const palaceName = orderToUse[i];
    const palace = palaces.find(p => p.name === palaceName);
    decadalFortunes.push({
      index: i + 1,
      heavenlyStem: palace?.heavenlyStem || '',
      earthlyBranch: palace?.earthlyBranch || '',
      palaceName,
      startAge: startAge + i * 10,
      endAge: startAge + (i + 1) * 10 - 1,
    });
  }

  // 找出目前大限
  const currentDecadal = decadalFortunes.find(
    d => age >= d.startAge && age <= d.endAge
  );

  // 計算今年流年 (流年宮位 = 生年地支開始順數到今年)
  const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const birthYearBranch = astrolabe.chineseDate?.charAt(1) || '子';
  const birthBranchIndex = earthlyBranches.indexOf(birthYearBranch);
  const yearDiff = currentYear - data.year;
  const currentYearBranchIndex = (birthBranchIndex + yearDiff) % 12;
  const currentYearBranch = earthlyBranches[currentYearBranchIndex];

  // 找出流年宮位
  const yearlyPalace = palaces.find(p => p.earthlyBranch === currentYearBranch);

  const currentYearly: YearlyFortune = {
    year: currentYear,
    heavenlyStem: yearlyPalace?.heavenlyStem || '',
    earthlyBranch: currentYearBranch,
    palaceName: yearlyPalace?.name || '',
    age: age,
  };

  return {
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    time: astrolabe.time,
    timeRange: astrolabe.timeRange,
    gender: astrolabe.gender,
    fiveElementsClass: astrolabe.fiveElementsClass,
    soulStar: astrolabe.soul || '',
    bodyStar: astrolabe.body || '',
    earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
    zodiac: astrolabe.zodiac,
    sign: astrolabe.sign,
    palaces,
    // 新增欄位
    birthYear: data.year,
    age,
    realAge,
    currentDecadal,
    currentYearly,
    decadalFortunes,
  };
}
