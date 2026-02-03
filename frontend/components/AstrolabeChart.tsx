'use client';

import { useState } from 'react';
import { AstrolabeData, PalaceData, StarData } from '@/lib/astrolabe';
import { clsx } from 'clsx';

interface AstrolabeChartProps {
  data: AstrolabeData;
  name?: string;
  originPalace?: { branch: string; palace: string };
}

// Position mapping for 4x4 grid layout (星星學子 layout - 巳在左上角)
const PALACE_POSITIONS: Record<string, { row: number; col: number }> = {
  '巳': { row: 0, col: 0 },
  '午': { row: 0, col: 1 },
  '未': { row: 0, col: 2 },
  '申': { row: 0, col: 3 },
  '酉': { row: 1, col: 3 },
  '戌': { row: 2, col: 3 },
  '亥': { row: 3, col: 3 },
  '子': { row: 3, col: 2 },
  '丑': { row: 3, col: 1 },
  '寅': { row: 3, col: 0 },
  '卯': { row: 2, col: 0 },
  '辰': { row: 1, col: 0 },
};

// 三方四正計算 - 根據地支計算
const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function getSanfangSizheng(branch: string): string[] {
  const idx = EARTHLY_BRANCHES.indexOf(branch);
  if (idx === -1) return [];

  // 本宮
  const self = branch;
  // 對宮 (對面6位)
  const opposite = EARTHLY_BRANCHES[(idx + 6) % 12];
  // 三合宮 (左右各4位)
  const trineLeft = EARTHLY_BRANCHES[(idx + 4) % 12];
  const trineRight = EARTHLY_BRANCHES[(idx + 8) % 12];

  return [self, opposite, trineLeft, trineRight];
}

// 星曜顏色分類
function getStarColor(starName: string, starType?: string): string {
  if (['紫微', '天府', '天相', '天梁'].some(s => starName.includes(s))) {
    return 'text-purple-700';
  }
  if (['天機', '天同', '太陰'].some(s => starName.includes(s))) {
    return 'text-green-700';
  }
  if (['太陽', '武曲', '廉貞'].some(s => starName.includes(s))) {
    return 'text-red-600';
  }
  if (['貪狼', '巨門', '七殺', '破軍'].some(s => starName.includes(s))) {
    return 'text-blue-700';
  }
  if (['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'].some(s => starName.includes(s))) {
    return 'text-orange-600';
  }
  if (['左輔', '右弼', '文昌', '文曲', '天魁', '天鉞'].some(s => starName.includes(s))) {
    return 'text-cyan-600';
  }
  if (['祿存', '天馬'].some(s => starName.includes(s))) {
    return 'text-emerald-600';
  }
  if (['紅鸞', '天喜', '咸池', '沐浴'].some(s => starName.includes(s))) {
    return 'text-pink-500';
  }
  return 'text-gray-700';
}

// 四化顏色
function getMutagenColor(mutagen: string): string {
  switch (mutagen) {
    case '祿': return 'text-green-600';
    case '權': return 'text-red-600';
    case '科': return 'text-blue-600';
    case '忌': return 'text-purple-600';
    default: return 'text-gray-600';
  }
}

// 亮度標記
function getBrightnessStyle(brightness?: string): string {
  switch (brightness) {
    case '廟': return 'font-bold';
    case '旺': return 'font-semibold';
    case '得': return 'font-medium';
    case '利': return 'font-medium';
    case '平': return 'font-normal';
    case '陷': return 'font-normal opacity-60';
    default: return 'font-normal';
  }
}

