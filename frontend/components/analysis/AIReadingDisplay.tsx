'use client';

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import { AIReadingResponse } from '@/lib/api';
import { AstrolabeData } from '@/lib/astrolabe';
import { formatAIText, formatCultivationText } from '@/utils/formatters';
import { exportPDF } from '@/utils/pdfExport';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';

interface AIReadingControlsProps {
  aiResponse: AIReadingResponse | null;
  aiLoading: boolean;
  aiError: string | null;
  streamingText: string;
  isStreaming: boolean;
  streamStage: string;
  onStartReading: () => void;
  astrolabeData: AstrolabeData;
  userName?: string;
}

/**
 * Controls & overall reading — rendered inside the 總盤解析 CollapsibleSection.
 */
export function AIReadingControls({
  aiResponse,
  aiLoading,
  aiError,
  streamingText,
  isStreaming,
  streamStage,
  onStartReading,
  astrolabeData,
  userName,
}: AIReadingControlsProps) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!aiResponse) return;
    setPdfLoading(true);
    try {
      await exportPDF(aiResponse, astrolabeData, userName);
    } catch (err) {
      console.error('PDF 生成失敗:', err);
      alert('PDF 生成失敗，請稍後再試');
    } finally {
      setPdfLoading(false);
    }
  }, [aiResponse, astrolabeData, userName]);

  return (
    <div className="mt-8 pt-6 border-t border-pink-100">
      <div className="flex items-center justify-between mb-6">
        <h4 className="font-bold text-pink-400 text-xl flex items-center gap-3">
          <span className="text-2xl">🤖</span> AI 智慧批命 <span className="text-2xl">✨</span>
        </h4>
        <div className="flex gap-3">
          {aiResponse && (
            <button
              onClick={handleDownload}
              disabled={pdfLoading}
              className={clsx(
                "px-5 py-3 rounded-2xl font-bold text-lg transition-all shadow-sm hover:shadow flex items-center gap-2 border",
                pdfLoading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                  : "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-500 hover:from-emerald-100 hover:to-teal-100 border-emerald-200"
              )}
            >
              {pdfLoading ? (
                <>
                  <span className="animate-spin">⏳</span> 生成 PDF...
                </>
              ) : (
                <>
                  <span>📥</span> 下載 PDF
                </>
              )}
            </button>
          )}
          <button
            onClick={onStartReading}
            disabled={aiLoading}
            className={clsx(
              'px-5 py-3 rounded-2xl font-bold text-lg transition-all border',
              aiLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                : 'bg-gradient-to-r from-pink-50 via-rose-50 to-violet-50 text-violet-500 hover:from-pink-100 hover:via-rose-100 hover:to-violet-100 border-violet-200 shadow-sm hover:shadow'
            )}
          >
            {aiLoading ? '分析中...' : aiResponse ? '🔄 重新分析' : '✨ 開始 AI 批命'}
          </button>
        </div>
      </div>

      {/* AI Loading / Streaming */}
      {aiLoading && (
        <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-violet-50 rounded-2xl p-8 border border-pink-100">
          {!isStreaming ? (
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-pink-300 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-pink-400 text-xl">
                {streamStage === 'rag' ? 'AI 正在閱讀倪師講義...' : 'AI 正在分析您的命盤...'} 🌸
              </p>
              <p className="text-pink-300 text-lg mt-2">請稍候 ✨</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-pink-400 rounded-full animate-pulse"></div>
                <p className="text-pink-400 text-lg font-bold">AI 正在批命中...</p>
              </div>
              <div className="bg-white/60 rounded-xl p-5 max-h-[400px] overflow-y-auto text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                {streamingText}
                <span className="inline-block w-2 h-5 bg-pink-400 ml-1 animate-pulse"></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Error */}
      {aiError && !aiLoading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-red-700 font-bold text-lg">AI 分析失敗</p>
          <p className="text-red-600 text-base mt-2">{aiError}</p>
          <p className="text-red-500 text-sm mt-3">提示：請確認後端已設定 ANTHROPIC_API_KEY</p>
        </div>
      )}

      {/* AI Reading Result - 總盤解析 */}
      {aiResponse?.overall_reading && !aiLoading && (
        <div className="bg-gradient-to-br from-amber-50/50 via-orange-50/50 to-rose-50/50 rounded-2xl p-6 border border-amber-100">
          <div className="prose prose-lg max-w-none leading-relaxed">
            {formatAIText(aiResponse.overall_reading)}
          </div>
        </div>
      )}

      {/* 沒有 AI 結果時的提示 */}
      {!aiResponse && !aiLoading && !aiError && (
        <div className="bg-gradient-to-r from-pink-50/50 to-violet-50/50 rounded-2xl p-8 text-center border border-pink-100/50">
          <p className="text-xl text-pink-400">✨ 點擊「開始 AI 批命」，讓 AI 閱讀倪師講義後為您分析命盤</p>
          <p className="text-lg mt-2 text-pink-300">AI 會用算命師的口吻，結合您的大限流年給出建議 🌸</p>
          <p className="text-base mt-3 text-pink-200">（費用約 NT$5-7 / 次）</p>
        </div>
      )}
    </div>
  );
}

/**
 * AI result sections — rendered as sibling CollapsibleSections.
 */
export function AIReadingSections({ aiResponse }: { aiResponse: AIReadingResponse | null }) {
  if (!aiResponse) return null;

  return (
    <>
      {aiResponse.best_parts && (
        <CollapsibleSection title="整張盤最好的地方" icon="🌿" headerColor="bg-gradient-to-r from-emerald-50 to-green-50" titleColor="text-emerald-500">
          <div className="bg-gradient-to-r from-emerald-50/50 to-green-50/50 rounded-2xl p-5 border border-emerald-200 leading-relaxed">
            {formatAIText(aiResponse.best_parts)}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.caution_parts && (
        <CollapsibleSection title="最需要注意的地方" icon="⚠️" headerColor="bg-gradient-to-r from-orange-50 to-amber-50" titleColor="text-orange-500">
          <div className="bg-gradient-to-r from-orange-50/50 to-amber-50/50 rounded-2xl p-5 border border-orange-200 leading-relaxed">
            {formatAIText(aiResponse.caution_parts)}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.origin_palace_reading && (
        <CollapsibleSection title="來因宮解析" icon="🌟" headerColor="bg-gradient-to-r from-amber-50 to-yellow-50" titleColor="text-amber-500">
          <div className="bg-gradient-to-r from-amber-50/50 to-yellow-50/50 rounded-2xl p-5 border border-amber-100 leading-relaxed">
            {formatAIText(aiResponse.origin_palace_reading)}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.body_palace_reading && (
        <CollapsibleSection title="身宮解析" icon="🎯" headerColor="bg-gradient-to-r from-sky-50 to-cyan-50" titleColor="text-sky-500">
          <div className="bg-gradient-to-r from-sky-50/50 to-cyan-50/50 rounded-2xl p-5 border border-sky-100 leading-relaxed">
            {formatAIText(aiResponse.body_palace_reading)}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.palace_readings && Object.keys(aiResponse.palace_readings).length > 0 && (
        <CollapsibleSection title="各宮位解析" icon="🏛️" headerColor="bg-gradient-to-r from-slate-50 to-gray-50" titleColor="text-slate-500">
          <div className="space-y-4">
            {Object.entries(aiResponse.palace_readings).map(([palaceName, reading]) => {
              const palaceColorMap: Record<string, { header: string; content: string; border: string }> = {
                '命宮': { header: 'bg-rose-200', content: 'bg-rose-50/50', border: 'border-rose-200' },
                '兄弟宮': { header: 'bg-orange-200', content: 'bg-orange-50/50', border: 'border-orange-200' },
                '夫妻宮': { header: 'bg-pink-200', content: 'bg-pink-50/50', border: 'border-pink-200' },
                '子女宮': { header: 'bg-violet-200', content: 'bg-violet-50/50', border: 'border-violet-200' },
                '財帛宮': { header: 'bg-emerald-200', content: 'bg-emerald-50/50', border: 'border-emerald-200' },
                '疾厄宮': { header: 'bg-red-200', content: 'bg-red-50/50', border: 'border-red-200' },
                '遷移宮': { header: 'bg-cyan-200', content: 'bg-cyan-50/50', border: 'border-cyan-200' },
                '交友宮': { header: 'bg-amber-200', content: 'bg-amber-50/50', border: 'border-amber-200' },
                '官祿宮': { header: 'bg-sky-200', content: 'bg-sky-50/50', border: 'border-sky-200' },
                '田宅宮': { header: 'bg-lime-200', content: 'bg-lime-50/50', border: 'border-lime-200' },
                '福德宮': { header: 'bg-purple-200', content: 'bg-purple-50/50', border: 'border-purple-200' },
                '父母宮': { header: 'bg-teal-200', content: 'bg-teal-50/50', border: 'border-teal-200' },
              };
              const colors = palaceColorMap[palaceName] || { header: 'bg-slate-200', content: 'bg-slate-50/50', border: 'border-slate-200' };

              return (
                <div key={palaceName} className={clsx('rounded-2xl overflow-hidden border', colors.border)}>
                  <div className={clsx('px-5 py-4', colors.header)}>
                    <span className="font-bold text-2xl text-gray-700">{palaceName}</span>
                  </div>
                  <div className={clsx('p-5', colors.content)}>
                    <div className="leading-relaxed text-lg">{formatAIText(reading)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.sihua_reading && (
        <CollapsibleSection title="四化解析" icon="⭐" headerColor="bg-gradient-to-r from-violet-50 to-purple-50" titleColor="text-violet-400">
          <div className="bg-gradient-to-r from-violet-50/50 to-pink-50/50 rounded-2xl p-5 border border-violet-100 leading-relaxed">
            {formatAIText(aiResponse.sihua_reading)}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.decadal_reading && (
        <CollapsibleSection title="大限解析" icon="🔮" headerColor="bg-gradient-to-r from-indigo-50 to-blue-50" titleColor="text-indigo-400">
          <div className="bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-2xl p-5 border border-indigo-100 leading-relaxed">
            {formatAIText(aiResponse.decadal_reading)}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.yearly_reading && (
        <CollapsibleSection title="流年解析" icon="📅" headerColor="bg-gradient-to-r from-cyan-50 to-teal-50" titleColor="text-cyan-400">
          <div className="bg-gradient-to-r from-cyan-50/50 to-teal-50/50 rounded-2xl p-5 border border-cyan-100 leading-relaxed">
            {formatAIText(aiResponse.yearly_reading)}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.career_reading && (
        <CollapsibleSection title="適合工作類型" icon="💼" headerColor="bg-gradient-to-r from-emerald-50 to-green-50" titleColor="text-emerald-400">
          <div className="bg-gradient-to-r from-emerald-50/50 to-green-50/50 rounded-2xl p-5 border border-emerald-100 leading-relaxed">
            {formatAIText(aiResponse.career_reading)}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.relationship_reading && (
        <CollapsibleSection title="感情婚姻" icon="💕" headerColor="bg-gradient-to-r from-pink-50 to-rose-50" titleColor="text-pink-400">
          <div className="bg-gradient-to-r from-pink-50/50 to-rose-50/50 rounded-2xl p-5 border border-pink-100 leading-relaxed">
            {formatAIText(aiResponse.relationship_reading)}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.health_reading && (
        <CollapsibleSection title="健康分析" icon="🏥" headerColor="bg-gradient-to-r from-rose-50 to-orange-50" titleColor="text-rose-400">
          <div className="bg-gradient-to-r from-rose-50/50 to-orange-50/50 rounded-2xl p-5 border border-rose-100 leading-relaxed">
            {formatAIText(aiResponse.health_reading)}
          </div>
        </CollapsibleSection>
      )}

      {aiResponse.recommendations && (
        <CollapsibleSection title="修練心法與建議" icon="🧘" headerColor="bg-gradient-to-r from-teal-50 to-emerald-50" titleColor="text-teal-400">
          {formatCultivationText(aiResponse.recommendations)}
        </CollapsibleSection>
      )}
    </>
  );
}
