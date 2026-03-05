import React from 'react';

// 格式化 AI 回傳的文字，自動加入換行和段落
export function formatAIText(text: string): React.ReactNode {
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
export function formatCultivationText(text: string): React.ReactNode {
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

  type CategoryInfo = typeof categoryKeywords[string];

  // 分組句子
  const groups: { category: CategoryInfo | null; sentences: string[] }[] = [];
  let currentGroup: { category: CategoryInfo | null; sentences: string[] } = { category: null, sentences: [] };

  for (const sentence of sentences) {
    // 找出分類
    let foundCategory: CategoryInfo | null = null;
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
