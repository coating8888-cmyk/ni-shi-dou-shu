# 倪師斗數 Full Stack Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete Zi Wei Dou Shu analysis system with chart calculation, pattern matching, and AI-powered interpretation based on Ni Hai Xia's teachings.

**Architecture:**
- Frontend (Next.js + react-iztro): Chart input, calculation via iztro library, visualization
- Backend (FastAPI): Pattern matching against rules, AI analysis via LangChain, user data management
- Database: JSON files for rules (already done), ChromaDB for vector knowledge

**Tech Stack:** Next.js 14, TypeScript, TailwindCSS, react-iztro, FastAPI, Pydantic, LangChain, ChromaDB

---

## Phase 2: Calculation Engine Integration

### Task 1: Initialize Next.js Frontend Project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.js`
- Create: `frontend/app/layout.tsx`
- Create: `frontend/app/page.tsx`
- Create: `frontend/app/globals.css`

**Step 1: Initialize Next.js project**

```bash
cd /home/hero/ai/倪師斗數/frontend
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

**Step 2: Install dependencies**

```bash
npm install iztro react-iztro @radix-ui/react-select @radix-ui/react-dialog lucide-react clsx tailwind-merge
```

**Step 3: Verify installation**

```bash
npm run dev
```
Expected: Server starts on http://localhost:3000

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: initialize Next.js frontend with TypeScript and Tailwind"
```

---

### Task 2: Create Chart Input Form Component

**Files:**
- Create: `frontend/components/ui/Button.tsx`
- Create: `frontend/components/ui/Input.tsx`
- Create: `frontend/components/ui/Select.tsx`
- Create: `frontend/components/ChartForm.tsx`
- Create: `frontend/lib/types.ts`

**Step 1: Create types**

```typescript
// frontend/lib/types.ts
export interface BirthData {
  year: number;
  month: number;
  day: number;
  hour: number; // 0-23
  gender: '男' | '女';
  name?: string;
  isLunar: boolean;
}

export interface TimeOption {
  label: string;
  value: number;
  hours: string;
}

export const TIME_OPTIONS: TimeOption[] = [
  { label: '早子時', value: 0, hours: '23:00-01:00' },
  { label: '丑時', value: 1, hours: '01:00-03:00' },
  { label: '寅時', value: 2, hours: '03:00-05:00' },
  { label: '卯時', value: 3, hours: '05:00-07:00' },
  { label: '辰時', value: 4, hours: '07:00-09:00' },
  { label: '巳時', value: 5, hours: '09:00-11:00' },
  { label: '午時', value: 6, hours: '11:00-13:00' },
  { label: '未時', value: 7, hours: '13:00-15:00' },
  { label: '申時', value: 8, hours: '15:00-17:00' },
  { label: '酉時', value: 9, hours: '17:00-19:00' },
  { label: '戌時', value: 10, hours: '19:00-21:00' },
  { label: '亥時', value: 11, hours: '21:00-23:00' },
  { label: '晚子時', value: 12, hours: '23:00-01:00' },
];
```

**Step 2: Create UI components**

```typescript
// frontend/components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
          {
            'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500': variant === 'secondary',
            'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-indigo-500': variant === 'outline',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
```

```typescript
// frontend/components/ui/Input.tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={clsx(
            'w-full rounded-lg border px-3 py-2 text-gray-900 placeholder-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            error ? 'border-red-500' : 'border-gray-300',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
```

```typescript
// frontend/components/ui/Select.tsx
import { SelectHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string | number }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);
Select.displayName = 'Select';
```

**Step 3: Create ChartForm component**

```typescript
// frontend/components/ChartForm.tsx
'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { BirthData, TIME_OPTIONS } from '@/lib/types';

interface ChartFormProps {
  onSubmit: (data: BirthData) => void;
}

export function ChartForm({ onSubmit }: ChartFormProps) {
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState<BirthData>({
    year: 1990,
    month: 1,
    day: 1,
    hour: 6,
    gender: '男',
    name: '',
    isLunar: false,
  });

  const years = Array.from({ length: 100 }, (_, i) => ({
    label: `${currentYear - i}`,
    value: currentYear - i,
  }));

  const months = Array.from({ length: 12 }, (_, i) => ({
    label: `${i + 1}月`,
    value: i + 1,
  }));

  const days = Array.from({ length: 31 }, (_, i) => ({
    label: `${i + 1}日`,
    value: i + 1,
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-xl font-bold text-gray-900">輸入出生資料</h2>

      <Input
        label="姓名（選填）"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="請輸入姓名"
      />

      <div className="grid grid-cols-3 gap-4">
        <Select
          label="出生年"
          options={years}
          value={formData.year}
          onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
        />
        <Select
          label="出生月"
          options={months}
          value={formData.month}
          onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
        />
        <Select
          label="出生日"
          options={days}
          value={formData.day}
          onChange={(e) => setFormData({ ...formData, day: Number(e.target.value) })}
        />
      </div>

      <Select
        label="出生時辰"
        options={TIME_OPTIONS.map((t) => ({
          label: `${t.label} (${t.hours})`,
          value: t.value,
        }))}
        value={formData.hour}
        onChange={(e) => setFormData({ ...formData, hour: Number(e.target.value) })}
      />

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="gender"
            checked={formData.gender === '男'}
            onChange={() => setFormData({ ...formData, gender: '男' })}
            className="text-indigo-600 focus:ring-indigo-500"
          />
          <span>男</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="gender"
            checked={formData.gender === '女'}
            onChange={() => setFormData({ ...formData, gender: '女' })}
            className="text-indigo-600 focus:ring-indigo-500"
          />
          <span>女</span>
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.isLunar}
          onChange={(e) => setFormData({ ...formData, isLunar: e.target.checked })}
          className="rounded text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-600">使用農曆日期</span>
      </label>

      <Button type="submit" className="w-full" size="lg">
        排盤
      </Button>
    </form>
  );
}
```

