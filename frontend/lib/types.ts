export interface BirthData {
  year: number;
  month: number;
  day: number;
  hour: number; // 0-12 for time periods
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
