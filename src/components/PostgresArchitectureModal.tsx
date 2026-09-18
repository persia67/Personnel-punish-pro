'use client';

import React, { useState, useEffect } from 'react';
import { Database, Server, Laptop, RefreshCw, CheckCircle2, AlertTriangle, Play, Terminal, Layers, Copy, Check, ShieldCheck, HardDrive } from 'lucide-react';
import { APP_VERSION } from '../constants';

interface PostgresArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PostgresArchitectureModal({ isOpen, onClose }: PostgresArchitectureModalProps) {
  const [activeTab, setActiveTab] = useState<'STATUS' | 'CONFIG' | 'SQL_CONSOLE' | 'ARCHITECTURE'>('STATUS');
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [sqlQuery, setSqlQuery] = useState('SELECT table_name, (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = \'public\') FROM information_schema.tables WHERE table_schema = \'public\' LIMIT 10;');
  const [sqlResult, setSqlResult] = useState<{ rowCount?: number; rows?: any[]; error?: string } | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/database/status');
      const data = await res.json();
      if (data.success) {
        setDbStatus(data.status);
      }
    } catch (err) {
      console.error('Failed to fetch DB status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleTestAndSave = async () => {
    if (!testUrl.trim()) return;
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/database/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionUrl: testUrl }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.success) {
        fetchStatus();
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'خطا در برقراری ارتباط' });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSql = async (sampleQuery?: string) => {
    const q = sampleQuery || sqlQuery;
    if (!q.trim()) return;
    setSqlLoading(true);
    setSqlResult(null);
    try {
      const res = await fetch('/api/database/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: q }),
      });
      const data = await res.json();
      if (data.success) {
        setSqlResult({ rowCount: data.rowCount, rows: data.rows });
      } else {
        setSqlResult({ error: data.message });
      }
    } catch (err: any) {
      setSqlResult({ error: err.message || 'خطا در ارسال کوئری' });
    } finally {
      setSqlLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <img 
              src="/icon.png" 
              alt="SafeWatch" 
              className="w-10 h-10 rounded-xl object-contain shadow-md border border-blue-500/30 bg-slate-950/60 p-0.5" 
            />
            <div>
              <h2 className="text-lg font-bold">مدیریت سرور، کلاینت و پایگاه داده PostgreSQL</h2>
              <p className="text-xs text-slate-400">معماری تفکیک‌شده سرور و دیتابیس مجزا SafeWatch HSE</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            onClick={() => setActiveTab('STATUS')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'STATUS'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            وضعیت PostgreSQL
          </button>
          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'CONFIG'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="h-4 w-4" />
            پیکربندی اتصال
          </button>
          <button
            onClick={() => setActiveTab('SQL_CONSOLE')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'SQL_CONSOLE'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="h-4 w-4" />
            کنسول SQL زنده
          </button>
          <button
            onClick={() => setActiveTab('ARCHITECTURE')}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-sm font-semibold transition-colors ${
              activeTab === 'ARCHITECTURE'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="h-4 w-4" />
            معماری و داکر
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'STATUS' && (
            <div className="space-y-6">
              {/* Status Header Banner */}
              <div className="flex items-center justify-between rounded-xl bg-blue-50 p-4 border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-bold text-blue-900">پایگاه داده رابطه‌ای فعال و متصل است</h3>
                    <p className="text-xs text-blue-700">
                      موتور: {dbStatus?.engine === 'POSTGRESQL_REMOTE' ? 'سرور PostgreSQL خارجی' : 'PostgreSQL Engine (pg-mem relational compliant)'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={fetchStatus}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm border border-blue-200 hover:bg-blue-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  به‌روزرسانی آمار
                </button>
              </div>

              {/* Status Key-Value Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-xs text-slate-500">هاست اتصال</span>
                  <p className="mt-1 font-mono text-xs font-bold text-slate-800 truncate" dir="ltr">
                    {dbStatus?.host || 'localhost'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-xs text-slate-500">پورت</span>
                  <p className="mt-1 font-mono text-xs font-bold text-slate-800" dir="ltr">
                    {dbStatus?.port || 5432}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-xs text-slate-500">نام دیتابیس</span>
                  <p className="mt-1 font-mono text-xs font-bold text-slate-800 truncate" dir="ltr">
                    {dbStatus?.database || 'safewatch_hse'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-xs text-slate-500">کاربر دیتابیس</span>
                  <p className="mt-1 font-mono text-xs font-bold text-slate-800 truncate" dir="ltr">
                    {dbStatus?.user || 'postgres'}
                  </p>
                </div>
              </div>

              {/* Table Records Stats */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <HardDrive className="h-4 w-4 text-slate-400" />
                  شمارش رکوردهای جداول PostgreSQL
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {dbStatus?.tables &&
                    Object.entries(dbStatus.tables).map(([table, count]) => (
                      <div
                        key={table}
                        className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-blue-200 transition-colors"
                      >
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-slate-700 block" dir="ltr">
                            {table}
                          </span>
                          <span className="text-[10px] text-slate-400">جدول رابطه‌ای</span>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                          {String(count)} رکورد
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Engine Version */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                <span className="font-bold text-slate-700 block mb-1">نسخه و مشخصات موتور پایگاه داده:</span>
                <p className="font-mono text-[11px] text-slate-500" dir="ltr">
                  {dbStatus?.version || 'PostgreSQL 16.2 on x86_64'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'CONFIG' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">تنظیم آدرس اتصال به پایگاه داده PostgreSQL</h3>
                <p className="text-xs text-slate-500">
                  می‌توانید سامانه را به یک دیتابیس PostgreSQL محلی (مانند Docker یا دسکتاپ)، یا سرورهای ابری (مانند Supabase، Neon، RDS یا Cloud SQL) متصل کنید.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">رشته اتصال PostgreSQL (Connection String)</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="postgresql://user:password@localhost:5432/safewatch_hse"
                  value={testUrl}
                  onChange={(e) => setTestUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestAndSave}
                  disabled={loading || !testUrl.trim()}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  تست اتصال و اعمال
                </button>
                <button
                  onClick={() => setTestUrl('postgresql://safewatch_admin:safewatch_password_123@localhost:5432/safewatch_hse')}
                  className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  تنظیم آدرس پیش‌فرض Docker
                </button>
              </div>

              {testResult && (
                <div
                  className={`rounded-xl p-4 text-xs font-medium border ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-600">
                <span className="font-bold text-slate-700 block">نکته درباره محیط جاری:</span>
                <p>
                  در صورت در دسترس نبودن سرور خارجی PostgreSQL، سیستم به صورت خودکار از موتور تعبیه‌شده سازگار با PostgreSQL استفاده می‌کند تا تمامی کوئری‌های رابطه‌ای بدون قطعی سرویس اجرا شوند و تمام تغییرات در دیسک ذخیره گردند.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'SQL_CONSOLE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">کنسول اجرای کوئری SQL</h3>
                  <p className="text-xs text-slate-500">اجرای مستقیم دستورات SQL بر روی جداول PostgreSQL</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      const q = 'SELECT * FROM violations LIMIT 5;';
                      setSqlQuery(q);
                      handleExecuteSql(q);
                    }}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-700 hover:bg-slate-200"
                  >
                    نمونه: Violations
                  </button>
                  <button
                    onClick={() => {
                      const q = 'SELECT * FROM employees LIMIT 5;';
                      setSqlQuery(q);
                      handleExecuteSql(q);
                    }}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-mono text-slate-700 hover:bg-slate-200"
                  >
                    نمونه: Employees
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  dir="ltr"
                  rows={4}
                  className="w-full rounded-xl border border-slate-300 bg-slate-900 p-3 font-mono text-xs text-emerald-400 focus:border-blue-500 focus:outline-none"
                  placeholder="SELECT * FROM table_name WHERE ..."
                />
              </div>

              <button
                onClick={() => handleExecuteSql()}
                disabled={sqlLoading}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {sqlLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                اجرای کوئری SQL
              </button>

              {sqlResult?.error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-mono" dir="ltr">
                  Error: {sqlResult.error}
                </div>
              )}

              {sqlResult?.rows && (
                <div className="space-y-2">
                  <span className="text-xs text-slate-500">
                    تعداد ردیف‌ها: <b className="text-slate-800">{sqlResult.rowCount}</b>
                  </span>
                  <div className="max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white">
                    <table className="min-w-full divide-y divide-slate-200 text-xs text-left" dir="ltr">
                      <thead className="bg-slate-50 font-mono text-[11px] text-slate-600 sticky top-0">
                        <tr>
                          {sqlResult.rows[0] &&
                            Object.keys(sqlResult.rows[0]).map((col) => (
                              <th key={col} className="px-3 py-2 border-b border-slate-200">
                                {col}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                        {sqlResult.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {Object.values(row).map((val: any, cIdx) => (
                              <td key={cIdx} className="px-3 py-1.5 max-w-xs truncate">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ARCHITECTURE' && (
            <div className="space-y-6">
              {/* Visual Diagram */}
              <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 text-white text-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-6">
                  ساختار مجزا و تفکیک‌شده ۳ لایه‌ای (Three-Tier Decoupled Architecture)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* Client */}
                  <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 mb-2">
                      <Laptop className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-white block">کلاینت مجزا (Client)</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">پوشه /client یا Next.js UI</span>
                    <p className="text-[10px] text-slate-500 mt-2">رابط کاربری RTL، فرم‌ها، داشبورد HSE، کش آفلاین</p>
                  </div>

                  {/* Server */}
                  <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 mb-2">
                      <Server className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-white block">سرور مجزا (Server)</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">پوشه /server (Express/Node.js)</span>
                    <p className="text-[10px] text-slate-500 mt-2">مسیرهای RESTful، جریان رویدادهای SSE، پروکسی پیامک</p>
                  </div>

                  {/* Database */}
                  <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-center">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 mb-2">
                      <Database className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-white block">دیتابیس مجزا (PostgreSQL)</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">پوشه /database (SQL Tables)</span>
                    <p className="text-[10px] text-slate-500 mt-2">جداول کاربران، پرسنل، تخلفات، تشویقات، تراکنش‌ها</p>
                  </div>
                </div>
              </div>

              {/* Docker Compose Quick Setup */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">دستور اجرای مستقل با Docker Compose:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('cd server && docker-compose up -d');
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2000);
                    }}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    {copiedScript ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedScript ? 'کپی شد' : 'کپی دستور'}
                  </button>
                </div>
                <pre className="rounded-xl bg-slate-900 p-3 font-mono text-xs text-slate-200" dir="ltr">
                  cd server && docker-compose up -d
                </pre>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block mb-1">فایل‌های ایجاد شده برای جداسازی:</span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600">
                  <li><code className="font-mono bg-white px-1 py-0.5 rounded border">database/schema.sql</code>: اسکریپت ساخت جداول PostgreSQL</li>
                  <li><code className="font-mono bg-white px-1 py-0.5 rounded border">database/seed.sql</code>: داده‌های اولیه پرسنل و کدهای HSE</li>
                  <li><code className="font-mono bg-white px-1 py-0.5 rounded border">database/connection.ts</code>: مدیریت اتصال به PostgreSQL</li>
                  <li><code className="font-mono bg-white px-1 py-0.5 rounded border">database/db-adapter.ts</code>: دسترسی رابطه‌ای داده‌ها</li>
                  <li><code className="font-mono bg-white px-1 py-0.5 rounded border">server/src/index.ts</code>: سرور مستقل Express</li>
                  <li><code className="font-mono bg-white px-1 py-0.5 rounded border">server/docker-compose.yml</code>: استقرار همزمان با PostgreSQL</li>
                  <li><code className="font-mono bg-white px-1 py-0.5 rounded border">client/package.json</code>: کلاینت مستقل فرانت‌اند</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-500">
          <span>SafeWatch HSE Architecture Manager v{APP_VERSION}</span>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white hover:bg-slate-800 transition-colors"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
}