// Star component - 加大版
function StarDisplay({ star, isMajor, isMinor }: { star: StarData; isMajor?: boolean; isMinor?: boolean }) {
  const colorClass = getStarColor(star.name, star.type);
  const brightnessStyle = getBrightnessStyle(star.brightness);
  // 主星 text-xl, 輔星 text-lg
  const textSize = isMajor ? 'text-xl' : 'text-lg';

  return (
    <span className={clsx('inline-flex items-baseline whitespace-nowrap', colorClass, brightnessStyle, textSize)}>
      {star.name}
      {star.brightness && (
        <span className={clsx('text-gray-500 ml-0.5', isMajor ? 'text-sm' : 'text-xs')}>
          {star.brightness}
        </span>
      )}
      {star.mutagen && (
        <span className={clsx(
          'font-bold ml-1 px-1.5 py-0.5 rounded border-2',
          isMajor ? 'text-lg' : 'text-base',
          star.mutagen === '祿' ? 'bg-green-100 border-green-500 text-green-700' :
          star.mutagen === '權' ? 'bg-red-100 border-red-500 text-red-700' :
          star.mutagen === '科' ? 'bg-blue-100 border-blue-500 text-blue-700' :
          'bg-purple-100 border-purple-500 text-purple-700'
        )}>
          {star.mutagen}
        </span>
      )}
    </span>
  );
}