**Step 4: Verify component renders**

Update `frontend/app/page.tsx`:
```typescript
import { ChartForm } from '@/components/ChartForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          倪師斗數
        </h1>
        <ChartForm onSubmit={(data) => console.log(data)} />
      </div>
    </main>
  );
}
```

Run: `npm run dev`
Expected: Form renders at http://localhost:3000

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: add birth data input form component"
```

---

### Task 3: Integrate iztro Chart Calculation

**Files:**
- Create: `frontend/lib/astrolabe.ts`
- Create: `frontend/components/AstrolabeChart.tsx`
- Modify: `frontend/app/page.tsx`

**Step 1: Create astrolabe calculation wrapper**

```typescript
// frontend/lib/astrolabe.ts
import { astro } from 'iztro';
import type { FunctionalAstrolabe } from 'iztro/lib/astro';
import { BirthData } from './types';

export interface PalaceData {
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: StarData[];
  minorStars: StarData[];
  isBodyPalace: boolean;
  isSoulPalace: boolean;
}

export interface StarData {
  name: string;
  type: string;
  brightness?: string;
  mutagen?: string;
}

export interface AstrolabeData {
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  fiveElementsClass: string;
  soulStar: string;
  bodyStar: string;
  palaces: PalaceData[];
  raw: FunctionalAstrolabe;
}

export function calculateAstrolabe(data: BirthData): AstrolabeData {
  const dateStr = `${data.year}-${data.month}-${data.day}`;

  const astrolabe = data.isLunar
    ? astro.byLunar(dateStr, data.hour, data.gender, true, 'zh-TW')
    : astro.bySolar(dateStr, data.hour, data.gender, true, 'zh-TW');

  const palaces: PalaceData[] = astrolabe.palaces.map((palace) => ({
    name: palace.name,
    heavenlyStem: palace.heavenlyStem,
    earthlyBranch: palace.earthlyBranch,
    majorStars: palace.majorStars.map((star) => ({
      name: star.name,
      type: star.type,
      brightness: star.brightness,
      mutagen: star.mutagen,
    })),
    minorStars: palace.minorStars.map((star) => ({
      name: star.name,
      type: star.type,
    })),
    isBodyPalace: palace.name === astrolabe.body?.palace?.name,
    isSoulPalace: palace.name === astrolabe.soul?.palace?.name,
  }));

  return {
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    fiveElementsClass: astrolabe.fiveElementsClass,
    soulStar: astrolabe.soul?.name || '',
    bodyStar: astrolabe.body?.name || '',
    palaces,
    raw: astrolabe,
  };
}
```

**Step 2: Create Astrolabe visualization component**

```typescript
// frontend/components/AstrolabeChart.tsx
'use client';

import { AstrolabeData, PalaceData } from '@/lib/astrolabe';
import { clsx } from 'clsx';

interface AstrolabeChartProps {
  data: AstrolabeData;
}

// 十二宮位置映射 (4x4 grid, center 2x2 is info area)
const PALACE_POSITIONS: Record<string, { row: number; col: number }> = {
  '巳': { row: 0, col: 1 },
  '午': { row: 0, col: 2 },
  '未': { row: 0, col: 3 },
  '申': { row: 1, col: 3 },
  '酉': { row: 2, col: 3 },
  '戌': { row: 3, col: 3 },
  '亥': { row: 3, col: 2 },
  '子': { row: 3, col: 1 },
  '丑': { row: 3, col: 0 },
  '寅': { row: 2, col: 0 },
  '卯': { row: 1, col: 0 },
  '辰': { row: 0, col: 0 },
};

