'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { divine, getDivinationRules, DivinationResult, DivinationRules } from '@/lib/api';
import { clsx } from 'clsx';

function getNatureColor(nature: string): string {
  switch (nature) {
    case '大吉':
      return 'bg-green-100 text-green-800 border-green-300';
    case '吉':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case '凶':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case '大凶':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

function getNatureEmoji(nature: string): string {
  switch (nature) {
    case '大吉':
      return '&#9728;'; // sun
    case '吉':
      return '&#9734;'; // star
    case '凶':
      return '&#9729;'; // cloud
    case '大凶':
      return '&#9889;'; // lightning
    default:
      return '&#9679;'; // circle
  }
}

export default function DivinationPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<DivinationResult | null>(null);
  const [rules, setRules] = useState<DivinationRules | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load divination rules on mount
    getDivinationRules().then(setRules);
  }, []);

  const handleDivine = async () => {
    if (!question.trim()) {
      setError('請輸入您想要問的問題');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await divine(question);
      if (response) {
        setResult(response);
      } else {
        setError('卜卦失敗，請稍後再試');
      }
    } catch (err) {
      setError('卜卦過程中發生錯誤');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuestion('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            六壬速斷
          </h1>
          <p className="text-gray-600">
            基於倪海廈老師教學的快速占卜方法
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Input Section */}
          <div className="space-y-6">
            {/* Question Input */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                輸入問題
              </h2>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="請輸入您想要問的問題...&#10;例如：這件事情會順利嗎？"
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-gray-900 placeholder-gray-400"
              />
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleDivine}
                  className="flex-1"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? '卜卦中...' : '開始卜卦'}
                </Button>
                <Button
                  onClick={handleClear}
                  variant="secondary"
                  size="lg"
                  disabled={isLoading}
                >
                  清除
                </Button>
              </div>
            </div>

            {/* Method Info Card */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <h2 className="text-lg font-semibold mb-3">關於六壬速斷</h2>
              <p className="text-sm text-indigo-100 mb-3">
                {rules?.description || '看左手，只需知道農曆的月、日、時，取食指、中指、無名指'}
              </p>
              <p className="text-sm text-indigo-100 mb-3">
                {rules?.usage || '測心血來潮的事或單一個事情：以當下想算該事的時間為準開始算'}
              </p>
              <div className="text-sm text-indigo-100 mt-4">
                <strong>六個位置：</strong>
                <ul className="mt-2 space-y-1">
                  {rules?.results?.map((r, idx) => (
                    <li key={idx}>
                      <span dangerouslySetInnerHTML={{ __html: getNatureEmoji(r.nature) }} />{' '}
                      {r.name} ({r.nature})
                    </li>
                  )) || (
                    <>
                      <li>&#9679; 大安 - 吉</li>
                      <li>&#9679; 流連 - 凶</li>
                      <li>&#9679; 速喜 - 大吉</li>
                      <li>&#9679; 赤口 - 凶</li>
                      <li>&#9679; 小吉 - 吉</li>
                      <li>&#9679; 空亡 - 大凶</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Right: Results Section */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Result Card */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    卜卦結果
                  </h2>

                  {/* Hexagram Display */}
                  <div className="text-center py-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg mb-4">
                    <p className="text-sm text-gray-600 mb-2">卦象</p>
                    <p className="text-xl font-bold text-indigo-700">
                      {result.hexagram}
                    </p>
                  </div>

                  {/* Nature Badge */}
                  <div className="flex justify-center mb-4">
                    <span
                      className={clsx(
                        'px-6 py-2 rounded-full text-lg font-bold border-2',
                        getNatureColor(result.nature)
                      )}
                    >
                      <span dangerouslySetInnerHTML={{ __html: getNatureEmoji(result.nature) }} />{' '}
                      {result.nature}
                    </span>
                  </div>

                  {/* Timing */}
                  {result.timing && (
                    <div className="text-center mb-4">
                      <span className="text-gray-600">應期：</span>
                      <span className="font-medium text-gray-900">{result.timing}</span>
                    </div>
                  )}
                </div>

                {/* Interpretation Card */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    解釋
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {result.interpretation}
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-amber-800 text-sm">
                      <strong>提醒：</strong>{result.advice}
                    </p>
                  </div>
                </div>

                {/* Question Recap */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    所問問題
                  </h2>
                  <p className="text-gray-600 italic">
                    &ldquo;{question}&rdquo;
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-center py-16">
                  <div className="text-6xl mb-4 opacity-30">&#128302;</div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    尚無卜卦結果
                  </h3>
                  <p className="text-gray-500">
                    請在左側輸入問題後點擊「開始卜卦」
                  </p>
                </div>
              </div>
            )}

            {/* Hand Diagram */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                手指位置圖
              </h2>
              <div className="flex justify-center">
                <div className="relative w-64 h-48">
                  {/* Simplified hand representation */}
                  <div className="absolute inset-0 flex items-end justify-center">
                    <div className="flex gap-1 items-end">
                      {/* Index finger - 食指 */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-indigo-100 border-2 border-indigo-300 rounded-t-full flex items-center justify-center text-xs font-bold text-indigo-700">
                          3
                        </div>
                        <div className="w-8 h-6 bg-yellow-100 border-2 border-yellow-300 flex items-center justify-center text-xs font-bold text-yellow-700">
                          2
                        </div>
                        <div className="w-8 h-6 bg-green-100 border-2 border-green-300 rounded-b flex items-center justify-center text-xs font-bold text-green-700">
                          1
                        </div>
                        <span className="text-xs text-gray-500 mt-1">食指</span>
                      </div>
                      {/* Middle finger - 中指 */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-orange-100 border-2 border-orange-300 rounded-t-full flex items-center justify-center text-xs font-bold text-orange-700">
                          4
                        </div>
                        <div className="w-8 h-6 bg-gray-100 border-2 border-gray-300 flex items-center justify-center text-xs">

                        </div>
                        <div className="w-8 h-6 bg-gray-100 border-2 border-gray-300 rounded-b flex items-center justify-center text-xs">

                        </div>
                        <span className="text-xs text-gray-500 mt-1">中指</span>
                      </div>
                      {/* Ring finger - 無名指 */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 bg-blue-100 border-2 border-blue-300 rounded-t-full flex items-center justify-center text-xs font-bold text-blue-700">
                          5
                        </div>
                        <div className="w-8 h-6 bg-gray-100 border-2 border-gray-300 flex items-center justify-center text-xs">

                        </div>
                        <div className="w-8 h-6 bg-red-100 border-2 border-red-300 rounded-b flex items-center justify-center text-xs font-bold text-red-700">
                          6
                        </div>
                        <span className="text-xs text-gray-500 mt-1">無名指</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                  <span>1. 大安 (吉)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                  <span>2. 流連 (凶)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-indigo-100 border border-indigo-300 rounded"></div>
                  <span>3. 速喜 (大吉)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
                  <span>4. 赤口 (凶)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
                  <span>5. 小吉 (吉)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                  <span>6. 空亡 (大凶)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
