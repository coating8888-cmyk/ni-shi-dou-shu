'use client';

import { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { ChartAnalysisResult, getAIReading, AIReadingRequest } from '@/lib/api';
import { AstrolabeData, PalaceData } from '@/lib/astrolabe';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// 格式化 AI 回傳的文字，自動加入換行和段落
function formatAIText(text: string): React.ReactNode {
  if (!text) return null;

  // 定義區塊標記的正則
  const sectionMarkers = /(\[\[ASPECT:[^\]]+\]\]|\[\[HIGHLIGHT:[^\]]+\]\]|\[\[SIHUA:[^\]]+\]\]|\[\[TITLE:[^\]]+\]\])/g;

  // 先處理基本格式
  let formatted = text
    // 四化標題 - 包含主星名稱（如「天機化祿在」）
    .replace(/([\u4e00-\u9fa5]{2,4})化祿在/g, '[[SIHUA:祿:$1]]化祿在')
    .replace(/([\u4e00-\u9fa5]{2,4})化權在/g, '[[SIHUA:權:$1]]化權在')
    .replace(/([\u4e00-\u9fa5]{2,4})化科在/g, '[[SIHUA:科:$1]]化科在')
    .replace(/([\u4e00-\u9fa5]{2,4})化忌在/g, '[[SIHUA:忌:$1]]化忌在')
    // 沒有主星名稱的情況
    .replace(/([，。])化祿在/g, '$1[[SIHUA:祿]]化祿在')
    .replace(/([，。])化權在/g, '$1[[SIHUA:權]]化權在')
    .replace(/([，。])化科在/g, '$1[[SIHUA:科]]化科在')
    .replace(/([，。])化忌在/g, '$1[[SIHUA:忌]]化忌在')
    // 大方向建議標題
    .replace(/(這輩子的大方向建議)[：:]/g, '[[TITLE:$1]]')
    // 流年運勢分類
    .replace(/((?:事業運|財運|感情運|健康|人際關係)方面)[，,]/g, '[[ASPECT:$1]]')
    // 重點提示
    .replace(/(今年(?:最該做的事|最該避免的事|的關鍵月份))[是，,]/g, '[[HIGHLIGHT:$1]]')
    // 清理多餘空白
    .replace(/\s+/g, ' ')
    .trim();

  // 分割成區塊（根據標記）
  const parts = formatted.split(sectionMarkers).filter(p => p.trim());

  // 組合區塊：將標記與後續內容配對
  const sections: { type: string; marker?: string; starName?: string; content: string }[] = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i].trim();
    if (part.match(/^\[\[(ASPECT|HIGHLIGHT|SIHUA|TITLE):/)) {
      // 這是一個標記，下一個部分是內容
      const markerMatch = part.match(/^\[\[(\w+):([^\]]+)\]\]/);
      if (markerMatch) {
        const type = markerMatch[1];
        const markerFull = markerMatch[2];
        // 解析標記內容（可能包含主星名稱，如「祿:天機」）
        const markerParts = markerFull.split(':');
        const marker = markerParts[0];
        const starName = markerParts[1] || undefined;
        // 收集此標記後的所有內容，直到下一個標記
        let content = '';
        i++;
        while (i < parts.length && !parts[i].match(/^\[\[(ASPECT|HIGHLIGHT|SIHUA|TITLE):/)) {
          content += parts[i];
          i++;
        }
        sections.push({ type, marker, starName, content: content.trim() });
      }
    } else {
      // 普通文字
      sections.push({ type: 'text', content: part });
      i++;
    }
  }

  // 格式化普通文字內容
  const formatContent = (content: string): React.ReactNode => {
    // 處理小標題、編號、建議等
    let processed = content
      .replace(/([\u4e00-\u9fa5]{2,12}(?:方面|建議|分析|重點|注意|提醒|說明))：/g, '\n##$1：##\n')
      .replace(/([一二三四五六七八九十]+)、/g, '\n**$1、**')
      .replace(/(\d+)[\.、]/g, '\n**$1.** ')
      .replace(/【([^】]+)】/g, '\n##【$1】##\n')
      // 建議句子要分離出來（在句號後的建議）
      .replace(/。建議/g, '。\n[[ADVICE]]建議')
      .replace(/，建議你/g, '。\n[[ADVICE]]建議你')
      .replace(/^建議/g, '[[ADVICE]]建議');

    const lines = processed.split('\n').filter(l => l.trim());
    return (
      <div className="space-y-2">
        {lines.map((line, lineIdx) => {
          const trimmedLine = line.trim();
          // 標題
          if (trimmedLine.startsWith('##') && trimmedLine.endsWith('##')) {
            return <div key={lineIdx} className="font-bold text-gray-800 mt-3 mb-1">{trimmedLine.slice(2, -2)}</div>;
          }
          // 編號
          if (trimmedLine.startsWith('**')) {
            const match = trimmedLine.match(/^\*\*([^*]+)\*\*\s*(.*)/);
            if (match) {
              return <div key={lineIdx} className="pl-2"><strong className="text-purple-700">{match[1]}</strong>{match[2]}</div>;
            }
          }
          // 建議 - 使用明顯的樣式
          if (trimmedLine.startsWith('[[ADVICE]]')) {
            const adviceText = trimmedLine.replace('[[ADVICE]]', '');
            return (
              <div key={lineIdx} className="mt-3 bg-indigo-100 rounded-lg p-3 border-l-4 border-indigo-500">
                <span className="text-indigo-700 font-bold">💡 </span>
                <span className="text-indigo-800">{adviceText}</span>
              </div>
            );
          }
          return <p key={lineIdx} className="leading-relaxed">{trimmedLine}</p>;
        })}
      </div>
    );
  };

  // 渲染區塊 - 柔和馬卡龍配色
  const aspectColors: Record<string, { icon: string; bg: string; border: string; text: string }> = {
    '事業運方面': { icon: '💼', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-400' },
    '財運方面': { icon: '💰', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-400' },
    '感情運方面': { icon: '💕', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-400' },
    '健康方面': { icon: '🏥', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-400' },
    '人際關係方面': { icon: '🤝', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-400' },
  };

  const sihuaColors: Record<string, { emoji: string; bg: string; border: string; text: string }> = {
    '祿': { emoji: '🌸', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-400' },
    '權': { emoji: '🌺', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-400' },
    '科': { emoji: '🦋', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-400' },
    '忌': { emoji: '🔮', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-400' },
  };

  return (
    <div className="space-y-3 text-lg">
      {sections.map((section, idx) => {
        if (section.type === 'ASPECT' && section.marker) {
          const color = aspectColors[section.marker] || { icon: '📌', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400' };
          return (
            <div key={idx} className={`${color.bg} rounded-2xl border ${color.border} p-4`}>
              <div className={`font-bold text-xl ${color.text} mb-2`}>
                {color.icon} {section.marker}
              </div>
              <div className="text-gray-700 leading-relaxed">
                {formatContent(section.content)}
              </div>
            </div>
          );
        }

        if (section.type === 'HIGHLIGHT' && section.marker) {
          const isPositive = section.marker.includes('做');
          const isMonth = section.marker.includes('月份');
          return (
            <div key={idx} className={`rounded-2xl p-4 border ${isPositive ? 'bg-emerald-50/50 border-emerald-200' : isMonth ? 'bg-cyan-50/50 border-cyan-200' : 'bg-amber-50/50 border-amber-200'}`}>
              <div className={`font-bold text-xl mb-2 ${isPositive ? 'text-emerald-400' : isMonth ? 'text-cyan-400' : 'text-amber-400'}`}>
                {isPositive ? '✅' : isMonth ? '📅' : '⚠️'} {section.marker}
              </div>
              <div className="text-gray-700 leading-relaxed font-medium">
                {formatContent(section.content)}
              </div>
            </div>
          );
        }

        if (section.type === 'SIHUA' && section.marker) {
          const color = sihuaColors[section.marker] || sihuaColors['祿'];
          return (
            <div key={idx} className={`${color.bg} rounded-2xl border ${color.border} p-4 mb-3`}>
              <div className={`font-bold text-xl ${color.text} mb-2`}>
                {color.emoji} {section.starName && <span className="text-gray-600">{section.starName}</span>} 化{section.marker}
              </div>
              <div className="text-gray-700 leading-relaxed">
                {formatContent(section.content)}
              </div>
            </div>
          );
        }

        // 標題區塊（如「這輩子的大方向建議」）
        if (section.type === 'TITLE' && section.marker) {
          return (
            <div key={idx} className="mt-6">
              <div className="bg-gradient-to-r from-pink-100 to-violet-100 rounded-2xl p-4 border border-pink-200 mb-3">
                <h4 className="font-bold text-xl text-pink-500 mb-2">🌟 {section.marker}</h4>
                <div className="text-gray-700 leading-relaxed">
                  {formatContent(section.content)}
                </div>
              </div>
            </div>
          );
        }

        // 普通文字
        return (
          <div key={idx} className="text-gray-700 leading-relaxed">
            {formatContent(section.content)}
          </div>
        );
      })}
    </div>
  );
}

// 專門格式化修練心法的函數
function formatCultivationText(text: string): React.ReactNode {
  if (!text) return null;

  // 分割成段落（根據句號、換行、或編號）
  const sentences = text
    // 先處理小標題（XXX建議：XXX分析：等），保留冒號後的內容
    .replace(/([\u4e00-\u9fa5]{2,8}(?:建議|分析|方面|重點))：/g, '\n【TITLE:$1】')
    // 先處理編號，在編號前加換行
    .replace(/([一二三四五六七八九十]+)、/g, '\n【NUM:$1】')
    .replace(/第([一二三四五六七八九十]+)[，,]/g, '\n【NUM:第$1】')
    .replace(/(\d+)[\.、]/g, '\n【NUM:$1】')
    // 處理句號
    .replace(/。/g, '。\n')
    .replace(/！/g, '！\n')
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // 分類關鍵詞 - 柔和馬卡龍配色
  const categoryKeywords: Record<string, { icon: string; label: string; bg: string; border: string; text: string }> = {
    '性格': { icon: '🎀', label: '性格修練', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-400' },
    '脾氣': { icon: '🎀', label: '性格修練', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-400' },
    '情緒': { icon: '🌸', label: '心態調整', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-400' },
    '心態': { icon: '🌸', label: '心態調整', bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-400' },
    '人際': { icon: '🧸', label: '人際關係', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-400' },
    '溝通': { icon: '🧸', label: '人際關係', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-400' },
    '財': { icon: '🍀', label: '理財之道', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-400' },
    '錢': { icon: '🍀', label: '理財之道', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-400' },
    '健康': { icon: '🌷', label: '養生保健', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-400' },
    '身體': { icon: '🌷', label: '養生保健', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-400' },
    '事業': { icon: '⭐', label: '事業發展', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-400' },
    '工作': { icon: '⭐', label: '事業發展', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-400' },
    '感情': { icon: '💖', label: '感情經營', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-400' },
    '婚姻': { icon: '💖', label: '感情經營', bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-400' },
    '學習': { icon: '📖', label: '學習成長', bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-400' },
    '精神': { icon: '🦋', label: '精神修養', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-400' },
    '修行': { icon: '🦋', label: '精神修養', bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-400' },
    '放下': { icon: '🌈', label: '心法要訣', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-400' },
    '執著': { icon: '🌈', label: '心法要訣', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-400' },
  };

  // 分組句子
  const groups: { category: typeof categoryKeywords[string] | null; sentences: string[] }[] = [];
  let currentGroup: { category: typeof categoryKeywords[string] | null; sentences: string[] } = { category: null, sentences: [] };

  for (const sentence of sentences) {
    // 檢查是否是建議句
    const isAdvice = sentence.includes('建議') || sentence.includes('要') || sentence.includes('應該') || sentence.includes('可以');

    // 找出分類
    let foundCategory: typeof categoryKeywords[string] | null = null;
    for (const [keyword, category] of Object.entries(categoryKeywords)) {
      if (sentence.includes(keyword)) {
        foundCategory = category;
        break;
      }
    }

    // 如果找到新分類且與當前不同，開始新組
    if (foundCategory && foundCategory.label !== currentGroup.category?.label) {
      if (currentGroup.sentences.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = { category: foundCategory, sentences: [sentence] };
    } else {
      currentGroup.sentences.push(sentence);
    }
  }

  // 加入最後一組
  if (currentGroup.sentences.length > 0) {
    groups.push(currentGroup);
  }

  // 如果沒有分組，使用預設格式
  if (groups.length === 0) {
    return (
      <div className="space-y-4">
        {sentences.map((sentence, idx) => (
          <p key={idx} className="text-gray-800 text-lg leading-relaxed">{sentence}</p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 修練總綱 - 柔和馬卡龍風格 */}
      <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-fuchsia-50 rounded-2xl p-5 border border-pink-100 mb-6">
        <div className="text-center">
          <span className="text-2xl">✨</span>
          <h4 className="font-bold text-pink-400 text-xl inline ml-2">修練總綱</h4>
          <span className="text-2xl ml-2">🌸</span>
        </div>
        <p className="text-pink-300 text-center mt-2 text-lg">
          根據您的命盤，以下是您這一世需要修練的重點課題
        </p>
      </div>

      {/* 分類顯示 */}
      {groups.map((group, groupIdx) => {
        const cat = group.category || { icon: '📝', label: '修練要點', bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-800' };
        return (
          <div key={groupIdx} className={`${cat.bg} rounded-xl overflow-hidden border-2 ${cat.border}`}>
            {/* 分類標題 */}
            <div className={`px-4 py-3 ${cat.bg} border-b ${cat.border}`}>
              <span className="text-xl mr-2">{cat.icon}</span>
              <span className={`font-bold text-lg ${cat.text}`}>{cat.label}</span>
            </div>
            {/* 內容 */}
            <div className="p-4 bg-white/50 space-y-3">
              {group.sentences.map((sentence, sentenceIdx) => {
                // 小標題處理（XXX建議、XXX分析等）
                if (sentence.includes('【TITLE:')) {
                  const titleMatch = sentence.match(/【TITLE:([^】]+)】(.*)/);
                  if (titleMatch) {
                    const title = titleMatch[1];
                    const content = titleMatch[2]?.trim();
                    return (
                      <div key={sentenceIdx} className="mt-2">
                        <div className="font-bold text-lg text-gray-800 mb-2 flex items-center gap-2">
                          <span className="text-amber-500">▸</span>
                          {title}
                        </div>
                        {content && (
                          <p className="text-gray-700 text-lg leading-relaxed pl-5">{content}</p>
                        )}
                      </div>
                    );
                  }
                }
                // 編號項目特殊處理
                if (sentence.includes('【NUM:')) {
                  const numMatch = sentence.match(/【NUM:([^】]+)】(.*)/);
                  if (numMatch) {
                    const num = numMatch[1];
                    const content = numMatch[2];
                    return (
                      <div key={sentenceIdx} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                        <span className="bg-violet-300 text-white font-bold px-3 py-1 rounded-full text-base shrink-0">
                          {num}
                        </span>
                        <p className="text-gray-800 text-lg leading-relaxed pt-0.5">{content}</p>
                      </div>
                    );
                  }
                }
                // 建議句特殊處理（但排除已經是標題的）
                if (sentence.includes('建議') && !sentence.includes('【TITLE:')) {
                  return (
                    <div key={sentenceIdx} className="flex items-start gap-2 bg-sky-50 rounded-xl p-3 border-l-4 border-sky-200">
                      <span className="text-sky-400 mt-0.5">💡</span>
                      <p className="text-sky-500 text-lg">{sentence}</p>
                    </div>
                  );
                }
                // 一般句子
                return (
                  <p key={sentenceIdx} className="text-gray-700 text-lg leading-relaxed pl-2 border-l-2 border-gray-200">
                    {sentence}
                  </p>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 修練口訣 - 柔和馬卡龍風格 */}
      <div className="bg-gradient-to-r from-violet-50 via-purple-50 to-fuchsia-50 rounded-2xl p-5 text-center mt-6 border border-violet-100">
        <p className="text-violet-400 text-lg font-medium">
          🌈 修練口訣：知命不認命，順勢而為，逆境修心 ✨
        </p>
      </div>
    </div>
  );
}

interface AnalysisPanelProps {
  analysis: ChartAnalysisResult | null;
  isLoading: boolean;
  error?: string | null;
  originPalace?: { branch: string; palace: string };
  astrolabeData?: AstrolabeData | null;
  userName?: string;
}

// 四化資訊
interface SihuaInfo {
  type: '祿' | '權' | '科' | '忌';
  star: string;
  palace: string;
  color: string;
  bgColor: string;
}

// 從命盤資料中提取四化
function extractSihua(astrolabeData: AstrolabeData): SihuaInfo[] {
  const sihuaList: SihuaInfo[] = [];
  const colorMap = {
    '祿': { color: 'text-green-700', bgColor: 'bg-green-50' },
    '權': { color: 'text-red-700', bgColor: 'bg-red-50' },
    '科': { color: 'text-blue-700', bgColor: 'bg-blue-50' },
    '忌': { color: 'text-purple-700', bgColor: 'bg-purple-50' },
  };

  for (const palace of astrolabeData.palaces) {
    for (const star of [...palace.majorStars, ...palace.minorStars]) {
      if (star.mutagen && ['祿', '權', '科', '忌'].includes(star.mutagen)) {
        const type = star.mutagen as '祿' | '權' | '科' | '忌';
        sihuaList.push({
          type,
          star: star.name,
          palace: palace.name,
          ...colorMap[type],
        });
      }
    }
  }

  const order = ['祿', '權', '科', '忌'];
  sihuaList.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  return sihuaList;
}

// 渲染分析內容列表
function AnalysisList({ items, emptyText = '暫無資料' }: { items?: string[]; emptyText?: string }) {
  if (!items || items.length === 0) {
    return <p className="text-gray-500 italic text-lg">{emptyText}</p>;
  }
  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="bg-gray-50 rounded-lg p-5 text-gray-800 leading-relaxed text-lg">
          {item}
        </div>
      ))}
    </div>
  );
}

// Loading skeleton
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

// Empty state
function EmptyState() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
      <div className="text-5xl mb-4 opacity-30">📜</div>
      <h3 className="text-xl font-medium text-gray-600 mb-2">命盤批命</h3>
      <p className="text-gray-500">排盤後將顯示詳細批命結果</p>
    </div>
  );
}

// 可展開的區塊組件
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  headerColor = 'bg-gray-100',
  titleColor = 'text-gray-800'
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  headerColor?: string;
  titleColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'w-full px-6 py-5 flex items-center justify-between text-left transition-colors',
          headerColor,
          'hover:brightness-95'
        )}
      >
        <h3 className={clsx('text-xl font-bold flex items-center gap-3', titleColor)}>
          <span className="text-2xl">{icon}</span>
          {title}
        </h3>
        <span className="text-gray-500 text-2xl">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="p-6 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

// 1. 總盤解析
function OverallAnalysisSection({
  astrolabeData,
  sihuaList
}: {
  astrolabeData: AstrolabeData;
  sihuaList: SihuaInfo[];
}) {
  // 找出命宮主星
  const soulPalace = astrolabeData.palaces.find(p => p.isSoulPalace);
  const mainStars = soulPalace?.majorStars.map(s => s.name).join('、') || '無主星';

  // 找出身宮
  const bodyPalace = astrolabeData.palaces.find(p => p.isBodyPalace);

  return (
    <div className="space-y-5 text-lg leading-relaxed">
      <div className="bg-amber-50 rounded-lg p-5">
        <h4 className="font-bold text-amber-800 mb-3 text-xl">命盤基本格局</h4>
        <ul className="space-y-3 text-gray-800 text-lg">
          <li>• <strong>命宮主星：</strong>{mainStars}</li>
          <li>• <strong>命宮位置：</strong>{soulPalace?.name}（{soulPalace?.earthlyBranch}宮）</li>
          <li>• <strong>身宮位置：</strong>{bodyPalace?.name}（{bodyPalace?.earthlyBranch}宮）</li>
          <li>• <strong>五行局：</strong>{astrolabeData.fiveElementsClass}</li>
          <li>• <strong>命主星：</strong>{astrolabeData.soulStar}</li>
          <li>• <strong>身主星：</strong>{astrolabeData.bodyStar}</li>
        </ul>
      </div>

      <div className="bg-purple-50 rounded-lg p-5">
        <h4 className="font-bold text-purple-800 mb-3 text-xl">本命四化</h4>
        <div className="grid grid-cols-2 gap-4">
          {sihuaList.map((sihua, idx) => (
            <div key={idx} className={clsx('rounded-lg p-4', sihua.bgColor)}>
              <span className={clsx('font-bold text-xl', sihua.color)}>化{sihua.type}</span>
              <span className="text-gray-700 ml-2 text-lg">{sihua.star}</span>
              <span className="text-gray-500 text-base ml-1">在{sihua.palace}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 2. 各宮位解析
function PalaceAnalysisSection({
  palaces,
  originPalace
}: {
  palaces: PalaceData[];
  originPalace?: { branch: string; palace: string };
}) {
  const palaceOrder = ['命宮', '兄弟宮', '夫妻宮', '子女宮', '財帛宮', '疾厄宮',
                       '遷移宮', '交友宮', '官祿宮', '田宅宮', '福德宮', '父母宮'];

  const sortedPalaces = [...palaces].sort((a, b) =>
    palaceOrder.indexOf(a.name) - palaceOrder.indexOf(b.name)
  );

  // 宮位解讀（簡化版，實際應該從後端獲取更詳細的解讀）
  const getPalaceMeaning = (palace: PalaceData) => {
    const meanings: Record<string, string> = {
      '命宮': '代表自己的個性、長相、才華與一生整體運勢',
      '兄弟宮': '代表兄弟姊妹關係、合作夥伴、手足緣分',
      '夫妻宮': '代表婚姻感情、配偶條件、夫妻相處',
      '子女宮': '代表子女緣分、生育運、與晚輩關係',
      '財帛宮': '代表財運、賺錢能力、理財方式',
      '疾厄宮': '代表健康狀況、身體弱點、災厄',
      '遷移宮': '代表外出運、出國運、在外發展',
      '交友宮': '代表朋友關係、人際關係、部屬',
      '官祿宮': '代表事業運、工作能力、社會地位',
      '田宅宮': '代表不動產運、家庭環境、祖業',
      '福德宮': '代表精神生活、福氣、內心世界',
      '父母宮': '代表與父母關係、長輩緣、遺傳',
    };
    return meanings[palace.name] || '';
  };

  return (
    <div className="space-y-4">
      {sortedPalaces.map((palace) => {
        const isOrigin = originPalace && palace.earthlyBranch === originPalace.branch;

        return (
          <div
            key={palace.name}
            className={clsx(
              'rounded-xl overflow-hidden border-2',
              palace.isSoulPalace ? 'border-red-400' :
              palace.isBodyPalace ? 'border-blue-400' :
              isOrigin ? 'border-yellow-400' :
              'border-gray-300'
            )}
          >
            {/* 宮位標題區 - 獨立顯眼區塊 */}
            <div className={clsx(
              'px-5 py-4 flex items-center justify-between',
              palace.isSoulPalace ? 'bg-red-500' :
              palace.isBodyPalace ? 'bg-blue-500' :
              isOrigin ? 'bg-yellow-500' :
              'bg-gray-700'
            )}>
              <div className="flex items-center gap-3">
                <span className="font-bold text-2xl text-white">
                  {palace.name}
                </span>
                {palace.isSoulPalace && <span className="text-sm bg-white text-red-600 px-3 py-1 rounded-full font-bold">命</span>}
                {palace.isBodyPalace && <span className="text-sm bg-white text-blue-600 px-3 py-1 rounded-full font-bold">身</span>}
                {isOrigin && <span className="text-sm bg-white text-yellow-600 px-3 py-1 rounded-full font-bold">因</span>}
              </div>
              <span className="text-xl text-white font-bold">
                {palace.heavenlyStem}{palace.earthlyBranch}
              </span>
            </div>

            {/* 內容區 */}
            <div className={clsx(
              'p-5',
              palace.isSoulPalace ? 'bg-red-50' :
              palace.isBodyPalace ? 'bg-blue-50' :
              isOrigin ? 'bg-yellow-50' :
              'bg-gray-50'
            )}>
              <p className="text-base text-gray-600 mb-4">{getPalaceMeaning(palace)}</p>

              {/* 主星 */}
              <div className="mb-3">
                <span className="text-base font-bold text-gray-700">主星：</span>
                {palace.majorStars.length > 0 ? (
                  <span className="ml-2">
                    {palace.majorStars.map((star, idx) => (
                      <span key={idx} className="inline-flex items-center mr-3 text-lg">
                        <span className="font-semibold text-gray-800">{star.name}</span>
                        {star.brightness && <span className="text-sm text-gray-500 ml-1">({star.brightness})</span>}
                        {star.mutagen && (
                          <span className={clsx(
                            'text-base font-bold ml-1 px-1.5 py-0.5 rounded border',
                            star.mutagen === '祿' ? 'bg-green-100 border-green-400 text-green-700' :
                            star.mutagen === '權' ? 'bg-red-100 border-red-400 text-red-700' :
                            star.mutagen === '科' ? 'bg-blue-100 border-blue-400 text-blue-700' :
                            'bg-purple-100 border-purple-400 text-purple-700'
                          )}>
                            {star.mutagen}
                          </span>
                        )}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="ml-2 text-gray-400 text-lg">無主星（借對宮）</span>
                )}
              </div>

              {/* 輔星 */}
              {palace.minorStars.length > 0 && (
                <div>
                  <span className="text-base font-bold text-gray-700">輔星：</span>
                  <span className="ml-2 text-base text-gray-700">
                    {palace.minorStars.map((star, idx) => (
                      <span key={idx} className="mr-3">
                        {star.name}
                        {star.mutagen && (
                          <span className={clsx(
                            'font-bold ml-1 px-1.5 py-0.5 rounded border text-sm',
                            star.mutagen === '祿' ? 'bg-green-100 border-green-400 text-green-700' :
                            star.mutagen === '權' ? 'bg-red-100 border-red-400 text-red-700' :
                            star.mutagen === '科' ? 'bg-blue-100 border-blue-400 text-blue-700' :
                            'bg-purple-100 border-purple-400 text-purple-700'
                          )}>
                            {star.mutagen}
                          </span>
                        )}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3. 四化解析
function SihuaAnalysisSection({ sihuaList }: { sihuaList: SihuaInfo[] }) {
  const sihuaMeanings: Record<string, { title: string; meaning: string; headerBg: string }> = {
    '祿': {
      title: '化祿',
      meaning: '代表福氣、財運、享受。化祿所在的宮位是你這輩子容易獲得收穫的領域。',
      headerBg: 'bg-green-600'
    },
    '權': {
      title: '化權',
      meaning: '代表權力、掌控力、執行力。化權所在的宮位是你這輩子能夠掌握主導權的領域。',
      headerBg: 'bg-red-600'
    },
    '科': {
      title: '化科',
      meaning: '代表名聲、貴人、學業。化科所在的宮位是你這輩子容易獲得好名聲或貴人相助的領域。',
      headerBg: 'bg-blue-600'
    },
    '忌': {
      title: '化忌',
      meaning: '代表執著、障礙、業力。化忌所在的宮位是你這輩子需要努力克服的課題。',
      headerBg: 'bg-purple-600'
    },
  };

  const sihuaBorderColors: Record<string, string> = {
    '祿': 'border-green-400',
    '權': 'border-red-400',
    '科': 'border-blue-400',
    '忌': 'border-purple-400',
  };

  return (
    <div className="space-y-4">
      {sihuaList.map((sihua, idx) => (
        <div key={idx} className={clsx('rounded-xl overflow-hidden border-2', sihuaBorderColors[sihua.type])}>
          {/* 標題區 */}
          <div className={clsx('px-5 py-4 flex items-center justify-between', sihuaMeanings[sihua.type]?.headerBg)}>
            <span className="font-bold text-2xl text-white">
              {sihuaMeanings[sihua.type]?.title}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xl text-white font-bold">{sihua.star}</span>
              <span className="text-lg text-white/80">在</span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-white font-bold text-lg">{sihua.palace}</span>
            </div>
          </div>

          {/* 內容區 */}
          <div className={clsx('p-5', sihua.bgColor)}>
            <p className="text-lg text-gray-700 mb-4">{sihuaMeanings[sihua.type]?.meaning}</p>
            <div className="bg-white/60 rounded-lg p-4">
              <p className="text-lg text-gray-700">
                {sihua.type === '祿' && `${sihua.palace}是你的福氣所在，在這個領域容易獲得好運與收穫。`}
                {sihua.type === '權' && `${sihua.palace}是你的權力所在，在這個領域你有主導權與決策力。`}
                {sihua.type === '科' && `${sihua.palace}是你的貴人所在，在這個領域容易得到幫助與好名聲。`}
                {sihua.type === '忌' && `${sihua.palace}是你的功課所在，在這個領域需要特別注意與努力。`}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 4. 大運解析 (簡化版 - 需要更複雜的計算)
function MajorFortuneSection({ astrolabeData }: { astrolabeData: AstrolabeData }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden border-2 border-indigo-300">
        <div className="bg-indigo-600 px-5 py-4">
          <span className="font-bold text-2xl text-white">五行局：{astrolabeData.fiveElementsClass}</span>
        </div>
        <div className="bg-indigo-50 p-5">
          <p className="text-lg text-gray-700">
            大運（大限）是紫微斗數中重要的時間概念，每個大限為十年。
            根據你的五行局，可以推算各大限的運勢。
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
        <h4 className="font-bold text-xl text-gray-800 mb-4">大運看法重點</h4>
        <ul className="space-y-3 text-lg text-gray-700">
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>大限命宮的星曜組合決定該十年的整體運勢</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>大限四化會影響該時期的吉凶</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>大限宮位與本命宮位的互動關係</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-600 font-bold">•</span>
            <span>流年、流月可以更細緻地看短期運勢</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// 5. 適合工作類型
function CareerSection({ astrolabeData }: { astrolabeData: AstrolabeData }) {
  const soulPalace = astrolabeData.palaces.find(p => p.isSoulPalace);
  const careerPalace = astrolabeData.palaces.find(p => p.name === '官祿宮');
  const wealthPalace = astrolabeData.palaces.find(p => p.name === '財帛宮');

  // 根據命宮主星給出職業建議
  const getCareerSuggestions = () => {
    const mainStars = soulPalace?.majorStars.map(s => s.name) || [];
    const suggestions: string[] = [];

    if (mainStars.some(s => s.includes('紫微'))) {
      suggestions.push('領導管理、企業主、高階主管、政府官員');
    }
    if (mainStars.some(s => s.includes('天機'))) {
      suggestions.push('策劃顧問、分析師、工程師、研發人員');
    }
    if (mainStars.some(s => s.includes('太陽'))) {
      suggestions.push('公職人員、教育工作、媒體傳播、公益事業');
    }
    if (mainStars.some(s => s.includes('武曲'))) {
      suggestions.push('金融財務、銀行業、會計師、投資理財');
    }
    if (mainStars.some(s => s.includes('天同'))) {
      suggestions.push('服務業、餐飲業、社工、心理諮商');
    }
    if (mainStars.some(s => s.includes('廉貞'))) {
      suggestions.push('法律相關、政治、公關、談判專家');
    }
    if (mainStars.some(s => s.includes('天府'))) {
      suggestions.push('財務管理、銀行業、保險業、資產管理');
    }
    if (mainStars.some(s => s.includes('太陰'))) {
      suggestions.push('不動產、室內設計、藝術創作、夜間工作');
    }
    if (mainStars.some(s => s.includes('貪狼'))) {
      suggestions.push('業務銷售、演藝娛樂、公關行銷、美容時尚');
    }
    if (mainStars.some(s => s.includes('巨門'))) {
      suggestions.push('律師、教師、演說家、命理師、醫生');
    }
    if (mainStars.some(s => s.includes('天相'))) {
      suggestions.push('秘書助理、人資管理、公關協調、服務業');
    }
    if (mainStars.some(s => s.includes('天梁'))) {
      suggestions.push('醫療保健、社會服務、宗教、教育');
    }
    if (mainStars.some(s => s.includes('七殺'))) {
      suggestions.push('軍警消防、運動員、開創型創業、冒險性工作');
    }
    if (mainStars.some(s => s.includes('破軍'))) {
      suggestions.push('變革創新、拆除重建、投機買賣、自由業');
    }

    return suggestions.length > 0 ? suggestions : ['需綜合分析命宮與官祿宮的星曜組合'];
  };

  return (
    <div className="space-y-5">
      {/* 命宮主星分析 */}
      <div className="rounded-xl overflow-hidden border-2 border-blue-300">
        <div className="bg-blue-600 px-5 py-4">
          <span className="font-bold text-2xl text-white">命宮主星適合職業</span>
        </div>
        <div className="bg-blue-50 p-5">
          <div className="space-y-3">
            {getCareerSuggestions().map((suggestion, idx) => (
              <p key={idx} className="text-lg text-gray-700 flex gap-3">
                <span className="text-blue-600 font-bold">•</span>
                <span>{suggestion}</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* 官祿宮分析 */}
      <div className="rounded-xl overflow-hidden border-2 border-green-300">
        <div className="bg-green-600 px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-2xl text-white">官祿宮</span>
          <span className="bg-white/20 px-4 py-1 rounded-full text-white font-bold text-lg">
            {careerPalace?.majorStars.map(s => s.name).join('、') || '無主星'}
          </span>
        </div>
        <div className="bg-green-50 p-5">
          <p className="text-lg text-gray-700">
            官祿宮代表你的事業運和工作態度，是判斷職業方向的重要宮位。
          </p>
        </div>
      </div>

      {/* 財帛宮分析 */}
      <div className="rounded-xl overflow-hidden border-2 border-amber-300">
        <div className="bg-amber-500 px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-2xl text-white">財帛宮</span>
          <span className="bg-white/20 px-4 py-1 rounded-full text-white font-bold text-lg">
            {wealthPalace?.majorStars.map(s => s.name).join('、') || '無主星'}
          </span>
        </div>
        <div className="bg-amber-50 p-5">
          <p className="text-lg text-gray-700">
            財帛宮代表你的財運和賺錢方式，與職業選擇息息相關。
          </p>
        </div>
      </div>
    </div>
  );
}

// 6. 個性&自我修練心法
function PersonalityCultivationSection({ astrolabeData }: { astrolabeData: AstrolabeData }) {
  const soulPalace = astrolabeData.palaces.find(p => p.isSoulPalace);
  const mainStars = soulPalace?.majorStars || [];

  // 根據命宮主星給出性格分析和修練建議
  const getPersonalityAnalysis = () => {
    const analyses: { trait: string; cultivation: string }[] = [];

    for (const star of mainStars) {
      if (star.name.includes('紫微')) {
        analyses.push({
          trait: '【紫微星性格】天生具有領導氣質，自尊心強，不喜歡被人指揮。有帝王般的氣度，但也容易顯得高傲。',
          cultivation: '【修練心法】學習放下身段，傾聽他人意見。真正的領導者懂得授權與信任。培養謙虛的心態，不要凡事都要自己扛。'
        });
      }
      if (star.name.includes('天機')) {
        analyses.push({
          trait: '【天機星性格】聰明機智，思維敏捷，善於分析。但容易想太多，有時會猶豫不決。',
          cultivation: '【修練心法】學習果斷決策，不要過度分析。信任自己的直覺，該行動時就行動。培養定力，減少胡思亂想。'
        });
      }
      if (star.name.includes('太陽')) {
        analyses.push({
          trait: '【太陽星性格】熱情開朗，樂於助人，有正義感。但容易過度付出，忽略自己的需求。',
          cultivation: '【修練心法】學習適度付出，照顧好自己才能照顧別人。不要當濫好人，學會說不。保持熱情但要有界限。'
        });
      }
      if (star.name.includes('武曲')) {
        analyses.push({
          trait: '【武曲星性格】剛毅果斷，重視實際，有財運頭腦。但容易過於嚴肅，缺乏柔軟度。',
          cultivation: '【修練心法】學習柔軟處事，不要太過強硬。錢財重要但不是一切，培養興趣愛好，豐富生活。'
        });
      }
      if (star.name.includes('天同')) {
        analyses.push({
          trait: '【天同星性格】溫和善良，隨和好相處，喜歡享受生活。但容易懶散，缺乏進取心。',
          cultivation: '【修練心法】培養積極進取的態度，不要太安逸。設定目標並努力達成，享受生活也要有所成就。'
        });
      }
      if (star.name.includes('廉貞')) {
        analyses.push({
          trait: '【廉貞星性格】精明能幹，有企圖心，善於交際。但容易固執己見，有時顯得強勢。',
          cultivation: '【修練心法】學習接納不同意見，不要太堅持己見。處事圓融，不要樹敵太多。修練心性，減少物慾。'
        });
      }
      if (star.name.includes('天府')) {
        analyses.push({
          trait: '【天府星性格】穩重大方，有包容心，善於理財。但容易保守，不願冒險。',
          cultivation: '【修練心法】適度嘗試新事物，不要太過保守。保持開放心態，學習新知識新技能。'
        });
      }
      if (star.name.includes('太陰')) {
        analyses.push({
          trait: '【太陰星性格】細膩敏感，富有藝術氣質，重視家庭。但容易多愁善感，情緒起伏大。',
          cultivation: '【修練心法】培養情緒管理能力，不要太過敏感。多曬太陽，保持樂觀心態。發揮藝術天分，找到情感出口。'
        });
      }
      if (star.name.includes('貪狼')) {
        analyses.push({
          trait: '【貪狼星性格】多才多藝，交際能力強，追求享受。但容易貪心不足，慾望較重。',
          cultivation: '【修練心法】學習知足常樂，減少不必要的慾望。專注在真正重要的事情上，不要太過分心。'
        });
      }
      if (star.name.includes('巨門')) {
        analyses.push({
          trait: '【巨門星性格】口才好，有分析能力，善於發現問題。但容易多疑，有時言語傷人。',
          cultivation: '【修練心法】說話前三思，不要太過直接。培養信任感，不要過度懷疑。把口才用在正面的地方。'
        });
      }
      if (star.name.includes('天相')) {
        analyses.push({
          trait: '【天相星性格】重視形象，人緣好，善於協調。但容易優柔寡斷，過度在意別人看法。',
          cultivation: '【修練心法】培養獨立思考能力，不要太在意他人眼光。做自己，不要為了討好別人而失去自我。'
        });
      }
      if (star.name.includes('天梁')) {
        analyses.push({
          trait: '【天梁星性格】有正義感，樂於助人，能化解災厄。但容易管太多，有時顯得嘮叨。',
          cultivation: '【修練心法】學習適可而止，不要過度干涉他人。幫助別人也要尊重對方的選擇。修練慈悲心。'
        });
      }
      if (star.name.includes('七殺')) {
        analyses.push({
          trait: '【七殺星性格】勇敢果斷，有開創精神，不畏困難。但容易衝動，有時過於強勢。',
          cultivation: '【修練心法】三思而後行，不要太衝動。學習耐心等待，不是所有事情都要馬上解決。收斂鋒芒，以和為貴。'
        });
      }
      if (star.name.includes('破軍')) {
        analyses.push({
          trait: '【破軍星性格】勇於變革，不滿現狀，追求突破。但容易破壞多於建設，難以持久。',
          cultivation: '【修練心法】學習堅持到底，不要輕易放棄。破壞之後要懂得建設。培養耐心，不要急於求成。'
        });
      }
    }

    return analyses.length > 0 ? analyses : [{
      trait: '【無主星】命宮無主星，需借對宮主星來看。性格較為複雜多變。',
      cultivation: '【修練心法】培養穩定的核心價值觀，不要隨波逐流。找到自己的人生方向。'
    }];
  };

  return (
    <div className="space-y-5">
      {getPersonalityAnalysis().map((analysis, idx) => (
        <div key={idx} className="rounded-xl overflow-hidden border-2 border-gray-300">
          {/* 性格分析 */}
          <div className="bg-rose-600 px-5 py-3">
            <span className="font-bold text-xl text-white">性格特質</span>
          </div>
          <div className="bg-rose-50 p-5">
            <p className="text-lg text-gray-800 leading-relaxed">{analysis.trait}</p>
          </div>

          {/* 修練心法 */}
          <div className="bg-teal-600 px-5 py-3">
            <span className="font-bold text-xl text-white">修練心法</span>
          </div>
          <div className="bg-teal-50 p-5">
            <p className="text-lg text-gray-800 leading-relaxed">{analysis.cultivation}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// 來因宮解析 - 根據倪師教導
function OriginPalaceSection({ originPalace }: { originPalace: { branch: string; palace: string } }) {
  const originMeanings: Record<string, string> = {
    '命宮': '【自立格】凡事靠自己，操縱命運好壞。一切從自身出發，成敗皆由己。',
    '兄弟宮': '重視手足、媽媽、社交，與人緣、借貸有關。人際網絡是人生重要資源。',
    '夫妻宮': '注重感情、婚姻、人情，桃花多，受配偶影響深遠。另一半是人生關鍵。',
    '子女宮': '重視子女、合夥、桃花，帶驛馬，多應酬。與晚輩緣分深厚。',
    '財帛宮': '【自立格】為錢財辛勞，重視務實面。理財能力決定人生高度。',
    '疾厄宮': '【勞動格】重執行，事必躬親，需注意健康。身體是革命的本錢。',
    '遷移宮': '重視出外、社交、驛馬，常在外奔波。外出發展有貴人相助。',
    '交友宮': '靠眾生、朋友緣，需廣結善緣。人脈即錢脈，貴人運旺。',
    '官祿宮': '【工作型】事業心重，自立格。工作成就是人生價值所在。',
    '田宅宮': '重視家庭、家族、置產，有祖蔭。不動產運與家庭運是人生重點。',
    '福德宮': '重視興趣、享樂、業力，因果觀念重。精神層面的修練是人生課題。',
    '父母宮': '重視親情、長輩、上司，得父母之蔭。與長輩關係影響運勢。',
  };

  return (
    <div className="rounded-xl overflow-hidden border-2 border-yellow-400">
      <div className="bg-yellow-500 px-5 py-4 flex items-center justify-between">
        <span className="font-bold text-2xl text-white">來因宮</span>
        <span className="bg-white/20 px-4 py-1 rounded-full text-white font-bold text-xl">
          {originPalace.palace}（{originPalace.branch}）
        </span>
      </div>
      <div className="bg-yellow-50 p-5">
        <p className="text-lg text-gray-700 leading-relaxed">
          {originMeanings[originPalace.palace] || '來因宮代表此生投胎的原因與人生課題。'}
        </p>
      </div>
    </div>
  );
}

export function AnalysisPanel({ analysis, isLoading, error, originPalace, astrolabeData, userName }: AnalysisPanelProps) {
  // AI 批命狀態 (Plan B - 結構化回應)
  const [aiResponse, setAiResponse] = useState<import('@/lib/api').AIReadingResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // 呼叫 AI 批命
  const handleAIReading = useCallback(async () => {
    if (!astrolabeData) return;

    setAiLoading(true);
    setAiError(null);

    // 準備請求資料
    const palacesDict: AIReadingRequest['palaces'] = {};
    for (const palace of astrolabeData.palaces) {
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

    const request: AIReadingRequest = {
      palaces: palacesDict,
      gender: astrolabeData.gender,
      age: astrolabeData.age || 30,
      origin_palace: originPalace,
      current_decadal: astrolabeData.currentDecadal,
      current_yearly: astrolabeData.currentYearly,
      five_elements_class: astrolabeData.fiveElementsClass,
      soul_star: astrolabeData.soulStar,
      body_star: astrolabeData.bodyStar,
    };

    try {
      const result = await getAIReading(request);
      if (result.success) {
        setAiResponse(result);  // 儲存完整回應
      } else {
        setAiError(result.error || 'AI 分析失敗');
      }
    } catch (err) {
      setAiError('呼叫 AI 時發生錯誤');
    } finally {
      setAiLoading(false);
    }
  }, [astrolabeData, originPalace]);

  // 下載 PDF 狀態
  const [pdfLoading, setPdfLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // 下載 AI 批命報告 (PDF)
  const handleDownload = useCallback(async () => {
    if (!aiResponse || !astrolabeData) return;

    setPdfLoading(true);

    try {
      // 格式化文字內容 - 處理分段、編號等（字體放大 1.5 倍）- 柔和馬卡龍配色
      const formatPdfContent = (text: string): string => {
        if (!text) return '';

        // 先按照邏輯分段
        let result = text
          // 移除 ## 和其他標記符號
          .replace(/##/g, '')
          .replace(/\[\[.*?\]\]/g, '')
          // 四化分段 - 柔和馬卡龍顏色
          .replace(/化祿在/g, '<br/><br/><strong style="color: #6ee7b7; font-size: 24px;">🌸 化祿</strong><br/>化祿在')
          .replace(/化權在/g, '<br/><br/><strong style="color: #fda4af; font-size: 24px;">🌺 化權</strong><br/>化權在')
          .replace(/化科在/g, '<br/><br/><strong style="color: #7dd3fc; font-size: 24px;">🦋 化科</strong><br/>化科在')
          .replace(/化忌在/g, '<br/><br/><strong style="color: #c4b5fd; font-size: 24px;">🔮 化忌</strong><br/>化忌在')
          // 流年分類 - 柔和馬卡龍配色
          .replace(/(事業運方面)[，,]/g, '<div style="margin: 20px 0; padding: 15px; background: #f0f9ff; border-left: 5px solid #7dd3fc; border-radius: 0 10px 10px 0;"><strong style="color: #7dd3fc; font-size: 24px;">💼 $1</strong><br/>')
          .replace(/(財運方面)[，,]/g, '</div><div style="margin: 20px 0; padding: 15px; background: #ecfdf5; border-left: 5px solid #6ee7b7; border-radius: 0 10px 10px 0;"><strong style="color: #6ee7b7; font-size: 24px;">💰 $1</strong><br/>')
          .replace(/(感情運方面)[，,]/g, '</div><div style="margin: 20px 0; padding: 15px; background: #fdf2f8; border-left: 5px solid #f9a8d4; border-radius: 0 10px 10px 0;"><strong style="color: #f9a8d4; font-size: 24px;">💕 $1</strong><br/>')
          .replace(/(健康方面)[，,]/g, '</div><div style="margin: 20px 0; padding: 15px; background: #fff1f2; border-left: 5px solid #fda4af; border-radius: 0 10px 10px 0;"><strong style="color: #fda4af; font-size: 24px;">🌷 $1</strong><br/>')
          // 小標題 - 柔和顏色
          .replace(/([\u4e00-\u9fa5]{2,8}(?:建議|分析|方面|重點))：/g,
            '<div style="margin: 15px 0 10px 0; font-weight: bold; color: #a5b4fc; font-size: 22px;">▸ $1：</div>')
          // 處理中文序號 - 柔和馬卡龍配色
          .replace(/([一二三四五六七八九十]+)、/g,
            '<div style="margin: 10px 0; padding: 10px 15px; background: #faf5ff; border-left: 4px solid #c4b5fd; border-radius: 0 8px 8px 0;"><strong style="color: #c4b5fd; font-size: 22px;">$1、</strong>')
          // 處理數字序號
          .replace(/(\d+)[\.、]/g,
            '<div style="margin: 10px 0; padding: 10px 15px; background: #faf5ff; border-left: 4px solid #c4b5fd; border-radius: 0 8px 8px 0;"><strong style="color: #c4b5fd; font-size: 22px;">$1.</strong> ')
          // 建議句子 - 柔和配色
          .replace(/。建議/g, '。</div><div style="margin: 12px 0; padding: 12px 15px; background: #f0f9ff; border-left: 5px solid #7dd3fc; border-radius: 0 8px 8px 0;"><strong style="color: #7dd3fc; font-size: 22px;">💡</strong> 建議')
          // 關閉段落標籤（在最後）
          + '</div>';

        // 清理多餘標籤
        result = result
          .replace(/<\/div><\/div>/g, '</div>')
          .replace(/^<\/div>/g, '')
          .replace(/<div[^>]*>\s*<\/div>/g, '');

        return result;
      };

      // 建立隱藏的報告 HTML 元素（字體放大）
      const reportDiv = document.createElement('div');
      reportDiv.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 1000px;
        padding: 50px;
        background: white;
        font-family: "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", sans-serif;
        font-size: 24px;
        line-height: 1.8;
        color: #1f2937;
      `;

      // 各區塊資料 - 柔和馬卡龍配色
      const sections = [
        { title: '🎀 總盤解析', content: aiResponse.overall_reading, color: '#f9a8d4', lightBg: '#fdf2f8' },
        { title: '🌟 來因宮解析', content: aiResponse.origin_palace_reading, color: '#fcd34d', lightBg: '#fefce8' },
        { title: '🎯 身宮解析', content: aiResponse.body_palace_reading, color: '#7dd3fc', lightBg: '#f0f9ff' },
        { title: '⭐ 四化解析', content: aiResponse.sihua_reading, color: '#c4b5fd', lightBg: '#f5f3ff' },
        { title: '🔮 大限解析（十年大運）', content: aiResponse.decadal_reading, color: '#a5b4fc', lightBg: '#eef2ff' },
        { title: '📅 流年解析', content: aiResponse.yearly_reading, color: '#67e8f9', lightBg: '#ecfeff' },
        { title: '💼 事業發展', content: aiResponse.career_reading, color: '#6ee7b7', lightBg: '#ecfdf5' },
        { title: '💕 感情婚姻', content: aiResponse.relationship_reading, color: '#fbcfe8', lightBg: '#fdf2f8' },
        { title: '🌷 健康分析', content: aiResponse.health_reading, color: '#fda4af', lightBg: '#fff1f2' },
        { title: '🦋 修練心法與建議', content: aiResponse.recommendations, color: '#99f6e4', lightBg: '#f0fdfa' },
      ];

      // 建立報告 HTML（字體放大 1.5 倍）- 柔和馬卡龍配色
      let html = `
        <div style="text-align: center; margin-bottom: 50px; border-bottom: 3px solid #f9a8d4; padding-bottom: 30px;">
          <h1 style="font-size: 48px; background: linear-gradient(135deg, #f9a8d4, #c4b5fd); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; font-weight: bold;">🌸 紫微斗數 AI 批命報告 ✨</h1>
          <p style="color: #f9a8d4; margin-top: 15px; font-size: 22px;">基於倪海廈老師紫微斗數理論</p>
        </div>

        <div style="background: linear-gradient(135deg, #fdf2f8, #fce7f3); border-radius: 20px; padding: 35px; margin-bottom: 40px; border: 2px solid #fbcfe8;">
          <h3 style="color: #ec4899; margin: 0 0 25px 0; font-size: 30px; font-weight: bold;">🎀 基本資料</h3>
          <table style="width: 100%; font-size: 22px;">
            <tr>
              <td style="padding: 12px 0; width: 50%;"><strong>陽曆：</strong>${astrolabeData.solarDate}</td>
              <td style="padding: 12px 0;"><strong>農曆：</strong>${astrolabeData.lunarDate}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0;"><strong>時辰：</strong>${astrolabeData.time}時 (${astrolabeData.timeRange})</td>
              <td style="padding: 12px 0;"><strong>性別：</strong>${astrolabeData.gender}　<strong>生肖：</strong>${astrolabeData.zodiac}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0;"><strong>五行局：</strong>${astrolabeData.fiveElementsClass}</td>
              <td style="padding: 12px 0;"><strong>命主：</strong>${astrolabeData.soulStar}　<strong>身主：</strong>${astrolabeData.bodyStar}</td>
            </tr>
            ${astrolabeData.age ? `<tr><td style="padding: 12px 0;"><strong>虛歲：</strong>${astrolabeData.age}</td><td style="padding: 12px 0;"><strong>實歲：</strong>${astrolabeData.realAge}</td></tr>` : ''}
          </table>
        </div>
      `;

      // 加入各區塊（字體放大 1.5 倍）
      for (const section of sections) {
        if (section.content) {
          const formattedContent = formatPdfContent(section.content);
          html += `
            <div style="margin-bottom: 40px; page-break-inside: avoid;">
              <div style="background: ${section.color}; color: white; padding: 18px 30px; border-radius: 16px 16px 0 0; font-size: 28px; font-weight: bold;">
                ${section.title}
              </div>
              <div style="background: ${section.lightBg}; border: 3px solid ${section.color}40; border-top: none; border-radius: 0 0 16px 16px; padding: 30px;">
                <div style="margin: 0; line-height: 1.8; font-size: 22px;">${formattedContent}</div>
              </div>
            </div>
          `;
        }
      }

      // 各宮位解析 - 每個宮位獨立一張卡片 - 柔和馬卡龍配色
      if (aiResponse.palace_readings && Object.keys(aiResponse.palace_readings).length > 0) {
        // 宮位顏色配置 - 柔和馬卡龍配色
        const palaceColors: Record<string, { header: string; bg: string; border: string }> = {
          '命宮': { header: '#fda4af', bg: '#fff1f2', border: '#fecdd3' },
          '兄弟宮': { header: '#fdba74', bg: '#fff7ed', border: '#fed7aa' },
          '夫妻宮': { header: '#f9a8d4', bg: '#fdf2f8', border: '#fbcfe8' },
          '子女宮': { header: '#c4b5fd', bg: '#faf5ff', border: '#e9d5ff' },
          '財帛宮': { header: '#6ee7b7', bg: '#ecfdf5', border: '#a7f3d0' },
          '疾厄宮': { header: '#fca5a5', bg: '#fef2f2', border: '#fecaca' },
          '遷移宮': { header: '#67e8f9', bg: '#ecfeff', border: '#a5f3fc' },
          '交友宮': { header: '#fcd34d', bg: '#fefce8', border: '#fef08a' },
          '官祿宮': { header: '#7dd3fc', bg: '#f0f9ff', border: '#bae6fd' },
          '田宅宮': { header: '#bef264', bg: '#f7fee7', border: '#d9f99d' },
          '福德宮': { header: '#c4b5fd', bg: '#f5f3ff', border: '#ddd6fe' },
          '父母宮': { header: '#99f6e4', bg: '#f0fdfa', border: '#a7f3d0' },
        };
        const defaultColor = { header: '#e2e8f0', bg: '#f8fafc', border: '#e2e8f0' };

        // 大標題（字體放大 1.5 倍）- 柔和馬卡龍配色
        html += `
          <div style="margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #f9a8d4, #c4b5fd); color: white; padding: 20px 35px; border-radius: 16px; font-size: 30px; font-weight: bold; text-align: center;">
              🏛️ 各宮位解析
            </div>
          </div>
        `;

        for (const [palaceName, reading] of Object.entries(aiResponse.palace_readings)) {
          const formattedReading = formatPdfContent(reading);
          const colors = palaceColors[palaceName] || defaultColor;
          html += `
            <div style="margin-bottom: 30px; border-radius: 16px; overflow: hidden; border: 3px solid ${colors.border};">
              <div style="background: ${colors.header}; color: white; padding: 15px 25px; font-size: 26px; font-weight: bold;">
                ◆ ${palaceName}
              </div>
              <div style="background: ${colors.bg}; padding: 25px; line-height: 1.8; font-size: 22px;">
                ${formattedReading}
              </div>
            </div>
          `;
        }
      }

      // 結尾（字體放大 1.5 倍）- 柔和馬卡龍配色
      html += `
        <div style="text-align: center; margin-top: 50px; padding-top: 30px; border-top: 2px solid #fbcfe8; color: #f9a8d4; font-size: 20px;">
          <p style="margin: 8px 0;">🌸 以上批命僅供參考，基於倪海廈老師之紫微斗數教學 🌸</p>
          <p style="margin: 8px 0;">報告產生時間：${new Date().toLocaleString('zh-TW')}</p>
        </div>
      `;

      reportDiv.innerHTML = html;
      document.body.appendChild(reportDiv);

      // PDF 參數
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 寬度 mm
      const pageHeight = 297; // A4 高度 mm
      const margin = 10; // 邊距 mm
      const contentWidth = pageWidth - margin * 2;
      const maxContentHeight = pageHeight - margin * 2;

      // 取得所有區塊元素
      const pdfSections = reportDiv.querySelectorAll(':scope > div');
      let currentY = margin;
      let isFirstPage = true;

      for (let i = 0; i < pdfSections.length; i++) {
        const pdfSection = pdfSections[i] as HTMLElement;

        // 將每個區塊轉換成 canvas
        const sectionCanvas = await html2canvas(pdfSection, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: 1000,
        });

        // 計算區塊在 PDF 中的高度
        const sectionImgHeight = (sectionCanvas.height * contentWidth) / sectionCanvas.width;

        // 計算當前頁面剩餘空間
        const remainingPageSpace = pageHeight - margin - currentY;

        // 如果區塊高度超過剩餘空間的 80%，直接換頁（避免區塊被切在不好的位置）
        if (!isFirstPage && sectionImgHeight > remainingPageSpace * 0.8 && sectionImgHeight <= maxContentHeight) {
          pdf.addPage();
          currentY = margin;
        }

        // 如果單個區塊超過一頁高度，需要分割
        if (sectionImgHeight > maxContentHeight) {
          // 如果當前頁剩餘空間不足 30%，先換頁再開始
          if (remainingPageSpace < maxContentHeight * 0.3) {
            pdf.addPage();
            currentY = margin;
          }

          // 大區塊需要分割處理
          let remainingHeight = sectionImgHeight;
          let sourceY = 0;

          while (remainingHeight > 0) {
            const availableHeight = pageHeight - margin - currentY;
            const heightToDraw = Math.min(remainingHeight, availableHeight);

            // 計算源圖片的裁切位置
            const sourceHeight = (heightToDraw / sectionImgHeight) * sectionCanvas.height;

            // 創建裁切後的 canvas
            const croppedCanvas = document.createElement('canvas');
            croppedCanvas.width = sectionCanvas.width;
            croppedCanvas.height = Math.ceil(sourceHeight);
            const ctx = croppedCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(
                sectionCanvas,
                0, sourceY, sectionCanvas.width, sourceHeight,
                0, 0, sectionCanvas.width, sourceHeight
              );
            }

            const croppedImgData = croppedCanvas.toDataURL('image/jpeg', 0.95);
            pdf.addImage(croppedImgData, 'JPEG', margin, currentY, contentWidth, heightToDraw);

            remainingHeight -= heightToDraw;
            sourceY += sourceHeight;
            currentY += heightToDraw;

            if (remainingHeight > 0) {
              pdf.addPage();
              currentY = margin;
            }
          }
        } else {
          // 正常大小的區塊
          const imgData = sectionCanvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', margin, currentY, contentWidth, sectionImgHeight);
          currentY += sectionImgHeight + 3; // 3mm 區塊間距
        }

        isFirstPage = false;
      }

      // 下載 PDF - 檔名格式：姓名-倪師斗數分析.pdf
      const fileName = userName ? `${userName}-倪師斗數分析.pdf` : `倪師斗數分析_${astrolabeData.solarDate?.replace(/\//g, '-') || 'report'}.pdf`;
      pdf.save(fileName);

      // 清理
      document.body.removeChild(reportDiv);
    } catch (err) {
      console.error('PDF 生成失敗:', err);
      alert('PDF 生成失敗，請稍後再試');
    } finally {
      setPdfLoading(false);
    }
  }, [aiResponse, astrolabeData]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

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

  if (!astrolabeData) {
    return <EmptyState />;
  }

  const sihuaList = extractSihua(astrolabeData);

  // 檢查是否有後端分析資料
  const hasBackendAnalysis = analysis && (
    (analysis.personality && analysis.personality.length > 0) ||
    (analysis.career && analysis.career.length > 0) ||
    (analysis.wealth && analysis.wealth.length > 0)
  );

  return (
    <div className="bg-gradient-to-br from-pink-50/50 via-white to-violet-50/50 rounded-2xl shadow-sm p-8 border border-pink-100/50">
      {/* Header - 柔和馬卡龍風格 */}
      <div className="border-b border-pink-100 pb-5 mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">🌸 命盤批命 ✨</h2>
        <p className="text-lg text-pink-300 mt-2">基於倪海廈老師紫微斗數理論</p>
      </div>

      <div className="space-y-4">
        {/* 1. 總盤解析 - 顯示基本資料 + AI 批命 */}
        <CollapsibleSection
          title="總盤解析"
          icon="🎀"
          defaultOpen={true}
          headerColor="bg-gradient-to-r from-amber-100 to-orange-100"
          titleColor="text-amber-600"
        >
          <OverallAnalysisSection astrolabeData={astrolabeData} sihuaList={sihuaList} />

          {/* AI 智慧批命區塊 - 柔和馬卡龍風格 */}
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
                  onClick={handleAIReading}
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

            {/* AI Loading - 柔和馬卡龍風格 */}
            {aiLoading && (
              <div className="bg-gradient-to-r from-pink-50 via-rose-50 to-violet-50 rounded-2xl p-8 text-center border border-pink-100">
                <div className="animate-spin w-12 h-12 border-4 border-pink-300 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-pink-400 text-xl">AI 正在閱讀講義、分析您的命盤... 🌸</p>
                <p className="text-pink-300 text-lg mt-2">這可能需要 10-20 秒 ✨</p>
              </div>
            )}

            {/* AI Error */}
            {aiError && !aiLoading && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <p className="text-red-700 font-bold text-lg">AI 分析失敗</p>
                <p className="text-red-600 text-base mt-2">{aiError}</p>
                <p className="text-red-500 text-sm mt-3">
                  提示：請確認後端已設定 ANTHROPIC_API_KEY
                </p>
              </div>
            )}

            {/* AI Reading Result - 總盤解析 - 柔和馬卡龍風格 */}
            {aiResponse?.overall_reading && !aiLoading && (
              <div className="bg-gradient-to-br from-amber-50/50 via-orange-50/50 to-rose-50/50 rounded-2xl p-6 border border-amber-100">
                <div className="prose prose-lg max-w-none leading-relaxed">
                  {formatAIText(aiResponse.overall_reading)}
                </div>
              </div>
            )}

            {/* 沒有 AI 結果時的提示 - 柔和馬卡龍風格 */}
            {!aiResponse && !aiLoading && !aiError && (
              <div className="bg-gradient-to-r from-pink-50/50 to-violet-50/50 rounded-2xl p-8 text-center border border-pink-100/50">
                <p className="text-xl text-pink-400">✨ 點擊「開始 AI 批命」，讓 AI 閱讀倪師講義後為您分析命盤</p>
                <p className="text-lg mt-2 text-pink-300">AI 會用算命師的口吻，結合您的大限流年給出建議 🌸</p>
                <p className="text-base mt-3 text-pink-200">（費用約 NT$5-7 / 次）</p>
              </div>
            )}
          </div>

        </CollapsibleSection>

        {/* 2. 來因宮解析 - 柔和馬卡龍風格 */}
        {aiResponse?.origin_palace_reading && (
          <CollapsibleSection
            title="來因宮解析"
            icon="🌟"
            headerColor="bg-gradient-to-r from-amber-50 to-yellow-50"
            titleColor="text-amber-500"
          >
            <div className="bg-gradient-to-r from-amber-50/50 to-yellow-50/50 rounded-2xl p-5 border border-amber-100 leading-relaxed">
              {formatAIText(aiResponse.origin_palace_reading)}
            </div>
          </CollapsibleSection>
        )}

        {/* 3. 身宮解析 - 柔和馬卡龍風格 */}
        {aiResponse?.body_palace_reading && (
          <CollapsibleSection
            title="身宮解析"
            icon="🎯"
            headerColor="bg-gradient-to-r from-sky-50 to-cyan-50"
            titleColor="text-sky-500"
          >
            <div className="bg-gradient-to-r from-sky-50/50 to-cyan-50/50 rounded-2xl p-5 border border-sky-100 leading-relaxed">
              {formatAIText(aiResponse.body_palace_reading)}
            </div>
          </CollapsibleSection>
        )}

        {/* 4. 各宮位解析 - 柔和馬卡龍風格 */}
        {aiResponse?.palace_readings && Object.keys(aiResponse.palace_readings).length > 0 && (
          <CollapsibleSection
            title="各宮位解析"
            icon="🏛️"
            headerColor="bg-gradient-to-r from-slate-50 to-gray-50"
            titleColor="text-slate-500"
          >
            <div className="space-y-4">
              {Object.entries(aiResponse.palace_readings).map(([palaceName, reading]) => {
                // 柔和馬卡龍配色 - 每個宮位不同顏色
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

        {/* 3. 四化解析 - 柔和馬卡龍風格 */}
        {aiResponse?.sihua_reading && (
          <CollapsibleSection
            title="四化解析"
            icon="⭐"
            headerColor="bg-gradient-to-r from-violet-50 to-purple-50"
            titleColor="text-violet-400"
          >
            <div className="bg-gradient-to-r from-violet-50/50 to-pink-50/50 rounded-2xl p-5 border border-violet-100 leading-relaxed">
              {formatAIText(aiResponse.sihua_reading)}
            </div>
          </CollapsibleSection>
        )}

        {/* 4. 大限解析 - 柔和馬卡龍風格 */}
        {aiResponse?.decadal_reading && (
          <CollapsibleSection
            title="大限解析"
            icon="🔮"
            headerColor="bg-gradient-to-r from-indigo-50 to-blue-50"
            titleColor="text-indigo-400"
          >
            <div className="bg-gradient-to-r from-indigo-50/50 to-blue-50/50 rounded-2xl p-5 border border-indigo-100 leading-relaxed">
              {formatAIText(aiResponse.decadal_reading)}
            </div>
          </CollapsibleSection>
        )}

        {/* 5. 流年解析 - 柔和馬卡龍風格 */}
        {aiResponse?.yearly_reading && (
          <CollapsibleSection
            title="流年解析"
            icon="📅"
            headerColor="bg-gradient-to-r from-cyan-50 to-teal-50"
            titleColor="text-cyan-400"
          >
            <div className="bg-gradient-to-r from-cyan-50/50 to-teal-50/50 rounded-2xl p-5 border border-cyan-100 leading-relaxed">
              {formatAIText(aiResponse.yearly_reading)}
            </div>
          </CollapsibleSection>
        )}

        {/* 6. 適合工作類型 - 柔和馬卡龍風格 */}
        {aiResponse?.career_reading && (
          <CollapsibleSection
            title="適合工作類型"
            icon="💼"
            headerColor="bg-gradient-to-r from-emerald-50 to-green-50"
            titleColor="text-emerald-400"
          >
            <div className="bg-gradient-to-r from-emerald-50/50 to-green-50/50 rounded-2xl p-5 border border-emerald-100 leading-relaxed">
              {formatAIText(aiResponse.career_reading)}
            </div>
          </CollapsibleSection>
        )}

        {/* 7. 感情婚姻 - 柔和馬卡龍風格 */}
        {aiResponse?.relationship_reading && (
          <CollapsibleSection
            title="感情婚姻"
            icon="💕"
            headerColor="bg-gradient-to-r from-pink-50 to-rose-50"
            titleColor="text-pink-400"
          >
            <div className="bg-gradient-to-r from-pink-50/50 to-rose-50/50 rounded-2xl p-5 border border-pink-100 leading-relaxed">
              {formatAIText(aiResponse.relationship_reading)}
            </div>
          </CollapsibleSection>
        )}

        {/* 8. 健康分析 - 柔和馬卡龍風格 */}
        {aiResponse?.health_reading && (
          <CollapsibleSection
            title="健康分析"
            icon="🏥"
            headerColor="bg-gradient-to-r from-rose-50 to-orange-50"
            titleColor="text-rose-400"
          >
            <div className="bg-gradient-to-r from-rose-50/50 to-orange-50/50 rounded-2xl p-5 border border-rose-100 leading-relaxed">
              {formatAIText(aiResponse.health_reading)}
            </div>
          </CollapsibleSection>
        )}

        {/* 9. 修練心法與建議 - 柔和馬卡龍風格 */}
        {aiResponse?.recommendations && (
          <CollapsibleSection
            title="修練心法與建議"
            icon="🧘"
            headerColor="bg-gradient-to-r from-teal-50 to-emerald-50"
            titleColor="text-teal-400"
          >
            {formatCultivationText(aiResponse.recommendations)}
          </CollapsibleSection>
        )}
      </div>

      {/* Footer - 柔和馬卡龍風格 */}
      <div className="mt-10 pt-6 border-t border-pink-100">
        <p className="text-base text-pink-300 text-center">
          以上批命僅供參考，基於倪海廈老師之紫微斗數教學 🌸
        </p>
      </div>
    </div>
  );
}

export default AnalysisPanel;