function PalaceCell({ palace }: { palace: PalaceData }) {
  return (
    <div
      className={clsx(
        'border border-gray-300 p-2 text-xs bg-white h-full',
        palace.isSoulPalace && 'bg-amber-50 border-amber-400',
        palace.isBodyPalace && 'bg-blue-50 border-blue-400'
      )}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-indigo-700">{palace.name}</span>
        <span className="text-gray-500">{palace.heavenlyStem}{palace.earthlyBranch}</span>
      </div>

      {/* 主星 */}
      <div className="space-y-0.5">
        {palace.majorStars.map((star, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className={clsx(
              'font-medium',
              star.brightness === '廟' && 'text-red-600',
              star.brightness === '旺' && 'text-orange-600',
              star.brightness === '陷' && 'text-gray-400'
            )}>
              {star.name}
            </span>
            {star.brightness && (
              <span className="text-[10px] text-gray-400">{star.brightness}</span>
            )}
            {star.mutagen && (
              <span className="text-[10px] text-purple-600">{star.mutagen}</span>
            )}
          </div>
        ))}
      </div>

      {/* 輔星 */}
      {palace.minorStars.length > 0 && (
        <div className="mt-1 pt-1 border-t border-dashed border-gray-200">
          <div className="flex flex-wrap gap-1">
            {palace.minorStars.map((star, i) => (
              <span key={i} className="text-[10px] text-gray-500">
                {star.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 標記 */}
      <div className="absolute top-0.5 right-0.5 flex gap-0.5">
        {palace.isSoulPalace && (
          <span className="text-[8px] bg-amber-500 text-white px-1 rounded">命</span>
        )}
        {palace.isBodyPalace && (
          <span className="text-[8px] bg-blue-500 text-white px-1 rounded">身</span>
        )}
      </div>
    </div>
  );
}

export function AstrolabeChart({ data }: AstrolabeChartProps) {
  // 建立宮位網格
  const grid: (PalaceData | null)[][] = Array(4).fill(null).map(() => Array(4).fill(null));

  data.palaces.forEach((palace) => {
    const pos = PALACE_POSITIONS[palace.earthlyBranch];
    if (pos) {
      grid[pos.row][pos.col] = palace;
    }
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      {/* 基本資料 */}
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold text-gray-900">紫微斗數命盤</h2>
        <div className="text-sm text-gray-600 mt-2 space-x-4">
          <span>陽曆：{data.solarDate}</span>
          <span>農曆：{data.lunarDate}</span>
        </div>
        <div className="text-sm text-gray-600 mt-1 space-x-4">
          <span>四柱：{data.chineseDate}</span>
          <span>五行局：{data.fiveElementsClass}</span>
        </div>
        <div className="text-sm text-gray-600 mt-1 space-x-4">
          <span>命主：{data.soulStar}</span>
          <span>身主：{data.bodyStar}</span>
        </div>
      </div>

      {/* 命盤網格 */}
      <div className="grid grid-cols-4 gap-0 border border-gray-400">
        {grid.map((row, rowIndex) =>
          row.map((palace, colIndex) => {
            // 中間 2x2 區域顯示資訊
            if ((rowIndex === 1 || rowIndex === 2) && (colIndex === 1 || colIndex === 2)) {
              if (rowIndex === 1 && colIndex === 1) {
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="col-span-2 row-span-2 border border-gray-300 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col items-center justify-center"
                  >
                    <div className="text-2xl font-bold text-indigo-800 mb-2">
                      倪師斗數
                    </div>
                    <div className="text-sm text-gray-600">
                      基於倪海廈智慧
                    </div>
                  </div>
                );
              }
              return null;
            }

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative aspect-square min-h-[120px]"
              >
                {palace && <PalaceCell palace={palace} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
```

**Step 3: Update main page to show chart**

```typescript
// frontend/app/page.tsx
'use client';

import { useState } from 'react';
import { ChartForm } from '@/components/ChartForm';
import { AstrolabeChart } from '@/components/AstrolabeChart';
import { calculateAstrolabe, AstrolabeData } from '@/lib/astrolabe';
import { BirthData } from '@/lib/types';

export default function Home() {
  const [astrolabeData, setAstrolabeData] = useState<AstrolabeData | null>(null);

  const handleSubmit = (data: BirthData) => {
    const result = calculateAstrolabe(data);
    setAstrolabeData(result);
  };

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          倪師斗數
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側：輸入表單 */}
          <div className="lg:col-span-1">
            <ChartForm onSubmit={handleSubmit} />
          </div>

          {/* 右側：命盤顯示 */}
          <div className="lg:col-span-2">
            {astrolabeData ? (
              <AstrolabeChart data={astrolabeData} />
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
                請輸入出生資料以排盤
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
```

**Step 4: Verify chart renders**

Run: `npm run dev`
Expected: Enter birth data → See Zi Wei Dou Shu chart

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat: integrate iztro for chart calculation and visualization"
```

---

## Phase 3: Backend API Development

### Task 4: Setup FastAPI Backend Structure

**Files:**
- Create: `backend/main.py`
- Create: `backend/config.py`
- Create: `backend/models/schemas.py`
- Create: `backend/api/chart.py`
- Create: `backend/api/analysis.py`

**Step 1: Create config**

```python
# backend/config.py
from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    app_name: str = "倪師斗數 API"
    debug: bool = True
    openai_api_key: str = ""

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
```

**Step 2: Create Pydantic schemas**

```python
# backend/models/schemas.py
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class Gender(str, Enum):
    male = "男"
    female = "女"

class BirthDataRequest(BaseModel):
    year: int
    month: int
    day: int
    hour: int  # 0-12 時辰
    gender: Gender
    name: Optional[str] = None
    is_lunar: bool = False

class StarInfo(BaseModel):
    name: str
    type: str
    brightness: Optional[str] = None
    mutagen: Optional[str] = None

class PalaceInfo(BaseModel):
    name: str
    heavenly_stem: str
    earthly_branch: str
    major_stars: List[StarInfo]
    minor_stars: List[StarInfo]
    is_body_palace: bool = False
    is_soul_palace: bool = False

class PatternInfo(BaseModel):
    name: str
    type: str  # 吉格/凶格/特殊格局
    meaning: str
    effect: Optional[str] = None

class AnalysisResult(BaseModel):
    patterns: List[PatternInfo]
    personality_summary: str
    career_advice: str
    wealth_analysis: str
    relationship_analysis: str
    health_warnings: List[str]
    yearly_forecast: Optional[str] = None
```

**Step 3: Create chart analysis API**

```python
# backend/api/chart.py
from fastapi import APIRouter, HTTPException
from typing import List
import json
from pathlib import Path

from backend.models.schemas import BirthDataRequest, PatternInfo

router = APIRouter(prefix="/chart", tags=["chart"])

# 載入規則
RULES_DIR = Path(__file__).parent.parent / "rules"

def load_rules():
    rules = {}
    for file in RULES_DIR.glob("*.json"):
        with open(file, "r", encoding="utf-8") as f:
            rules[file.stem] = json.load(f)
    return rules

RULES = load_rules()

@router.post("/analyze-patterns")
async def analyze_patterns(
    birth_data: BirthDataRequest,
    palaces: List[dict]
) -> List[PatternInfo]:
    """分析命盤格局"""
    patterns = []

    # 掃描吉格
    for pattern in RULES.get("patterns", {}).get("吉格", []):
        if match_pattern(pattern, palaces):
            patterns.append(PatternInfo(
                name=pattern["name"],
                type="吉格",
                meaning=pattern.get("meaning", ""),
                effect=pattern.get("effect")
            ))

    # 掃描凶格
    for pattern in RULES.get("patterns", {}).get("凶格", []):
        if match_pattern(pattern, palaces):
            patterns.append(PatternInfo(
                name=pattern["name"],
                type="凶格",
                meaning=pattern.get("meaning", ""),
                effect=pattern.get("effect")
            ))

    # 掃描特殊格局
    for pattern in RULES.get("patterns", {}).get("特殊格局", []):
        if match_pattern(pattern, palaces):
            patterns.append(PatternInfo(
                name=pattern["name"],
                type="特殊格局",
                meaning=pattern.get("meaning", ""),
                effect=pattern.get("effect")
            ))

    return patterns

def match_pattern(pattern: dict, palaces: List[dict]) -> bool:
    """檢查格局是否符合條件"""
    conditions = pattern.get("conditions", {})

    # 簡化版本 - 實際需要更複雜的邏輯
    if "命宮" in conditions:
        ming_gong = next((p for p in palaces if p.get("name") == "命宮"), None)
        if not ming_gong:
            return False

        required = conditions["命宮"]
        if isinstance(required, dict):
            if "branch" in required:
                if ming_gong.get("earthlyBranch") != required["branch"]:
                    return False
            if "stars" in required:
                star_names = [s.get("name", "") for s in ming_gong.get("majorStars", [])]
                for req_star in required["stars"]:
                    # 移除廟旺等標記
                    base_star = req_star.replace("廟", "").replace("旺", "").replace("陷", "")
                    if base_star not in star_names:
                        return False

    return True

@router.get("/stars")
async def get_stars():
    """獲取所有星曜資料"""
    return RULES.get("stars", {})

@router.get("/palaces")
async def get_palaces():
    """獲取十二宮位資料"""
    return RULES.get("palaces", {})

@router.get("/patterns")
async def get_patterns():
    """獲取所有格局資料"""
    return RULES.get("patterns", {})
```

**Step 4: Create AI analysis API**

```python
# backend/api/analysis.py
from fastapi import APIRouter, HTTPException
from typing import List, Optional
import json

from backend.models.schemas import (
    BirthDataRequest,
    PalaceInfo,
    PatternInfo,
    AnalysisResult
)
from backend.config import get_settings

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/full")
async def full_analysis(
    birth_data: BirthDataRequest,
    palaces: List[PalaceInfo],
    patterns: List[PatternInfo]
) -> AnalysisResult:
    """完整命盤分析（結合AI）"""
    settings = get_settings()

    # 建立分析上下文
    context = build_analysis_context(birth_data, palaces, patterns)

    # 如果有 OpenAI API Key，使用 AI 分析
    if settings.openai_api_key:
        return await ai_analysis(context, settings.openai_api_key)

    # 否則使用規則分析
    return rule_based_analysis(birth_data, palaces, patterns)

def build_analysis_context(
    birth_data: BirthDataRequest,
    palaces: List[PalaceInfo],
    patterns: List[PatternInfo]
) -> str:
    """建立分析上下文文本"""
    lines = [
        f"出生資料：{birth_data.year}年{birth_data.month}月{birth_data.day}日",
        f"性別：{birth_data.gender.value}",
        "",
        "命盤結構：",
    ]

    for palace in palaces:
        stars = ", ".join([s.name for s in palace.major_stars])
        lines.append(f"- {palace.name}：{stars}")

    if patterns:
        lines.append("")
        lines.append("格局：")
        for p in patterns:
            lines.append(f"- {p.name}（{p.type}）：{p.meaning}")

    return "\n".join(lines)

def rule_based_analysis(
    birth_data: BirthDataRequest,
    palaces: List[PalaceInfo],
    patterns: List[PatternInfo]
) -> AnalysisResult:
    """基於規則的分析（無 AI）"""
    # 找命宮
    ming_gong = next((p for p in palaces if p.is_soul_palace), None)

    # 基本性格分析
    personality = "正在分析中..."
    if ming_gong and ming_gong.major_stars:
        main_star = ming_gong.major_stars[0].name
        personality = f"命宮主星為{main_star}，"
        if main_star == "紫微":
            personality += "具領導氣質，為人大方，但需要輔星才能成大事"
        elif main_star == "天機":
            personality += "聰明機智，反應快，適合動腦工作"
        elif main_star == "太陽":
            personality += "性格開朗，光明磊落，有正義感"

    # 事業分析
    career = "請完成 AI 分析設定以獲得詳細事業分析"

    # 財運分析
    wealth = "請完成 AI 分析設定以獲得詳細財運分析"

    # 感情分析
    relationship = "請完成 AI 分析設定以獲得詳細感情分析"

    # 健康警示
    health_warnings = []
    for pattern in patterns:
        if pattern.type == "凶格":
            health_warnings.append(f"注意：{pattern.name} - {pattern.meaning}")

    return AnalysisResult(
        patterns=patterns,
        personality_summary=personality,
        career_advice=career,
        wealth_analysis=wealth,
        relationship_analysis=relationship,
        health_warnings=health_warnings
    )

async def ai_analysis(context: str, api_key: str) -> AnalysisResult:
    """使用 AI 進行分析"""
    try:
        from langchain_openai import ChatOpenAI
        from langchain.prompts import ChatPromptTemplate

        llm = ChatOpenAI(
            model="gpt-4",
            api_key=api_key,
            temperature=0.7
        )

        prompt = ChatPromptTemplate.from_template("""
你是一位精通倪海廈紫微斗數的命理師。請根據以下命盤資料進行分析：

{context}

請以倪海廈老師的風格，提供：
1. 性格分析（100字以內）
2. 事業建議（100字以內）
3. 財運分析（100字以內）
4. 感情分析（100字以內）
5. 健康注意事項（列出重點）

請用繁體中文回答，語氣專業但親切。
""")

        chain = prompt | llm
        response = await chain.ainvoke({"context": context})

        # 解析回應（簡化版）
        content = response.content

        return AnalysisResult(
            patterns=[],
            personality_summary=content[:200],
            career_advice="詳見 AI 分析",
            wealth_analysis="詳見 AI 分析",
            relationship_analysis="詳見 AI 分析",
            health_warnings=["詳見 AI 分析"]
        )

    except Exception as e:
        # 回退到規則分析
        return AnalysisResult(
            patterns=[],
            personality_summary=f"AI 分析失敗：{str(e)}",
            career_advice="",
            wealth_analysis="",
            relationship_analysis="",
            health_warnings=[]
        )
```

**Step 5: Create main FastAPI app**

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api import chart, analysis
from backend.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="基於倪海廈智慧的紫微斗數分析系統",
    version="1.0.0"
)

# CORS 設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 註冊路由
app.include_router(chart.router)
app.include_router(analysis.router)

@app.get("/")
async def root():
    return {
        "message": "歡迎使用倪師斗數 API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

**Step 6: Install backend dependencies**

```bash
pip install pydantic-settings
```

**Step 7: Test backend starts**

```bash
cd /home/hero/ai/倪師斗數
uvicorn backend.main:app --reload --port 8000
```

Expected: Server starts, visit http://localhost:8000/docs to see API docs

**Step 8: Commit**

```bash
git add backend/
git commit -m "feat: add FastAPI backend with chart analysis endpoints"
```

---

### Task 5: Connect Frontend to Backend

**Files:**
- Create: `frontend/lib/api.ts`
- Modify: `frontend/app/page.tsx`
- Create: `frontend/components/AnalysisPanel.tsx`

**Step 1: Create API client**

```typescript
// frontend/lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PatternInfo {
  name: string;
  type: string;
  meaning: string;
  effect?: string;
}

export interface AnalysisResult {
  patterns: PatternInfo[];
  personality_summary: string;
  career_advice: string;
  wealth_analysis: string;
  relationship_analysis: string;
  health_warnings: string[];
  yearly_forecast?: string;
}

export async function analyzePatterns(
  birthData: any,
  palaces: any[]
): Promise<PatternInfo[]> {
  const res = await fetch(`${API_BASE}/chart/analyze-patterns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ birth_data: birthData, palaces }),
  });

  if (!res.ok) throw new Error('分析失敗');
  return res.json();
}

export async function getFullAnalysis(
  birthData: any,
  palaces: any[],
  patterns: PatternInfo[]
): Promise<AnalysisResult> {
  const res = await fetch(`${API_BASE}/analysis/full`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      birth_data: {
        year: birthData.year,
        month: birthData.month,
        day: birthData.day,
        hour: birthData.hour,
        gender: birthData.gender,
        name: birthData.name,
        is_lunar: birthData.isLunar,
      },
      palaces: palaces.map(p => ({
        name: p.name,
        heavenly_stem: p.heavenlyStem,
        earthly_branch: p.earthlyBranch,
        major_stars: p.majorStars,
        minor_stars: p.minorStars,
        is_body_palace: p.isBodyPalace,
        is_soul_palace: p.isSoulPalace,
      })),
      patterns,
    }),
  });

  if (!res.ok) throw new Error('分析失敗');
  return res.json();
}
```

**Step 2: Create Analysis Panel component**

```typescript
// frontend/components/AnalysisPanel.tsx
'use client';

import { AnalysisResult, PatternInfo } from '@/lib/api';
import { clsx } from 'clsx';

interface AnalysisPanelProps {
  patterns: PatternInfo[];
  analysis: AnalysisResult | null;
  loading: boolean;
}

export function AnalysisPanel({ patterns, analysis, loading }: AnalysisPanelProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-900">命盤分析</h2>

      {/* 格局 */}
      {patterns.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">格局</h3>
          <div className="space-y-2">
            {patterns.map((p, i) => (
              <div
                key={i}
                className={clsx(
                  'p-3 rounded-lg',
                  p.type === '吉格' && 'bg-green-50 border border-green-200',
                  p.type === '凶格' && 'bg-red-50 border border-red-200',
                  p.type === '特殊格局' && 'bg-purple-50 border border-purple-200'
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      p.type === '吉格' && 'bg-green-200 text-green-800',
                      p.type === '凶格' && 'bg-red-200 text-red-800',
                      p.type === '特殊格局' && 'bg-purple-200 text-purple-800'
                    )}
                  >
                    {p.type}
                  </span>
                  <span className="font-medium">{p.name}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{p.meaning}</p>
                {p.effect && (
                  <p className="text-sm text-gray-500 mt-1">效果：{p.effect}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 分析結果 */}
      {analysis && (
        <>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">性格分析</h3>
            <p className="text-gray-600">{analysis.personality_summary}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">事業建議</h3>
            <p className="text-gray-600">{analysis.career_advice}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">財運分析</h3>
            <p className="text-gray-600">{analysis.wealth_analysis}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">感情分析</h3>
            <p className="text-gray-600">{analysis.relationship_analysis}</p>
          </div>

          {analysis.health_warnings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">健康提醒</h3>
              <ul className="list-disc list-inside text-gray-600">
                {analysis.health_warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {!analysis && patterns.length === 0 && (
        <p className="text-gray-500">請先排盤以獲得分析結果</p>
      )}
    </div>
  );
}
```

**Step 3: Update main page**

```typescript
// frontend/app/page.tsx
'use client';

import { useState } from 'react';
import { ChartForm } from '@/components/ChartForm';
import { AstrolabeChart } from '@/components/AstrolabeChart';
import { AnalysisPanel } from '@/components/AnalysisPanel';
import { calculateAstrolabe, AstrolabeData } from '@/lib/astrolabe';
import { analyzePatterns, getFullAnalysis, PatternInfo, AnalysisResult } from '@/lib/api';
import { BirthData } from '@/lib/types';

export default function Home() {
  const [astrolabeData, setAstrolabeData] = useState<AstrolabeData | null>(null);
  const [patterns, setPatterns] = useState<PatternInfo[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: BirthData) => {
    // 1. 計算命盤
    const result = calculateAstrolabe(data);
    setAstrolabeData(result);
    setLoading(true);

    try {
      // 2. 分析格局
      const patternsResult = await analyzePatterns(data, result.palaces);
      setPatterns(patternsResult);

      // 3. 完整分析
      const analysisResult = await getFullAnalysis(data, result.palaces, patternsResult);
      setAnalysis(analysisResult);
    } catch (error) {
      console.error('分析失敗:', error);
      // 使用本地分析
      setPatterns([]);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          倪師斗數
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 左側：輸入表單 */}
          <div className="lg:col-span-1">
            <ChartForm onSubmit={handleSubmit} />
          </div>

          {/* 中間：命盤顯示 */}
          <div className="lg:col-span-2">
            {astrolabeData ? (
              <AstrolabeChart data={astrolabeData} />
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500 h-full flex items-center justify-center">
                請輸入出生資料以排盤
              </div>
            )}
          </div>

          {/* 右側：分析結果 */}
          <div className="lg:col-span-1">
            <AnalysisPanel
              patterns={patterns}
              analysis={analysis}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
```

**Step 4: Create .env.local**

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 5: Verify full integration**

Terminal 1: `cd backend && uvicorn backend.main:app --reload --port 8000`
Terminal 2: `cd frontend && npm run dev`

Visit http://localhost:3000, enter birth data, verify:
- Chart displays correctly
- API is called
- Analysis shows (even if basic)

**Step 6: Commit**

```bash
git add .
git commit -m "feat: connect frontend to backend API for analysis"
```

---

## Phase 4: Enhanced Features

### Task 6: Add Feng Shui Analysis Page

**Files:**
- Create: `frontend/app/fengshui/page.tsx`
- Create: `frontend/components/FengshuiForm.tsx`
- Create: `backend/api/fengshui.py`

**Step 1: Create Feng Shui API endpoint**

```python
# backend/api/fengshui.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import json
from pathlib import Path

router = APIRouter(prefix="/fengshui", tags=["fengshui"])

RULES_DIR = Path(__file__).parent.parent / "rules"

with open(RULES_DIR / "fengshui.json", "r", encoding="utf-8") as f:
    FENGSHUI_RULES = json.load(f)

class RoomPosition(BaseModel):
    position: str  # 東、西、南、北、東北、東南、西北、西南、中央
    element: str   # 廚房、廁所、臥室、客廳、書房、門

class FengshuiRequest(BaseModel):
    rooms: List[RoomPosition]
    residents: Optional[List[str]] = None  # 居住者生肖或命盤資訊

class FengshuiIssue(BaseModel):
    position: str
    element: str
    effect: str
    remedy: str
    severity: str  # 輕微、中等、嚴重

class FengshuiResponse(BaseModel):
    issues: List[FengshuiIssue]
    overall_score: int  # 0-100
    recommendations: List[str]

@router.post("/analyze")
async def analyze_fengshui(request: FengshuiRequest) -> FengshuiResponse:
    """分析風水格局"""
    issues = []

    for room in request.rooms:
        # 查找對應規則
        for rule in FENGSHUI_RULES.get("凶宅判斷", []):
            if rule.get("position") == room.position and rule.get("element") == room.element:
                issues.append(FengshuiIssue(
                    position=room.position,
                    element=room.element,
                    effect=rule.get("effect", ""),
                    remedy=rule.get("remedy", ""),
                    severity=rule.get("severity", "中等")
                ))

    # 計算總分
    score = 100 - (len(issues) * 15)
    score = max(0, min(100, score))

    # 建議
    recommendations = []
    if score < 60:
        recommendations.append("建議諮詢專業風水師進行調整")
    if any(i.severity == "嚴重" for i in issues):
        recommendations.append("有嚴重風水問題，需要立即處理")

    return FengshuiResponse(
        issues=issues,
        overall_score=score,
        recommendations=recommendations
    )

@router.get("/rules")
async def get_fengshui_rules():
    """獲取風水規則"""
    return FENGSHUI_RULES
```

**Step 2: Register router in main.py**

```python
# Add to backend/main.py
from backend.api import chart, analysis, fengshui

# Add to router registration
app.include_router(fengshui.router)
```

**Step 3: Create Feng Shui page**

```typescript
// frontend/app/fengshui/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

interface RoomPosition {
  position: string;
  element: string;
}

interface FengshuiIssue {
  position: string;
  element: string;
  effect: string;
  remedy: string;
  severity: string;
}

const POSITIONS = [
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

const ELEMENTS = [
  { label: '廚房', value: '廚房' },
  { label: '廁所', value: '廁所' },
  { label: '臥室', value: '臥室' },
  { label: '客廳', value: '客廳' },
  { label: '書房', value: '書房' },
  { label: '大門', value: '門' },
];

export default function FengshuiPage() {
  const [rooms, setRooms] = useState<RoomPosition[]>([
    { position: '東', element: '廚房' }
  ]);
  const [result, setResult] = useState<{
    issues: FengshuiIssue[];
    overall_score: number;
    recommendations: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const addRoom = () => {
    setRooms([...rooms, { position: '東', element: '廚房' }]);
  };

  const removeRoom = (index: number) => {
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const updateRoom = (index: number, field: keyof RoomPosition, value: string) => {
    const newRooms = [...rooms];
    newRooms[index][field] = value;
    setRooms(newRooms);
  };

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/fengshui/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('分析失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          風水分析
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 輸入區 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">格局輸入</h2>

            <div className="space-y-4">
              {rooms.map((room, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <Select
                    label={index === 0 ? '方位' : undefined}
                    options={POSITIONS}
                    value={room.position}
                    onChange={(e) => updateRoom(index, 'position', e.target.value)}
                  />
                  <Select
                    label={index === 0 ? '房間' : undefined}
                    options={ELEMENTS}
                    value={room.element}
                    onChange={(e) => updateRoom(index, 'element', e.target.value)}
                  />
                  {rooms.length > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => removeRoom(index)}
                    >
                      移除
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={addRoom}>
                新增房間
              </Button>
              <Button onClick={analyze} disabled={loading}>
                {loading ? '分析中...' : '開始分析'}
              </Button>
            </div>
          </div>

          {/* 結果區 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">分析結果</h2>

            {result ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600">
                    {result.overall_score}
                  </div>
                  <div className="text-gray-500">風水評分</div>
                </div>

                {result.issues.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">發現問題：</h3>
                    <div className="space-y-2">
                      {result.issues.map((issue, i) => (
                        <div
                          key={i}
                          className="p-3 bg-red-50 rounded-lg border border-red-200"
                        >
                          <div className="font-medium">
                            {issue.position}{issue.element}
                          </div>
                          <div className="text-sm text-gray-600">
                            {issue.effect}
                          </div>
                          <div className="text-sm text-green-600 mt-1">
                            化解：{issue.remedy}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">建議：</h3>
                    <ul className="list-disc list-inside text-gray-600">
                      {result.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.issues.length === 0 && (
                  <p className="text-green-600">
                    恭喜！目前格局未發現明顯風水問題。
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">請輸入格局資訊後進行分析</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
```

**Step 4: Update fengshui.json with more rules**

```json
// backend/rules/fengshui.json - 確保有這些規則
{
  "凶宅判斷": [
    {
      "position": "西北",
      "element": "廚房",
      "effect": "傷害男主人，可能導致丈夫早逝或重病",
      "remedy": "避免在西北方設廚房，如已存在可放置銅製品化解",
      "severity": "嚴重"
    },
    {
      "position": "西南",
      "element": "廚房",
      "effect": "傷害女主人，可能導致妻子健康問題",
      "remedy": "移動廚房位置或放置黃色物品化解",
      "severity": "嚴重"
    },
    {
      "position": "中央",
      "element": "廁所",
      "effect": "破財且影響全家健康",
      "remedy": "保持廁所乾燥通風，放置植物淨化",
      "severity": "中等"
    }
  ]
}
```

**Step 5: Add navigation**

```typescript
// frontend/components/Navigation.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { href: '/', label: '命盤排盤' },
  { href: '/fengshui', label: '風水分析' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            倪師斗數
          </Link>

          <div className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'px-3 py-2 rounded-md text-sm font-medium',
                  pathname === item.href
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

**Step 6: Update layout.tsx**

```typescript
// frontend/app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '倪師斗數',
  description: '基於倪海廈智慧的紫微斗數分析系統',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add feng shui analysis page"
```

---

### Task 7: Add Divination (六壬速斷) Page

**Files:**
- Create: `frontend/app/divination/page.tsx`
- Create: `backend/api/divination.py`

**Step 1: Create Divination API**

```python
# backend/api/divination.py
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
import json
from pathlib import Path

router = APIRouter(prefix="/divination", tags=["divination"])

RULES_DIR = Path(__file__).parent.parent / "rules"

with open(RULES_DIR / "divination.json", "r", encoding="utf-8") as f:
    DIVINATION_RULES = json.load(f)

class DivinationRequest(BaseModel):
    method: str = "六壬速斷"
    question: str
    timestamp: datetime = None

class DivinationResult(BaseModel):
    method: str
    hexagram: str
    interpretation: str
    advice: str

DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]

@router.post("/divine")
async def divine(request: DivinationRequest) -> DivinationResult:
    """進行卜卦"""
    timestamp = request.timestamp or datetime.now()

    if request.method == "六壬速斷":
        # 月份對應地支
        month_zhi = DIZHI[(timestamp.month - 1) % 12]
        # 日期累加
        day_zhi = DIZHI[(timestamp.day - 1) % 12]
        # 時辰
        hour_zhi = DIZHI[timestamp.hour // 2 % 12]

        # 簡化的六壬速斷
        result_index = (timestamp.month + timestamp.day + timestamp.hour) % 12
        result_zhi = DIZHI[result_index]

        # 查找解釋
        interpretations = DIVINATION_RULES.get("六壬速斷", {}).get("解釋", {})
        interpretation = interpretations.get(result_zhi, "待解析")

        return DivinationResult(
            method="六壬速斷",
            hexagram=f"{month_zhi}月{day_zhi}日{hour_zhi}時 → {result_zhi}",
            interpretation=interpretation,
            advice="建議結合實際情況綜合判斷"
        )

    return DivinationResult(
        method=request.method,
        hexagram="",
        interpretation="暫不支援此卜卦方法",
        advice=""
    )

@router.get("/methods")
async def get_methods():
    """獲取支援的卜卦方法"""
    return ["六壬速斷", "易經卜卦"]
```

**Step 2: Register router**

Add to backend/main.py:
```python
from backend.api import divination
app.include_router(divination.router)
```

**Step 3: Create Divination page**

```typescript
// frontend/app/divination/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface DivinationResult {
  method: string;
  hexagram: string;
  interpretation: string;
  advice: string;
}

export default function DivinationPage() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<DivinationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const divine = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/divination/divine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: '六壬速斷',
          question,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('卜卦失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900">
          六壬速斷
        </h1>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">您的問題</h2>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="請輸入您想問的問題..."
            />
          </div>

          <Button onClick={divine} disabled={loading || !question.trim()} className="w-full">
            {loading ? '卜卦中...' : '開始卜卦'}
          </Button>

          {result && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h3 className="font-semibold text-gray-800">卦象</h3>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {result.hexagram}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">解釋</h3>
                <p className="text-gray-600 mt-1">{result.interpretation}</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800">建議</h3>
                <p className="text-gray-600 mt-1">{result.advice}</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
          <h3 className="font-semibold mb-2">關於六壬速斷</h3>
          <p>
            六壬速斷是倪海廈老師教授的快速占卜方法，以月、日、時辰推算，
            可用於判斷事情吉凶、尋找失物、決策參考等。
          </p>
        </div>
      </div>
    </main>
  );
}
```

**Step 4: Update Navigation**

```typescript
// frontend/components/Navigation.tsx - 更新 NAV_ITEMS
const NAV_ITEMS = [
  { href: '/', label: '命盤排盤' },
  { href: '/fengshui', label: '風水分析' },
  { href: '/divination', label: '六壬速斷' },
];
```

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add divination page with 六壬速斷"
```

---

## Summary

This plan implements:
- **Phase 2**: iztro integration for chart calculation
- **Phase 3**: FastAPI backend with pattern matching and AI analysis
- **Phase 4**: Full frontend with chart visualization, feng shui, and divination

Total: 7 tasks, each with clear steps and commit points.
