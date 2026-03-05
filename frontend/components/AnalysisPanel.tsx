'use client';

import { ChartAnalysisResult } from '@/lib/api';
import { AstrolabeData } from '@/lib/astrolabe';
import { extractSihua } from '@/utils/extractSihua';
import { useAIReading } from '@/hooks/useAIReading';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { OverallAnalysisSection } from '@/components/analysis/OverallAnalysisSection';
import { AIReadingControls, AIReadingSections } from '@/components/analysis/AIReadingDisplay';

interface AnalysisPanelProps {
  analysis: ChartAnalysisResult | null;
  isLoading: boolean;
  error?: string | null;
  originPalace?: { branch: string; palace: string };
  astrolabeData?: AstrolabeData | null;
  userName?: string;
}

function LoadingSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 rounded w-4/6"></div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
      <div className="text-5xl mb-4 opacity-30">📜</div>
      <h3 className="text-xl font-medium text-gray-600 mb-2">命盤批命</h3>
      <p className="text-gray-500">排盤後將顯示詳細批命結果</p>
    </div>
  );
}

export function AnalysisPanel({ analysis, isLoading, error, originPalace, astrolabeData, userName }: AnalysisPanelProps) {
  const {
    aiResponse,
    aiLoading,
    aiError,
    streamingText,
    isStreaming,
    streamStage,
    handleAIReading,
  } = useAIReading(astrolabeData, originPalace);

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <span className="text-yellow-600 mr-2">⚠</span>
            <span className="font-medium text-yellow-800">無法取得分析</span>
          </div>
          <p className="text-sm text-yellow-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!astrolabeData) return <EmptyState />;

  const sihuaList = extractSihua(astrolabeData);

  return (
    <div className="bg-gradient-to-br from-pink-50/50 via-white to-violet-50/50 rounded-2xl shadow-sm p-8 border border-pink-100/50">
      {/* Header */}
      <div className="border-b border-pink-100 pb-5 mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">🌸 命盤批命 ✨</h2>
        <p className="text-lg text-pink-300 mt-2">基於倪海廈老師紫微斗數理論</p>
      </div>

      <div className="space-y-4">
        {/* 總盤解析 + AI 控制面板 */}
        <CollapsibleSection
          title="總盤解析"
          icon="🎀"
          defaultOpen={true}
          headerColor="bg-gradient-to-r from-amber-100 to-orange-100"
          titleColor="text-amber-600"
        >
          <OverallAnalysisSection astrolabeData={astrolabeData} sihuaList={sihuaList} />
          <AIReadingControls
            aiResponse={aiResponse}
            aiLoading={aiLoading}
            aiError={aiError}
            streamingText={streamingText}
            isStreaming={isStreaming}
            streamStage={streamStage}
            onStartReading={handleAIReading}
            astrolabeData={astrolabeData}
            userName={userName}
          />
        </CollapsibleSection>

        {/* AI 分析各區塊 */}
        <AIReadingSections aiResponse={aiResponse} />
      </div>

      {/* Footer */}
      <div className="mt-10 pt-6 border-t border-pink-100">
        <p className="text-base text-pink-300 text-center">
          以上批命僅供參考，基於倪海廈老師之紫微斗數教學 🌸
        </p>
      </div>
    </div>
  );
}

export default AnalysisPanel;
