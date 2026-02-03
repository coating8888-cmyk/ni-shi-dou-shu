'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select, SelectOption } from './ui/Select';
import { BirthData, TIME_OPTIONS } from '@/lib/types';

interface ChartFormProps {
  onSubmit: (data: BirthData) => void;
}

// LocalStorage key
const STORAGE_KEY = 'niShiDouShu_recentSearches';
const MAX_RECORDS = 10; // 最多保存 10 筆記錄

// Convert TIME_OPTIONS to SelectOption format
const timeOptions: SelectOption[] = TIME_OPTIONS.map((opt) => ({
  label: `${opt.label} (${opt.hours})`,
  value: opt.value,
}));

interface SearchRecord {
  id: string;
  timestamp: number;
  name?: string;
  yearStr: string;
  monthStr: string;
  dayStr: string;
  hour: number;
  gender: '男' | '女';
  isLunar: boolean;
}

// 取得時辰名稱
function getHourLabel(hour: number): string {
  const opt = TIME_OPTIONS.find(t => t.value === hour);
  return opt ? opt.label : `${hour}時`;
}

export function ChartForm({ onSubmit }: ChartFormProps) {
  const [name, setName] = useState('');
  const [yearStr, setYearStr] = useState('1990');
  const [monthStr, setMonthStr] = useState('1');
  const [dayStr, setDayStr] = useState('1');
  const [hour, setHour] = useState(6);
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [isLunar, setIsLunar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 最近查詢記錄
  const [recentSearches, setRecentSearches] = useState<SearchRecord[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const records: SearchRecord[] = JSON.parse(saved);
        // 按時間排序（最新在前）
        records.sort((a, b) => b.timestamp - a.timestamp);
        setRecentSearches(records);
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  }, []);

  // Save a new search record
  const saveSearchRecord = (record: Omit<SearchRecord, 'id' | 'timestamp'>) => {
    try {
      const newRecord: SearchRecord = {
        ...record,
        id: Date.now().toString(),
        timestamp: Date.now(),
      };

      // 檢查是否已有相同的記錄（相同生日資料）
      const isDuplicate = recentSearches.some(
        r => r.yearStr === record.yearStr &&
             r.monthStr === record.monthStr &&
             r.dayStr === record.dayStr &&
             r.hour === record.hour &&
             r.gender === record.gender &&
             r.isLunar === record.isLunar
      );

      let updatedRecords: SearchRecord[];

      if (isDuplicate) {
        // 如果是重複的，更新時間戳並移到最前面
        updatedRecords = recentSearches.filter(
          r => !(r.yearStr === record.yearStr &&
                 r.monthStr === record.monthStr &&
                 r.dayStr === record.dayStr &&
                 r.hour === record.hour &&
                 r.gender === record.gender &&
                 r.isLunar === record.isLunar)
        );
        updatedRecords.unshift(newRecord);
      } else {
        // 新增記錄
        updatedRecords = [newRecord, ...recentSearches];
      }

      // 只保留最新的 MAX_RECORDS 筆
      updatedRecords = updatedRecords.slice(0, MAX_RECORDS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
      setRecentSearches(updatedRecords);
    } catch (e) {
      console.error('Failed to save search record:', e);
    }
  };

  // Load a record into the form
  const loadRecord = (record: SearchRecord) => {
    if (record.name) setName(record.name);
    setYearStr(record.yearStr);
    setMonthStr(record.monthStr);
    setDayStr(record.dayStr);
    setHour(record.hour);
    setGender(record.gender);
    setIsLunar(record.isLunar);
    setShowRecent(false);
  };

  // Delete a record
  const deleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedRecords = recentSearches.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecords));
      setRecentSearches(updatedRecords);
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  // Clear all records
  const clearAllRecords = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentSearches([]);
      setShowRecent(false);
    } catch (e) {
      console.error('Failed to clear records:', e);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    // Validation
    if (isNaN(year) || year < 1900 || year > 2100) {
      setError('請輸入有效的年份（1900-2100）');
      return;
    }
    if (isNaN(month) || month < 1 || month > 12) {
      setError('請輸入有效的月份（1-12）');
      return;
    }
    if (isNaN(day) || day < 1 || day > 31) {
      setError('請輸入有效的日期（1-31）');
      return;
    }

    // Save to recent searches
    saveSearchRecord({
      name: name.trim() || undefined,
      yearStr,
      monthStr,
      dayStr,
      hour,
      gender,
      isLunar,
    });

    const data: BirthData = {
      year,
      month,
      day,
      hour,
      gender,
      isLunar,
      ...(name.trim() && { name: name.trim() }),
    };

    onSubmit(data);
  };

  // 格式化時間顯示
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;

    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-lg p-6 space-y-6"
    >
      {/* 最近查詢按鈕 */}
      {recentSearches.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowRecent(!showRecent)}
            className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-indigo-700 text-lg font-medium transition-colors"
          >
            <span>最近查詢 ({recentSearches.length})</span>
            <span>{showRecent ? '▲' : '▼'}</span>
          </button>

          {/* 下拉選單 */}
          {showRecent && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-auto">
              {recentSearches.map((record) => (
                <div
                  key={record.id}
                  onClick={() => loadRecord(record)}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate text-lg">
                      {record.name || '未命名'}
                    </div>
                    <div className="text-base text-gray-600">
                      {record.isLunar ? '農曆 ' : ''}
                      {record.yearStr}/{record.monthStr}/{record.dayStr} {getHourLabel(record.hour)} {record.gender}
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatTime(record.timestamp)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => deleteRecord(record.id, e)}
                    className="ml-2 p-2 text-gray-400 hover:text-red-500 transition-colors text-xl"
                    title="刪除此記錄"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="p-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={clearAllRecords}
                  className="w-full py-3 text-base text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                >
                  清除所有記錄
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Name Input */}
      <div className="space-y-2">
        <label className="block text-lg font-medium text-gray-700">姓名（選填）</label>
        <input
          type="text"
          placeholder="請輸入姓名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
        />
      </div>

      {/* Date Input - Text Fields */}
      <div className="space-y-3">
        <label className="block text-lg font-medium text-gray-700">
          出生日期
        </label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="年"
              value={yearStr}
              onChange={(e) => setYearStr(e.target.value)}
              className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-gray-900 font-medium"
              maxLength={4}
            />
            <span className="text-base text-gray-500 mt-1 block text-center">年</span>
          </div>
          <div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="月"
              value={monthStr}
              onChange={(e) => setMonthStr(e.target.value)}
              className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-gray-900 font-medium"
              maxLength={2}
            />
            <span className="text-base text-gray-500 mt-1 block text-center">月</span>
          </div>
          <div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="日"
              value={dayStr}
              onChange={(e) => setDayStr(e.target.value)}
              className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center text-gray-900 font-medium"
              maxLength={2}
            />
            <span className="text-base text-gray-500 mt-1 block text-center">日</span>
          </div>
        </div>
      </div>

      {/* Time Period Selection - 下拉 + 手動輸入 */}
      <div className="space-y-3">
        <label className="block text-lg font-medium text-gray-700">出生時辰</label>
        <div className="grid grid-cols-2 gap-3">
          {/* 下拉選擇 */}
          <div>
            <select
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
              className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
            >
              {timeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="text-base text-gray-500 mt-1 block text-center">選擇時辰</span>
          </div>
          {/* 手動輸入時間 */}
          <div>
            <input
              type="time"
              onChange={(e) => {
                const time = e.target.value;
                if (time) {
                  const [h] = time.split(':').map(Number);
                  // 轉換24小時制到時辰 (每2小時一個時辰，從23點開始算子時)
                  const hourIndex = Math.floor(((h + 1) % 24) / 2);
                  setHour(hourIndex);
                }
              }}
              className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
            />
            <span className="text-base text-gray-500 mt-1 block text-center">或輸入時間</span>
          </div>
        </div>
      </div>

      {/* Gender Selection */}
      <div className="space-y-3">
        <label className="block text-lg font-medium text-gray-700">性別</label>
        <div className="flex space-x-8">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              name="gender"
              value="男"
              checked={gender === '男'}
              onChange={() => setGender('男')}
              className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="ml-3 text-lg text-gray-700">男</span>
          </label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              name="gender"
              value="女"
              checked={gender === '女'}
              onChange={() => setGender('女')}
              className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-2 focus:ring-indigo-500"
            />
            <span className="ml-3 text-lg text-gray-700">女</span>
          </label>
        </div>
      </div>

      {/* Lunar Date Checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isLunar"
          checked={isLunar}
          onChange={(e) => setIsLunar(e.target.checked)}
          className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
        />
        <label htmlFor="isLunar" className="ml-3 text-lg text-gray-700 cursor-pointer">
          使用農曆日期
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-lg">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold rounded-lg shadow-lg transition-colors"
      >
        排盤
      </button>
    </form>
  );
}