// Palace cell component - 清晰版
function PalaceCell({
  palace,
  isOriginPalace,
  isHighlighted,
  highlightType
}: {
  palace: PalaceData;
  isOriginPalace?: boolean;
  isHighlighted?: boolean;
  highlightType?: 'self' | 'opposite' | 'trine';
}) {
  const isSoulPalace = palace.isSoulPalace;
  const isBodyPalace = palace.isBodyPalace;

  const getBgColor = () => {
    if (isHighlighted) {
      if (highlightType === 'self') return 'bg-red-50';
      if (highlightType === 'opposite') return 'bg-blue-50';
      if (highlightType === 'trine') return 'bg-green-50';
    }
    return 'bg-white';
  };

  const getHeaderBg = () => {
    if (isSoulPalace) return 'bg-red-100';
    if (isBodyPalace) return 'bg-blue-100';
    if (isOriginPalace) return 'bg-yellow-100';
    if (isHighlighted) {
      if (highlightType === 'self') return 'bg-red-200';
      if (highlightType === 'opposite') return 'bg-blue-200';
      if (highlightType === 'trine') return 'bg-green-200';
    }
    return 'bg-gray-100';
  };

  const getPalaceNameColor = () => {
    if (isSoulPalace) return 'text-red-700';
    if (isBodyPalace) return 'text-blue-700';
    if (isOriginPalace) return 'text-yellow-700';
    return 'text-gray-800';
  };

  return (
    <div
      className={clsx(
        'h-full flex flex-col border-2 border-gray-400 overflow-hidden',
        getBgColor()
      )}
    >
      {/* 宮位標題區 - 獨立區塊 */}
      <div className={clsx('px-3 py-2 border-b-2 border-gray-400', getHeaderBg())}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={clsx('font-bold text-lg', getPalaceNameColor())}>
              {palace.name}
            </span>
            {isSoulPalace && (
              <span className="text-sm bg-red-600 text-white px-2 py-0.5 rounded font-bold">命</span>
            )}
            {isBodyPalace && (
              <span className="text-sm bg-blue-600 text-white px-2 py-0.5 rounded font-bold">身</span>
            )}
            {isOriginPalace && (
              <span className="text-sm bg-yellow-600 text-white px-2 py-0.5 rounded font-bold">因</span>
            )}
          </div>
          <div className="text-base font-bold">
            <span className="text-purple-700">{palace.heavenlyStem}</span>
            <span className="text-gray-600">{palace.earthlyBranch}</span>
          </div>
        </div>
      </div>

      {/* 星曜區 - 主要內容 */}
      <div className="flex-1 p-3 space-y-2">
        {/* 主星 */}
        {palace.majorStars.length > 0 && (
          <div className="space-y-1">
            {palace.majorStars.map((star, idx) => (
              <div key={`major-${idx}`} className="flex items-baseline">
                <StarDisplay star={star} isMajor />
              </div>
            ))}
          </div>
        )}

        {/* 輔星 */}
        {palace.minorStars.length > 0 && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 pt-1 border-t border-gray-200">
            {palace.minorStars.map((star, idx) => (
              <StarDisplay key={`minor-${idx}`} star={star} />
            ))}
          </div>
        )}
      </div>

      {/* 雜曜區 */}
      {palace.adjectiveStars && palace.adjectiveStars.length > 0 && (
        <div className="px-3 py-1.5 border-t border-gray-300 bg-gray-50">
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-base text-gray-600">
            {palace.adjectiveStars.map((star, idx) => (
              <span key={`adj-${idx}`}>{star.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 從命盤提取四化
function extractSihuaFromData(data: AstrolabeData): { type: string; star: string; palace: string }[] {
  const sihuaList: { type: string; star: string; palace: string }[] = [];
  for (const palace of data.palaces) {
    for (const star of [...palace.majorStars, ...palace.minorStars]) {
      if (star.mutagen && ['祿', '權', '科', '忌'].includes(star.mutagen)) {
        sihuaList.push({
          type: star.mutagen,
          star: star.name,
          palace: palace.name,
        });
      }
    }
  }
  const order = ['祿', '權', '科', '忌'];
  sihuaList.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  return sihuaList;
}

// Center info component - 重新設計（加大文字版）
function CenterInfo({ data, name, originPalace }: {
  data: AstrolabeData;
  name?: string;
  originPalace?: { branch: string; palace: string }
}) {
  const sihuaList = extractSihuaFromData(data);

  const sihuaColors: Record<string, string> = {
    '祿': 'text-green-600',
    '權': 'text-red-600',
    '科': 'text-blue-600',
    '忌': 'text-purple-600',
  };

  return (
    <div className="col-span-2 row-span-2 border-2 border-gray-400 bg-gradient-to-br from-amber-50 to-white p-4 flex flex-col overflow-hidden">
      {/* 標題 + 姓名 */}
      <div className="text-center border-b-2 border-purple-300 pb-3 mb-3">
        <h2 className="text-3xl font-bold text-purple-800">紫微斗數</h2>
        {name && <p className="text-2xl font-bold text-gray-900 mt-1">{name}</p>}
      </div>

      {/* 命主/五行局/身主 - 橫向大字 */}
      <div className="flex justify-center items-center gap-6 text-xl mb-3">
        <div className="text-center">
          <span className="text-gray-500 text-base">命主</span>
          <span className="font-bold text-red-600 ml-1">{data.soulStar}</span>
        </div>
        <div className="text-center">
          <span className="font-bold text-purple-700 text-2xl">{data.fiveElementsClass}</span>
        </div>
        <div className="text-center">
          <span className="text-gray-500 text-base">身主</span>
          <span className="font-bold text-blue-600 ml-1">{data.bodyStar}</span>
        </div>
      </div>

      {/* 出生資訊 - 加大字體 */}
      <div className="bg-gray-50/80 rounded-lg p-3 text-base space-y-2 mb-3">
        <div className="flex justify-between">
          <span><span className="text-gray-500">陽曆</span> <span className="font-semibold">{data.solarDate}</span></span>
          <span><span className="text-gray-500">農曆</span> <span className="font-semibold">{data.lunarDate}</span></span>
        </div>
        <div className="flex justify-between">
          <span><span className="text-gray-500">時辰</span> <span className="font-semibold">{data.time}時</span><span className="text-gray-400 text-sm ml-1">({data.timeRange})</span></span>
          <span><span className="text-gray-500">性別</span> <span className="font-semibold">{data.gender}</span> <span className="text-gray-500 ml-3">生肖</span> <span className="font-semibold">{data.zodiac}</span></span>
        </div>
        {data.age && (
          <div className="flex justify-center gap-6 pt-2 border-t border-gray-200">
            <span><span className="text-gray-500">虛歲</span><span className="font-bold text-orange-600 text-xl ml-1">{data.age}</span></span>
            <span><span className="text-gray-500">實歲</span><span className="font-semibold text-gray-700 text-xl ml-1">{data.realAge}</span></span>
          </div>
        )}
      </div>

      {/* 大限流年 + 來因宮 - 加大字體 */}
      <div className="bg-indigo-50/80 rounded-lg p-3 text-base space-y-2 mb-3">
        {data.currentDecadal && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-indigo-600 font-medium">大限</span>
            <span className="font-bold text-indigo-800 text-lg">第{data.currentDecadal.index}限</span>
            <span className="text-indigo-600">({data.currentDecadal.startAge}-{data.currentDecadal.endAge}歲)</span>
            <span className="bg-indigo-200 px-2 py-0.5 rounded font-bold text-indigo-800">{data.currentDecadal.palaceName}</span>
          </div>
        )}
        {data.currentYearly && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-teal-600 font-medium">流年</span>
            <span className="font-bold text-teal-800 text-lg">{data.currentYearly.year}年</span>
            <span className="bg-teal-200 px-2 py-0.5 rounded font-bold text-teal-800">{data.currentYearly.palaceName}</span>
          </div>
        )}
        {originPalace && (
          <div className="flex items-center justify-center gap-3">
            <span className="text-yellow-600 font-medium">來因</span>
            <span className="bg-yellow-100 px-2 py-0.5 rounded font-bold text-yellow-700">{originPalace.palace}（{originPalace.branch}）</span>
          </div>
        )}
      </div>

      {/* 四化 - 加大版 */}
      <div className="border-t-2 border-gray-200 pt-3 flex-1">
        <div className="grid grid-cols-4 gap-2 text-center">
          {sihuaList.map((sihua, idx) => (
            <div key={idx} className="space-y-1">
              <div className={clsx('font-bold text-lg', sihuaColors[sihua.type])}>化{sihua.type}</div>
              <div className="text-gray-800 font-semibold">{sihua.star}</div>
              <div className="text-gray-500 text-sm">@{sihua.palace}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 圖例 - 加大 */}
      <div className="mt-auto pt-2 border-t border-gray-200 flex justify-center gap-4 text-sm">
        <span className="flex items-center"><span className="w-4 h-4 bg-red-200 border border-red-400 rounded mr-1"></span>命宮</span>
        <span className="flex items-center"><span className="w-4 h-4 bg-blue-200 border border-blue-400 rounded mr-1"></span>對宮</span>
        <span className="flex items-center"><span className="w-4 h-4 bg-green-200 border border-green-400 rounded mr-1"></span>三合</span>
      </div>
    </div>
  );
}

// 三方四正只用顏色標示，不畫線條（線條容易出問題）

export function AstrolabeChart({ data, name, originPalace }: AstrolabeChartProps) {
  // 找出命宮的地支來計算三方四正
  const soulPalace = data.palaces.find(p => p.isSoulPalace);
  const soulBranch = soulPalace?.earthlyBranch || '';
  const sanfangBranches = getSanfangSizheng(soulBranch);

  const palaceMap = new Map<string, PalaceData>();
  data.palaces.forEach((palace) => {
    palaceMap.set(palace.earthlyBranch, palace);
  });

  const grid: (PalaceData | 'center' | null)[][] = [
    [null, null, null, null],
    [null, 'center', 'center', null],
    [null, 'center', 'center', null],
    [null, null, null, null],
  ];

  Object.entries(PALACE_POSITIONS).forEach(([branch, pos]) => {
    const palace = palaceMap.get(branch);
    if (palace) {
      grid[pos.row][pos.col] = palace;
    }
  });

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 overflow-auto">
      {/* Top direction labels */}
      <div className="flex text-sm text-gray-500 mb-1">
        <span className="flex-1 text-center">東南</span>
        <span className="flex-1 text-center">南</span>
        <span className="flex-1 text-center">西南</span>
        <span className="flex-1 text-center">西</span>
      </div>

      {/* Main chart grid */}
      <div className="flex">
        <div className="flex flex-col justify-around text-sm text-gray-500 pr-1">
          <span className="writing-mode-vertical">東</span>
        </div>

        <div className="flex-1">
          {/* 格子 - 固定行高讓比例一致 */}
          <div className="grid grid-cols-[repeat(4,minmax(160px,1fr))] grid-rows-[repeat(4,210px)] gap-0">
            {grid.map((row, rowIdx) =>
              row.map((cell, colIdx) => {
                const key = `${rowIdx}-${colIdx}`;

                if (cell === 'center') {
                  if (rowIdx === 1 && colIdx === 1) {
                    return <CenterInfo key={key} data={data} name={name} originPalace={originPalace} />;
                  }
                  return null;
                }

                if (cell && typeof cell !== 'string') {
                  const isOrigin = originPalace && cell.earthlyBranch === originPalace.branch;
                  const branch = cell.earthlyBranch;
                  const sanfangIdx = sanfangBranches.indexOf(branch);
                  const isHighlighted = sanfangIdx !== -1;
                  let highlightType: 'self' | 'opposite' | 'trine' | undefined;
                  if (sanfangIdx === 0) highlightType = 'self';
                  else if (sanfangIdx === 1) highlightType = 'opposite';
                  else if (sanfangIdx >= 2) highlightType = 'trine';

                  return (
                    <PalaceCell
                      key={key}
                      palace={cell}
                      isOriginPalace={isOrigin}
                      isHighlighted={isHighlighted}
                      highlightType={highlightType}
                    />
                  );
                }

                return (
                  <div key={key} className="border-2 border-gray-400 bg-gray-100 h-full" />
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col justify-around text-sm text-gray-500 pl-1">
          <span className="writing-mode-vertical">西</span>
        </div>
      </div>

      {/* Bottom direction labels */}
      <div className="flex text-sm text-gray-500 mt-1">
        <span className="flex-1 text-center">東北</span>
        <span className="flex-1 text-center">北偏東</span>
        <span className="flex-1 text-center">北</span>
        <span className="flex-1 text-center">西北</span>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap justify-center gap-x-5 gap-y-2 text-base">
        <span><span className="text-purple-700 font-medium">●</span> <span className="text-gray-700">紫府星系</span></span>
        <span><span className="text-red-600 font-medium">●</span> <span className="text-gray-700">太陽星系</span></span>
        <span><span className="text-green-700 font-medium">●</span> <span className="text-gray-700">天機星系</span></span>
        <span><span className="text-blue-700 font-medium">●</span> <span className="text-gray-700">殺破狼</span></span>
        <span><span className="text-cyan-600 font-medium">●</span> <span className="text-gray-700">六吉星</span></span>
        <span><span className="text-orange-600 font-medium">●</span> <span className="text-gray-700">六煞星</span></span>
        <span><span className="text-pink-500 font-medium">●</span> <span className="text-gray-700">桃花星</span></span>
        <span><span className="text-emerald-600 font-medium">●</span> <span className="text-gray-700">祿馬星</span></span>
      </div>

      {/* 四化 Legend */}
      <div className="flex justify-center gap-x-6 text-base mt-3">
        <span><span className="text-green-600 font-bold text-lg">祿</span><span className="text-gray-700">=化祿</span></span>
        <span><span className="text-red-600 font-bold text-lg">權</span><span className="text-gray-700">=化權</span></span>
        <span><span className="text-blue-600 font-bold text-lg">科</span><span className="text-gray-700">=化科</span></span>
        <span><span className="text-purple-600 font-bold text-lg">忌</span><span className="text-gray-700">=化忌</span></span>
      </div>
    </div>
  );
}

// Placeholder component when no data
export function AstrolabeChartPlaceholder() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center justify-center min-h-[400px] text-center border-2 border-dashed border-gray-300">
      <div className="text-6xl mb-4 opacity-30">☯</div>
      <h3 className="text-xl font-medium text-gray-500 mb-2">紫微斗數命盤</h3>
      <p className="text-gray-400">請填寫表單並點擊「排盤」</p>
      <p className="text-gray-400 text-sm mt-1">以生成您的紫微斗數命盤</p>
    </div>
  );
}
