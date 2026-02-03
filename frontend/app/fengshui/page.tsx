'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select, SelectOption } from '@/components/ui/Select';
import {
  analyzeFengshui,
  RoomPosition,
  FengshuiResponse,
  FengshuiIssue,
} from '@/lib/api';
import { clsx } from 'clsx';

const POSITIONS: SelectOption[] = [
  { label: '東', value: '東' },
  { label: '西', value: '西' },
  { label: '南', value: '南' },
  { label: '北', value: '北' },
  { label: '東北', value: '東北' },
  { label: '東南', value: '東南' },
  { label: '西北', value: '西北' },
  { label: '西南', value: '西南' },
  { label: '中央', value: '中央' },
];

const ELEMENTS: SelectOption[] = [
  { label: '廚房', value: '廚房' },
  { label: '廁所', value: '廁所' },
  { label: '臥室', value: '臥室' },
  { label: '客廳', value: '客廳' },
  { label: '書房', value: '書房' },
  { label: '大門', value: '門' },
];

// Position grid layout for Bagua
const GRID_POSITIONS = [
  ['東南', '南', '西南'],
  ['東', '中央', '西'],
  ['東北', '北', '西北'],
];

function getSeverityColor(severity: string): string {
  switch (severity) {
    case '嚴重':
      return 'bg-red-100 text-red-800 border-red-200';
    case '中等':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case '輕微':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-red-600';
}

function getScoreGradient(score: number): string {
  if (score >= 80) return 'from-green-500 to-green-600';
  if (score >= 60) return 'from-yellow-500 to-yellow-600';
  if (score >= 40) return 'from-orange-500 to-orange-600';
  return 'from-red-500 to-red-600';
}

export default function FengshuiPage() {
  const [rooms, setRooms] = useState<RoomPosition[]>([]);
  const [newPosition, setNewPosition] = useState<string>('東');
  const [newElement, setNewElement] = useState<string>('廚房');
  const [result, setResult] = useState<FengshuiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRoom = () => {
    // Check if this position-element combination already exists
    const exists = rooms.some(
      (r) => r.position === newPosition && r.element === newElement
    );
    if (exists) {
      setError('此方位已設置相同的房間類型');
      return;
    }

    setRooms([...rooms, { position: newPosition, element: newElement }]);
    setError(null);
  };

  const removeRoom = (index: number) => {
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (rooms.length === 0) {
      setError('請至少添加一個房間');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await analyzeFengshui(rooms);
      if (response) {
        setResult(response);
      } else {
        setError('分析失敗，請稍後再試');
      }
    } catch (err) {
      setError('分析過程中發生錯誤');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoomAtPosition = (position: string): RoomPosition[] => {
    return rooms.filter((r) => r.position === position);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            風水分析
          </h1>
          <p className="text-gray-600">
            基於倪海廈老師陽宅風水教學的房屋格局分析
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Input Section */}
          <div className="space-y-6">
            {/* Add Room Form */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                添加房間位置
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Select
                  label="方位"
                  options={POSITIONS}
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                />
                <Select
                  label="房間類型"
                  options={ELEMENTS}
                  value={newElement}
                  onChange={(e) => setNewElement(e.target.value)}
                />
              </div>
              <Button onClick={addRoom} className="w-full">
                添加房間
              </Button>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            {/* Bagua Grid */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                八卦方位圖
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {GRID_POSITIONS.flat().map((position) => {
                  const roomsAtPos = getRoomAtPosition(position);
                  const hasRooms = roomsAtPos.length > 0;

                  return (
                    <div
                      key={position}
                      className={clsx(
                        'aspect-square rounded-lg border-2 p-2 flex flex-col items-center justify-center text-center transition-colors',
                        hasRooms
                          ? 'bg-indigo-50 border-indigo-300'
                          : 'bg-gray-50 border-gray-200'
                      )}
                    >
                      <span className="text-sm font-medium text-gray-700">
                        {position}
                      </span>
                      {roomsAtPos.map((room, idx) => (
                        <span
                          key={idx}
                          className="text-xs text-indigo-600 mt-1"
                        >
                          {room.element}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Room List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                已添加房間 ({rooms.length})
              </h2>
              {rooms.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  尚未添加任何房間
                </p>
              ) : (
                <ul className="space-y-2">
                  {rooms.map((room, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-gray-700">
                        {room.position} - {room.element}
                      </span>
                      <button
                        onClick={() => removeRoom(index)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        移除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                onClick={handleAnalyze}
                className="w-full mt-4"
                size="lg"
                disabled={isLoading || rooms.length === 0}
              >
                {isLoading ? '分析中...' : '開始分析'}
              </Button>
            </div>
          </div>

          {/* Right: Results Section */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Score Card */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    整體評分
                  </h2>
                  <div className="flex items-center justify-center">
                    <div
                      className={clsx(
                        'text-6xl font-bold',
                        getScoreColor(result.overall_score)
                      )}
                    >
                      {result.overall_score}
                    </div>
                    <span className="text-2xl text-gray-400 ml-2">/100</span>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={clsx(
                        'h-3 rounded-full bg-gradient-to-r',
                        getScoreGradient(result.overall_score)
                      )}
                      style={{ width: `${result.overall_score}%` }}
                    />
                  </div>
                  <p className="text-center text-gray-500 mt-2 text-sm">
                    {result.overall_score >= 80
                      ? '格局良好'
                      : result.overall_score >= 60
                      ? '格局尚可，有改善空間'
                      : result.overall_score >= 40
                      ? '格局有問題，建議調整'
                      : '格局不佳，需要重視'}
                  </p>
                </div>

                {/* Issues List */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    發現問題 ({result.issues.length})
                  </h2>
                  {result.issues.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">&#10004;</div>
                      <p className="text-green-600 font-medium">
                        未發現明顯風水問題
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {result.issues.map((issue: FengshuiIssue, index: number) => (
                        <li
                          key={index}
                          className={clsx(
                            'p-4 rounded-lg border',
                            getSeverityColor(issue.severity)
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="font-medium">
                                {issue.position} - {issue.element}
                              </span>
                              <span
                                className={clsx(
                                  'ml-2 px-2 py-0.5 text-xs rounded-full',
                                  getSeverityColor(issue.severity)
                                )}
                              >
                                {issue.severity}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 text-sm">
                            <strong>影響：</strong>
                            {issue.effect}
                          </p>
                          <p className="mt-1 text-sm">
                            <strong>化解方法：</strong>
                            {issue.remedy}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    建議
                  </h2>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec: string, index: number) => (
                      <li
                        key={index}
                        className="flex items-start p-3 bg-indigo-50 rounded-lg"
                      >
                        <span className="text-indigo-600 mr-2">&#8226;</span>
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-center py-16">
                  <div className="text-6xl mb-4 opacity-30">&#127968;</div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    尚無分析結果
                  </h3>
                  <p className="text-gray-500">
                    請在左側添加房間位置後點擊「開始分析」
                  </p>
                </div>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-lg font-semibold mb-3">關於陽宅風水</h2>
              <p className="text-sm text-indigo-100 mb-3">
                陽宅風水是倪海廈老師教學中的重要部分。房屋的格局與家人的健康、運勢息息相關。
              </p>
              <ul className="text-sm text-indigo-100 space-y-1">
                <li>&#8226; 西北角為乾位，代表父親、丈夫</li>
                <li>&#8226; 西南角為坤位，代表母親、妻子</li>
                <li>&#8226; 正東為震位，代表長子</li>
                <li>&#8226; 房屋中央為太極，不宜設置廁所</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
