'use client';

import { useState, useCallback } from 'react';
import { ChartForm } from '@/components/ChartForm';
import { AstrolabeChart, AstrolabeChartPlaceholder } from '@/components/AstrolabeChart';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { calculateAstrolabe, AstrolabeData, PalaceData } from '@/lib/astrolabe';
import { BirthData } from '@/lib/types';
import {
  ChartAnalysisResult,
  ChartPalaceData,
  analyzeChart,
  checkBackendHealth,
} from '@/lib/api';

// Convert frontend palace data to API format
function convertPalacesToAPIFormat(palaces: PalaceData[]): ChartPalaceData[] {
  return palaces.map(palace => ({
    name: palace.name,
    heavenlyStem: palace.heavenlyStem,
    earthlyBranch: palace.earthlyBranch,
    majorStars: palace.majorStars.map(s => ({
      name: s.name,
      type: s.type,
      brightness: s.brightness,
      mutagen: s.mutagen,
    })),
    minorStars: palace.minorStars.map(s => ({
      name: s.name,
      type: s.type,
      brightness: s.brightness,
      mutagen: s.mutagen,
    })),
    isSoulPalace: palace.isSoulPalace,
    isBodyPalace: palace.isBodyPalace,
  }));
}

// 計算來因宮 (根據年干和實際命盤宮位)
// 來因宮是紫微斗數中代表前世因果、此生落點與宿命的核心宮位
// 計算方式：生年天干 → 對應地支 → 該地支所在宮位即為來因宮
function calculateOriginPalace(yearStem: string, palaces: PalaceData[]): { branch: string; palace: string } {
  // 來因宮對照表：年干 -> 地支（正確版）
  // 甲年→戌, 乙年→酉, 丙年→申, 丁年→未, 戊年→午
  // 己年→巳, 庚年→辰, 辛年→卯, 壬年→寅, 癸年→亥
  const originMapping: Record<string, string> = {
    '甲': '戌',
    '乙': '酉',
    '丙': '申',
    '丁': '未',
    '戊': '午',
    '己': '巳',
    '庚': '辰',
    '辛': '卯',
    '壬': '寅',
    '癸': '亥',
  };

  const branch = originMapping[yearStem] || '子';

  // 從實際命盤中找出該地支對應的宮位
  const targetPalace = palaces.find(p => p.earthlyBranch === branch);
  const palace = targetPalace ? targetPalace.name : '命宮';

  return { branch, palace };
}

export default function Home() {
  const [astrolabeData, setAstrolabeData] = useState<AstrolabeData | null>(null);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [originPalace, setOriginPalace] = useState<{ branch: string; palace: string } | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<ChartAnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [birthDataRef, setBirthDataRef] = useState<BirthData | null>(null);

  // Fetch analysis from backend
  const fetchAnalysis = useCallback(async (
    palaces: PalaceData[],
    genderValue: '男' | '女',
    origin?: { branch: string; palace: string }
  ) => {
    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      // First check if backend is available
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        setAnalysisError('後端服務暫時無法連線，請稍後再試。');
        setAnalysis(null);
        return;
      }

      // Convert palace data to API format
      const apiPalaces = convertPalacesToAPIFormat(palaces);

      // Call analyze chart API
      const result = await analyzeChart(apiPalaces, genderValue, origin);

      if (result) {
        setAnalysis(result);
        setAnalysisError(null);
      } else {
        setAnalysisError('分析結果為空，請確認命盤資料是否完整。');
        setAnalysis(null);
      }
    } catch (err) {
      console.error('Analysis fetch error:', err);
      setAnalysisError('取得分析時發生錯誤，命盤仍可正常顯示。');
      setAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(async (data: BirthData) => {
    setError(null);
    setAnalysisError(null);
    setBirthDataRef(data);
    setGender(data.gender);

    try {
      // Calculate the astrolabe chart
      const result = calculateAstrolabe(data);
      setAstrolabeData(result);
      setUserName(data.name);

      // 從命盤取得年干來計算來因宮
      // 使用 chineseDate 的第一個字 (年干)
      const yearStem = result.chineseDate?.charAt(0) || '甲';
      const origin = calculateOriginPalace(yearStem, result.palaces);
      setOriginPalace(origin);

      // Fetch analysis asynchronously (don't block chart display)
      fetchAnalysis(result.palaces, data.gender, origin);
    } catch (err) {
      console.error('Error calculating astrolabe:', err);
      setError('計算命盤時發生錯誤，請檢查輸入的日期是否正確。');
      setAstrolabeData(null);
      setAnalysis(null);
      setOriginPalace(null);
    }
  }, [fetchAnalysis]);

  // Retry analysis fetch
  const handleRetryAnalysis = useCallback(() => {
    if (astrolabeData) {
      fetchAnalysis(astrolabeData.palaces, gender, originPalace || undefined);
    }
  }, [astrolabeData, gender, originPalace, fetchAnalysis]);

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">倪師斗數</h1>
          <p className="text-xl text-gray-600">紫微斗數命理分析系統</p>
        </header>

        {/* Vertical layout */}
        <div className="space-y-6">
          {/* Row 1: Form */}
          <div className="max-w-lg mx-auto">
            <ChartForm onSubmit={handleSubmit} />

            {/* Error message */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-lg">{error}</p>
              </div>
            )}
          </div>

          {/* Row 2: Chart */}
          <div>
            {astrolabeData ? (
              <AstrolabeChart
                data={astrolabeData}
                name={userName}
                originPalace={originPalace || undefined}
              />
            ) : (
              <AstrolabeChartPlaceholder />
            )}
          </div>

          {/* Row 3: Analysis Panel */}
          <div>
            <AnalysisPanel
              analysis={analysis}
              isLoading={analysisLoading}
              error={analysisError}
              originPalace={originPalace || undefined}
              astrolabeData={astrolabeData}
              userName={userName}
            />

            {/* Retry button when there's an error */}
            {analysisError && astrolabeData && (
              <button
                onClick={handleRetryAnalysis}
                className="mt-3 w-full py-2 px-4 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-sm transition-colors"
              >
                重新取得分析
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-base text-gray-500">
          <p>基於倪海廈大師之斗數理論</p>
          <p className="mt-1">
            使用{' '}
            <a
              href="https://github.com/SylarLong/iztro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              iztro
            </a>{' '}
            紫微斗數計算引擎
          </p>
        </footer>
      </div>
    </main>
  );
}
