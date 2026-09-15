import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar 
} from 'recharts';
import { Violation, Reward, AppSettings } from '../types';
import { 
  TrendingUp, 
  AlertTriangle, 
  Award, 
  Activity, 
  Calendar, 
  BarChart2, 
  CheckCircle,
  HelpCircle,
  Filter
} from 'lucide-react';

interface HseTrendDashboardProps {
  violations: Violation[];
  rewards: Reward[];
  settings: AppSettings;
}

export type RangeOption = 7 | 15 | 30 | 90 | 'ALL';

// Helper to convert Persian/Arabic digits to English digits
export function toEnglishDigits(str: string): string {
  if (!str) return '';
  const map: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  return str.replace(/[۰-۹٠-٩]/g, (w) => map[w] || w);
}

// Robust date normalizer to YYYY/MM/DD
export function normalizeDate(dStr: string): string {
  if (!dStr) return '';
  let clean = toEnglishDigits(String(dStr)).trim();
  
  // Try YYYY/MM/DD or YYYY-MM-DD pattern first
  const matchYMD = clean.match(/^(\d{4})[/\.-](\d{1,2})[/\.-](\d{1,2})/);
  if (matchYMD) {
    const y = matchYMD[1];
    const m = matchYMD[2].padStart(2, '0');
    const d = matchYMD[3].padStart(2, '0');
    return `${y}/${m}/${d}`;
  }

  // Try DD/MM/YYYY or D/M/YYYY
  const matchDMY = clean.match(/^(\d{1,2})[/\.-](\d{1,2})[/\.-](\d{4})/);
  if (matchDMY) {
    const d = matchDMY[1].padStart(2, '0');
    const m = matchDMY[2].padStart(2, '0');
    const y = matchDMY[3];
    return `${y}/${m}/${d}`;
  }

  // Fallback cleanup
  clean = clean.replace(/-/g, '/').replace(/[^0-9/]/g, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts.length >= 3) {
    const y = parts[0].padStart(4, '0');
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
  return clean;
}

// Subtract days in Jalali calendar
function subtractJalaliDays(dateStr: string, days: number): string {
  const parts = dateStr.split('/');
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  let d = parseInt(parts[2], 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;

  const getDaysInMonth = (year: number, month: number) => {
    if (month >= 1 && month <= 6) return 31;
    if (month >= 7 && month <= 11) return 30;
    if (month === 12) {
      const isLeap = [1391, 1395, 1399, 1403, 1407, 1411, 1415, 1419, 1423].includes(year);
      return isLeap ? 30 : 29;
    }
    return 30;
  };

  for (let i = 0; i < days; i++) {
    d--;
    if (d < 1) {
      m--;
      if (m < 1) {
        m = 12;
        y--;
      }
      d = getDaysInMonth(y, m);
    }
  }

  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}/${mm}/${dd}`;
}

// Subtract days in Gregorian calendar
function subtractGregorianDays(dateStr: string, days: number): string {
  const d = new Date(dateStr.replace(/\//g, '-'));
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

// Add 1 Jalali day
function addOneJalaliDay(dateStr: string): string {
  const parts = dateStr.split('/');
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  let d = parseInt(parts[2], 10);

  const getDaysInMonth = (year: number, month: number) => {
    if (month >= 1 && month <= 6) return 31;
    if (month >= 7 && month <= 11) return 30;
    if (month === 12) {
      const isLeap = [1391, 1395, 1399, 1403, 1407, 1411, 1415, 1419, 1423].includes(year);
      return isLeap ? 30 : 29;
    }
    return 30;
  };

  d++;
  if (d > getDaysInMonth(y, m)) {
    d = 1;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}/${mm}/${dd}`;
}

// Add 1 Gregorian day
function addOneGregorianDay(dateStr: string): string {
  const d = new Date(dateStr.replace(/\//g, '-'));
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function addOneDay(dateStr: string): string {
  const parts = dateStr.split('/');
  const year = parseInt(parts[0], 10);
  if (year < 1600) {
    return addOneJalaliDay(dateStr);
  } else {
    return addOneGregorianDay(dateStr);
  }
}

// Generate N days backwards
function getNDaysRange(referenceDateStr: string, rangeDays: number): string[] {
  const normalized = normalizeDate(referenceDateStr);
  const parts = normalized.split('/');
  if (parts.length !== 3) return [];
  const year = parseInt(parts[0], 10);
  
  const isJalali = year < 1600;
  const days: string[] = [];
  
  for (let i = rangeDays - 1; i >= 0; i--) {
    if (isJalali) {
      days.push(subtractJalaliDays(normalized, i));
    } else {
      days.push(subtractGregorianDays(normalized, i));
    }
  }
  return days;
}

// Generate range between min and max date
function getDaysBetween(minDateStr: string, maxDateStr: string): string[] {
  const startNorm = normalizeDate(minDateStr);
  const endNorm = normalizeDate(maxDateStr);

  if (!startNorm || !endNorm) return [];
  if (startNorm >= endNorm) return [startNorm];

  const days: string[] = [];
  let current = startNorm;
  
  let guard = 0;
  while (current <= endNorm && guard < 366) {
    days.push(current);
    if (current === endNorm) break;
    const next = addOneDay(current);
    if (next === current) break;
    current = next;
    guard++;
  }
  return days;
}

const HseTrendDashboard: React.FC<HseTrendDashboardProps> = ({ violations, rewards, settings }) => {
  const isFa = settings.language === 'fa';
  const [chartType, setChartType] = useState<'daily' | 'cumulative'>('daily');

  // Smart initial range selection: Default to 'ALL' if there are records outside the last 30 days
  const [rangeDays, setRangeDays] = useState<RangeOption>('ALL');

  // All extracted normalized dates
  const allNormalizedDates = useMemo(() => {
    return [
      ...violations.map(v => normalizeDate(v.date)),
      ...rewards.map(r => normalizeDate(r.date))
    ].filter(Boolean);
  }, [violations, rewards]);

  // Determine reference date (latest date or today)
  const referenceDate = useMemo(() => {
    if (allNormalizedDates.length === 0) {
      const todayLoc = new Date().toLocaleDateString(isFa ? 'fa-IR' : 'en-US');
      return normalizeDate(todayLoc);
    }
    const sorted = [...allNormalizedDates].sort((a, b) => b.localeCompare(a));
    return sorted[0];
  }, [allNormalizedDates, isFa]);

  // Determine min date
  const minDate = useMemo(() => {
    if (allNormalizedDates.length === 0) {
      return referenceDate;
    }
    const sorted = [...allNormalizedDates].sort((a, b) => a.localeCompare(b));
    return sorted[0];
  }, [allNormalizedDates, referenceDate]);

  // Timeline computation
  const timeline = useMemo(() => {
    if (rangeDays === 'ALL') {
      if (allNormalizedDates.length === 0) {
        return getNDaysRange(referenceDate, 7);
      }
      return getDaysBetween(minDate, referenceDate);
    } else {
      return getNDaysRange(referenceDate, rangeDays as number);
    }
  }, [rangeDays, referenceDate, minDate, allNormalizedDates]);

  // Range label text
  const rangeLabel = useMemo(() => {
    if (rangeDays === 'ALL') return isFa ? 'کل دوره ثبت‌شده' : 'All Time';
    return isFa ? `${rangeDays} روز گذشته` : `Last ${rangeDays} Days`;
  }, [isFa, rangeDays]);

  // Translations
  const t = useMemo(() => {
    return {
      title: isFa ? `تحلیل روند شاخص‌های عملکردی HSE (${rangeLabel})` : `HSE Performance Indicators Trend Analysis (${rangeLabel})`,
      subtitle: isFa ? 'رصد آماری رویدادها، تخلفات ثبت‌شده و مشوق‌های اعطایی به پرسنل' : 'Statistical monitoring of incidents, violations, and safety incentives',
      violations: isFa ? 'تخلفات ثبت‌شده' : 'Recorded Violations',
      rewards: isFa ? 'تشویق‌های ایمنی' : 'Safety Rewards',
      dailyView: isFa ? 'فراوانی روزانه' : 'Daily Frequency',
      cumulativeView: isFa ? 'انباشته تجمعی' : 'Cumulative Trend',
      totalViolations: isFa ? `تخلفات (${rangeLabel})` : `Violations (${rangeLabel})`,
      totalRewards: isFa ? `تشویق‌ها (${rangeLabel})` : `Rewards (${rangeLabel})`,
      hseScore: isFa ? 'شاخص توازن عملکرد ایمنی' : 'HSE Performance Balance',
      balanceDesc: isFa ? 'تفاضل تراز تشویق منهای تخلف؛ تراز مثبت نشانگر برتری رفتارهای ایمن است' : 'Rewards minus violations; positive balance indicates safer workplace behavior',
      noData: isFa ? `داده‌ای در بازه زمانی انتخاب شده (${rangeLabel}) یافت نشد.` : `No data recorded in the selected period (${rangeLabel}).`,
      legendTitle: isFa ? 'راهنمای نمودار:' : 'Chart Legend:',
      date: isFa ? 'تاریخ' : 'Date',
      value: isFa ? 'تعداد' : 'Count',
      days7: isFa ? '۷ روز' : '7 Days',
      days15: isFa ? '۱۵ روز' : '15 Days',
      days30: isFa ? '۳۰ روز' : '30 Days',
      days90: isFa ? '۹۰ روز' : '90 Days',
      allTime: isFa ? 'کل دوره' : 'All Time',
    };
  }, [isFa, rangeLabel]);

  // Aggregate stats & prepare chart data
  const { chartData, stats } = useMemo(() => {
    if (timeline.length === 0) {
      return { 
        chartData: [], 
        stats: { totalV: 0, totalR: 0, balance: 0, overallV: violations.length, overallR: rewards.length } 
      };
    }

    const violationsMap: Record<string, number> = {};
    const rewardsMap: Record<string, number> = {};

    timeline.forEach(day => {
      violationsMap[day] = 0;
      rewardsMap[day] = 0;
    });

    // Count violations
    violations.forEach(v => {
      const normalizedDay = normalizeDate(v.date);
      if (normalizedDay in violationsMap) {
        violationsMap[normalizedDay]++;
      }
    });

    // Count rewards
    rewards.forEach(r => {
      const normalizedDay = normalizeDate(r.date);
      if (normalizedDay in rewardsMap) {
        rewardsMap[normalizedDay]++;
      }
    });

    let cumViolations = 0;
    let cumRewards = 0;
    let totalV = 0;
    let totalR = 0;

    const data = timeline.map(day => {
      const vCount = violationsMap[day] || 0;
      const rCount = rewardsMap[day] || 0;

      totalV += vCount;
      totalR += rCount;

      cumViolations += vCount;
      cumRewards += rCount;

      const parts = day.split('/');
      const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : day;

      return {
        date: day,
        label,
        [t.violations]: vCount,
        [t.rewards]: rCount,
        cumViolations,
        cumRewards,
      };
    });

    return {
      chartData: data,
      stats: {
        totalV: rangeDays === 'ALL' ? violations.length : totalV,
        totalR: rangeDays === 'ALL' ? rewards.length : totalR,
        balance: (rangeDays === 'ALL' ? rewards.length : totalR) - (rangeDays === 'ALL' ? violations.length : totalV),
        overallV: violations.length,
        overallR: rewards.length
      }
    };
  }, [timeline, violations, rewards, t, rangeDays]);

  const hasData = stats.overallV > 0 || stats.overallR > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-white border border-gray-200/80 rounded-3xl shadow-xs p-5 md:p-6 mb-8 hover:shadow-md transition-shadow overflow-hidden"
    >
      
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 15 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-2xs"
            >
              <Activity className="w-4.5 h-4.5" />
            </motion.div>
            <h3 className="text-sm md:text-base font-black text-gray-800 leading-tight">
              {t.title}
            </h3>
          </div>
          <p className="text-[10px] md:text-xs text-gray-400 font-medium leading-normal">
            {t.subtitle} ({isFa ? `کل پرونده‌ها: ${stats.overallV} تخلف / ${stats.overallR} تشویق` : `Total Records: ${stats.overallV} Violations / ${stats.overallR} Rewards`})
          </p>
        </div>

        {/* View & Range Toggles */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          
          {/* Range Selector */}
          <div className="flex items-center bg-gray-100/80 p-1 rounded-xl gap-1">
            <Filter className="w-3.5 h-3.5 text-gray-400 mx-1" />
            {(['ALL', 30, 15, 7] as const).map(d => (
              <button
                key={String(d)}
                onClick={() => setRangeDays(d)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                  rangeDays === d
                    ? 'bg-white text-indigo-600 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {d === 'ALL' ? t.allTime : d === 30 ? t.days30 : d === 15 ? t.days15 : t.days7}
              </button>
            ))}
          </div>

          {/* Chart Type Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setChartType('daily')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border ${
                chartType === 'daily'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{t.dailyView}</span>
            </button>
            <button
              onClick={() => setChartType('cumulative')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border ${
                chartType === 'cumulative'
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t.cumulativeView}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mini stats cards */}
      <motion.div
        key={`${rangeDays}-${violations.length}-${rewards.length}`}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
          }
        }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >
        
        {/* Total Violations Card */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15, scale: 0.96 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
          }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100/60 flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] md:text-xs text-rose-600 font-bold block">{t.totalViolations}</span>
            <div className="h-7 flex items-center overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={stats.totalV}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="text-xl md:text-2xl font-black text-rose-700 font-mono leading-none block"
                >
                  {stats.totalV}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-rose-100 flex items-center justify-center text-rose-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Total Rewards Card */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15, scale: 0.96 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
          }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/60 flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] md:text-xs text-emerald-600 font-bold block">{t.totalRewards}</span>
            <div className="h-7 flex items-center overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={stats.totalR}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="text-xl md:text-2xl font-black text-emerald-700 font-mono leading-none block"
                >
                  {stats.totalR}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-emerald-100 flex items-center justify-center text-emerald-500">
            <Award className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Safety Balance Indicator */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15, scale: 0.96 },
            visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
          }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
          className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/60 flex items-center justify-between relative group"
        >
          <div className="space-y-1 flex-1">
            <span className="text-[10px] md:text-xs text-indigo-700 font-bold flex items-center gap-1">
              {t.hseScore}
              <div className="cursor-help text-indigo-400 hover:text-indigo-600 relative group">
                <HelpCircle className="w-3.5 h-3.5" />
                <div className={`absolute bottom-full mb-2 ${isFa ? 'right-0' : 'left-0'} hidden group-hover:block w-48 bg-slate-900 text-white text-[9px] p-2 rounded-lg shadow-xl z-30 font-medium leading-relaxed`}>
                  {t.balanceDesc}
                </div>
              </div>
            </span>
            <div className="h-7 flex items-center overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={stats.balance}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className={`text-xl md:text-2xl font-black font-mono leading-none block ${
                    stats.balance > 0 ? 'text-emerald-600' : stats.balance < 0 ? 'text-rose-600' : 'text-slate-600'
                  }`}
                >
                  {stats.balance > 0 ? `+${stats.balance}` : stats.balance}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl bg-white shadow-xs border flex items-center justify-center ${
            stats.balance > 0 ? 'border-emerald-100 text-emerald-500' : 'border-indigo-100 text-indigo-500'
          }`}>
            <CheckCircle className="w-5 h-5" />
          </div>
        </motion.div>

      </motion.div>

      {/* Main Chart Section with Animated Transition */}
      <div className="w-full relative min-h-[300px] flex flex-col justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {!hasData ? (
            <motion.div
              key="no-data"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-12 px-4 text-center"
            >
              <Calendar className="w-12 h-12 text-gray-300 mb-2.5 stroke-[1.5]" />
              <p className="text-xs font-bold text-gray-400 mb-1">{t.noData}</p>
              <p className="text-[10px] text-gray-400 font-medium max-w-sm">
                {isFa 
                  ? 'به محض ثبت تخلفات و تشویق‌های جدید با تاریخ‌های معتبر، آمار مربوطه در این نمودار نمایش داده می‌شود.' 
                  : 'As soon as new violations or rewards are logged with valid dates, the statistics will update here.'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={`${chartType}-${rangeDays}-${violations.length}-${rewards.length}`}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
              dir="ltr"
            >
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'daily' ? (
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '16px',
                        border: 'none',
                        color: '#f8fafc',
                        fontSize: '11px',
                        fontWeight: 600,
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        textAlign: isFa ? 'right' : 'left',
                        direction: isFa ? 'rtl' : 'ltr'
                      }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '10px' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                    />
                    <Bar 
                      dataKey={t.rewards} 
                      fill="#10b981" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={30}
                      isAnimationActive={true}
                      animationDuration={700}
                      animationEasing="ease-in-out"
                    />
                    <Bar 
                      dataKey={t.violations} 
                      fill="#ef4444" 
                      radius={[4, 4, 0, 0]} 
                      maxBarSize={30}
                      isAnimationActive={true}
                      animationDuration={700}
                      animationEasing="ease-in-out"
                    />
                  </BarChart>
                ) : (
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={{ stroke: '#e2e8f0' }}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderRadius: '16px',
                        border: 'none',
                        color: '#f8fafc',
                        fontSize: '11px',
                        fontWeight: 600,
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        textAlign: isFa ? 'right' : 'left',
                        direction: isFa ? 'rtl' : 'ltr'
                      }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '10px' }}
                      formatter={(value: any, name: any) => {
                        if (name === 'cumRewards') return [value, t.rewards];
                        if (name === 'cumViolations') return [value, t.violations];
                        return [value, name];
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }}
                      formatter={(value: any) => {
                        if (value === 'cumRewards') return t.rewards;
                        if (value === 'cumViolations') return t.violations;
                        return value;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumRewards" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorRewards)" 
                      isAnimationActive={true}
                      animationDuration={800}
                      animationEasing="ease-in-out"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumViolations" 
                      stroke="#ef4444" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorViolations)" 
                      isAnimationActive={true}
                      animationDuration={800}
                      animationEasing="ease-in-out"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
};

export default HseTrendDashboard;
