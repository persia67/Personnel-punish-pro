import React, { useState } from 'react';
import {
  Workflow,
  Zap,
  Globe,
  Key,
  Radio,
  CloudLightning,
  GitFork,
  RefreshCw,
  Save,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Copy,
  Check
} from 'lucide-react';

interface N8nConfig {
  baseUrl: string;
  webhookPath: string;
  apiKey?: string;
  isEnabled: boolean;
  nodeId?: string;
  triggerOnViolation?: boolean;
  triggerOnReward?: boolean;
  triggerOnEmployee?: boolean;
  triggerOnSync?: boolean;
  interconnectEnabled?: boolean;
  interconnectWebhookUrl?: string;
}

interface N8nSettingsTabProps {
  settings: any;
  n8nConfig: N8nConfig;
  setN8nConfigState: (config: N8nConfig) => void;
  handleSaveN8nConfig: (e: React.FormEvent) => void;
  handleTestN8n: () => void;
  handleTestInterconnectRelay: () => void;
  n8nTestLoading: boolean;
  n8nTestResult: {
    success: boolean;
    message: string;
    responseTimeMs?: number;
    statusCode?: number;
    responseData?: any;
  } | null;
}

export const N8nSettingsTab: React.FC<N8nSettingsTabProps> = ({
  settings,
  n8nConfig,
  setN8nConfigState,
  handleSaveN8nConfig,
  handleTestN8n,
  handleTestInterconnectRelay,
  n8nTestLoading,
  n8nTestResult
}) => {
  const [showSamplePayload, setShowSamplePayload] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-right" dir="rtl">
      
      {/* Banner / Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-indigo-500/30 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-700/50 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Workflow className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-base md:text-lg font-bold text-white">
                {settings.language === 'fa' ? 'موتور اتوماسیون n8n و ارتباط بین‌سیستمی' : 'n8n Automation Engine & Node Interconnectivity'}
              </h4>
              <p className="text-xs text-indigo-200 mt-0.5">
                {settings.language === 'fa' 
                  ? 'اتصال به سیستم‌های خودکارسازی شرکت، ارسال خودکار پیام‌ها و تبادل زونکن‌ها بین شعب' 
                  : 'Connect to corporate n8n workflows, auto-send alerts and share dossier binders between branches'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${n8nConfig.isEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-gray-700 text-gray-300'}`}>
              <span className={`w-2 h-2 rounded-full ${n8nConfig.isEnabled ? 'bg-emerald-400 animate-ping' : 'bg-gray-400'}`}></span>
              {n8nConfig.isEnabled ? (settings.language === 'fa' ? 'اتصال فعال' : 'Active') : (settings.language === 'fa' ? 'غیرفعال' : 'Disabled')}
            </span>
          </div>
        </div>

        <p className="text-xs text-indigo-150 leading-relaxed">
          {settings.language === 'fa' 
            ? 'با فعال‌سازی این قابلیت و معرفی آدرس n8n اجراشده در شبکه داخلی یا سرور شرکت، کلیه رویدادهای ثبت تخلف، تشویق، ویرایش پرونده‌ها و همگام‌سازی شبکه به‌صورت مستقیم به وب‌هوک n8n ارسال شده و امکان اجرای سناریوهای هوشمند (ارسال به تلگرام، بله، ایتا، ثبت در دیتابیس مرکزی و انتقال داده به سایر سیستم‌های SafeWatch در شعب) فراهم می‌گردد.'
            : 'Enable n8n integration to dispatch system events (violations, rewards, employee updates, sync packets) directly to your self-hosted n8n workflows or relay them to other installed SafeWatch system nodes.'}
        </p>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSaveN8nConfig} className="bg-white border border-gray-150 p-5 md:p-6 rounded-2xl shadow-sm space-y-6">
        
        {/* Enable Master Switch */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2.5 text-gray-800 font-bold text-sm md:text-base">
            <Zap className="w-5 h-5 text-amber-500" />
            {settings.language === 'fa' ? 'وضعیت فعال‌سازی سرویس اتوماسیون n8n' : 'n8n Integration Status'}
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={n8nConfig.isEnabled} 
              onChange={e => setN8nConfigState({ ...n8nConfig, isEnabled: e.target.checked })}
              className="sr-only peer" 
            />
            <div className="relative w-16 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-amber-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:-translate-x-10">
              <span className="absolute left-[8px] top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-500 font-sans select-none pointer-events-none z-10">
                {n8nConfig.isEnabled ? (settings.language === 'fa' ? 'فعال' : 'ON') : (settings.language === 'fa' ? 'خاموش' : 'OFF')}
              </span>
            </div>
          </label>
        </div>

        {/* Connection inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {settings.language === 'fa' ? 'آدرس سرور n8n (Server Base URL)' : 'n8n Server Base URL'}
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={n8nConfig.baseUrl}
                onChange={e => setN8nConfigState({ ...n8nConfig, baseUrl: e.target.value })}
                placeholder="http://192.168.1.100:5678"
                className="w-full pr-9 pl-3 py-2 border border-gray-250 rounded-lg text-xs font-mono text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">
              {settings.language === 'fa' ? 'مانند: http://192.168.1.100:5678 یا آدرس دامنه n8n شرکت' : 'e.g. http://192.168.1.100:5678 or https://n8n.company.com'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {settings.language === 'fa' ? 'مسیر یا URL وب‌هوک رویدادها (Webhook Path)' : 'Events Webhook Path / URL'}
            </label>
            <div className="relative">
              <Workflow className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={n8nConfig.webhookPath}
                onChange={e => setN8nConfigState({ ...n8nConfig, webhookPath: e.target.value })}
                placeholder="/webhook/safewatch-automation"
                className="w-full pr-9 pl-3 py-2 border border-gray-250 rounded-lg text-xs font-mono text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:outline-none"
                required
              />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">
              {settings.language === 'fa' ? 'مسیر وب‌هوک تنظیم‌شده در نود Webhook برنامه n8n' : 'Path configured in n8n Webhook trigger node'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {settings.language === 'fa' ? 'کلید امنیتی / توکن احراز هویت (API Key Header)' : 'API Key / Secret Token (Optional)'}
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input 
                type="password"
                value={n8nConfig.apiKey || ''}
                onChange={e => setN8nConfigState({ ...n8nConfig, apiKey: e.target.value })}
                placeholder="••••••••••••••••"
                className="w-full pr-9 pl-3 py-2 border border-gray-250 rounded-lg text-xs font-mono text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">
              {settings.language === 'fa' ? 'در صورت تنظیم، به عنوان Header در درخواست به n8n ارسال می‌شود' : 'Sent as Bearer & X-N8N-API-KEY header if set'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {settings.language === 'fa' ? 'شناسه یکتای این سیستم در شبکه (System Node ID)' : 'System Node Identifier'}
            </label>
            <div className="relative">
              <Radio className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={n8nConfig.nodeId || ''}
                onChange={e => setN8nConfigState({ ...n8nConfig, nodeId: e.target.value })}
                placeholder="SafeWatch-Node-North"
                className="w-full pr-9 pl-3 py-2 border border-gray-250 rounded-lg text-xs font-mono text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">
              {settings.language === 'fa' ? 'نام یا کد اختصاصی این شعبه برای تفکیک منبع رویدادها' : 'Unique ID to identify which branch/node generated the event'}
            </span>
          </div>
        </div>

        {/* Event Triggers Sub-section */}
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">
            <CloudLightning className="w-4 h-4 text-amber-600" />
            {settings.language === 'fa' ? 'انتخاب رویدادهای ارسالی خودکار به n8n' : 'Automated Event Dispatch Rules'}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox"
                checked={n8nConfig.triggerOnViolation !== false}
                onChange={e => setN8nConfigState({ ...n8nConfig, triggerOnViolation: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <div className="text-xs font-bold text-slate-700">
                {settings.language === 'fa' ? 'ارسال خودکار ثبت تخلفات و اخطارها' : 'Auto Dispatch Violations'}
              </div>
            </label>

            <label className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox"
                checked={n8nConfig.triggerOnReward !== false}
                onChange={e => setN8nConfigState({ ...n8nConfig, triggerOnReward: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <div className="text-xs font-bold text-slate-700">
                {settings.language === 'fa' ? 'ارسال خودکار تشویقی‌ها و امتیازات' : 'Auto Dispatch Rewards'}
              </div>
            </label>

            <label className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox"
                checked={n8nConfig.triggerOnEmployee !== false}
                onChange={e => setN8nConfigState({ ...n8nConfig, triggerOnEmployee: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <div className="text-xs font-bold text-slate-700">
                {settings.language === 'fa' ? 'ارسال بروزرسانی‌های پرونده پرسنلی' : 'Auto Dispatch Employee Dossier Updates'}
              </div>
            </label>

            <label className="flex items-center gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox"
                checked={n8nConfig.triggerOnSync !== false}
                onChange={e => setN8nConfigState({ ...n8nConfig, triggerOnSync: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
              />
              <div className="text-xs font-bold text-slate-700">
                {settings.language === 'fa' ? 'ارسال رویدادهای همگام‌سازی شبکه و زونکن‌ها' : 'Auto Dispatch Network Sync Packets'}
              </div>
            </label>
          </div>
        </div>

        {/* Interconnectivity Engine (Node-to-Node via n8n relay) */}
        <div className="bg-gradient-to-br from-indigo-50 via-slate-50 to-amber-50/40 border border-indigo-200 p-4.5 rounded-xl space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-150 pb-2.5">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs md:text-sm">
              <GitFork className="w-4 h-4 text-indigo-600" />
              {settings.language === 'fa' ? 'اتصال و تبادل مستقیم بین سیستم‌های نرم‌افزار (Interconnectivity Relay)' : 'Interconnectivity Engine (SafeWatch Node-to-Node)'}
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={n8nConfig.interconnectEnabled !== false} 
                onChange={e => setN8nConfigState({ ...n8nConfig, interconnectEnabled: e.target.checked })}
                className="sr-only peer" 
              />
              <div className="relative w-12 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-indigo-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:-translate-x-7"></div>
            </label>
          </div>

          <p className="text-[11px] text-gray-600 leading-relaxed">
            {settings.language === 'fa'
              ? 'با فعال‌سازی این قابلیت، چندین نسخه از نرم‌افزار SafeWatch مستقر در شعب مختلف از طریق شبکه n8n به یکدیگر متصل گردیده و اطلاعات پرونده پرسنل و زونکن‌ها به‌صورت شبکه‌ای بین نسخه‌ها همگام‌سازی می‌شود.'
              : 'Enables direct interconnectivity between multiple installed instances of SafeWatch across company branches via n8n relay.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex-1 min-w-[200px]">
              <input 
                type="text"
                value={n8nConfig.interconnectWebhookUrl || ''}
                onChange={e => setN8nConfigState({ ...n8nConfig, interconnectWebhookUrl: e.target.value })}
                placeholder={settings.language === 'fa' ? 'آدرس اختصاصی وب‌هوک تبادل بین‌سیستمی (اختیاری)' : 'Dedicated Interconnect Relay Webhook URL (Optional)'}
                className="w-full px-3 py-1.5 border border-indigo-200 bg-white rounded-lg text-xs font-mono text-left dir-ltr focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <button 
              type="button"
              onClick={handleTestInterconnectRelay}
              disabled={n8nTestLoading}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Radio className="w-3.5 h-3.5" />
              {settings.language === 'fa' ? 'ارسال بسته تست بین‌سیستمی' : 'Test Interconnect Packet'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <button 
            type="button"
            onClick={handleTestN8n}
            disabled={n8nTestLoading}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            {n8nTestLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
            ) : (
              <Zap className="w-4 h-4 fill-slate-900" />
            )}
            {settings.language === 'fa' ? 'تست اتصال به n8n (Test Webhook)' : 'Test n8n Connection'}
          </button>

          <button 
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
          >
            <Save className="w-4 h-4" />
            {settings.language === 'fa' ? 'ذخیره تنظیمات n8n' : 'Save n8n Settings'}
          </button>
        </div>
      </form>

      {/* Test Result Display Modal / Card */}
      {n8nTestResult && (
        <div className={`p-4 rounded-2xl border shadow-sm space-y-2 animate-in fade-in duration-300 ${
          n8nTestResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
            : 'bg-red-50 border-red-200 text-red-950'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs md:text-sm">
              {n8nTestResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>{n8nTestResult.message}</span>
            </div>
            {n8nTestResult.responseTimeMs && (
              <span className="font-mono text-[11px] bg-white px-2 py-0.5 rounded border font-bold text-gray-700">
                {n8nTestResult.responseTimeMs} ms
              </span>
            )}
          </div>
          {n8nTestResult.statusCode && (
            <div className="text-[11px] font-mono text-gray-600">
              HTTP Status: <span className="font-bold">{n8nTestResult.statusCode}</span>
            </div>
          )}
          {n8nTestResult.responseData && (
            <pre className="text-[10px] font-mono bg-white p-2.5 rounded-lg border overflow-x-auto max-h-32 text-gray-800 dir-ltr text-left">
              {JSON.stringify(n8nTestResult.responseData, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Interactive Guide & Sample Payload Section */}
      <div className="bg-white border border-gray-150 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-xs md:text-sm">
            <Terminal className="w-4 h-4 text-amber-600" />
            {settings.language === 'fa' ? 'راهنمای سناریونویسی و فرمت داده‌های وب‌هوک' : 'Workflow Setup & JSON Payload Specifications'}
          </div>
          <button 
            type="button"
            onClick={() => setShowSamplePayload(!showSamplePayload)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
          >
            {showSamplePayload 
              ? (settings.language === 'fa' ? 'بستن راهنما' : 'Hide Examples') 
              : (settings.language === 'fa' ? 'مشاهده نمونه JSON و cURL' : 'Show Code Examples')}
          </button>
        </div>

        {showSamplePayload && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-300">
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] space-y-3 dir-ltr text-left overflow-x-auto relative">
              <div className="flex justify-between items-center text-slate-400 text-[10px] border-b border-slate-800 pb-2">
                <span>Sample Payload sent to n8n Webhook</span>
                <button 
                  type="button"
                  onClick={() => {
                    const sampleJson = JSON.stringify({
                      event: 'VIOLATION_REGISTERED',
                      nodeId: n8nConfig.nodeId || 'SafeWatch-Node-1',
                      sourceCompany: settings.companyName,
                      timestamp: new Date().toISOString(),
                      data: {
                        id: 'V-1092',
                        employeeName: 'علی محمدی',
                        personnelId: '980123',
                        department: 'تاسیسات',
                        reason: 'عدم استفاده از کلاه ایمنی',
                        severity: 'High',
                        date: '1403/05/18'
                      },
                      meta: { appVersion: '4.9.0', environment: 'Company Internal Network' }
                    }, null, 2);
                    navigator.clipboard.writeText(sampleJson);
                    setCopiedSample(true);
                    setTimeout(() => setCopiedSample(false), 2000);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                >
                  {copiedSample ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedSample ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre className="text-amber-300 font-mono text-[11px]">
{`{
  "event": "VIOLATION_REGISTERED",
  "nodeId": "${n8nConfig.nodeId || 'SafeWatch-Node-1'}",
  "sourceCompany": "${settings.companyName}",
  "timestamp": "${new Date().toISOString()}",
  "data": {
    "id": "V-1092",
    "employeeName": "علی محمدی",
    "personnelId": "980123",
    "department": "تاسیسات",
    "reason": "عدم استفاده از کلاه ایمنی",
    "severity": "High",
    "date": "1403/05/18"
  },
  "meta": { "appVersion": "4.9.0", "environment": "Company Internal Network" }
}`}
              </pre>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-xl text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <Workflow className="w-4 h-4 text-amber-600 shrink-0" />
                {settings.language === 'fa' ? 'مراحل پیکربندی در n8n:' : 'n8n Setup Instructions:'}
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-amber-950 pr-2">
                <li>
                  {settings.language === 'fa' 
                    ? 'یک Workflow جدید در n8n ایجاد کرده و نود Webhook را اضافه نمایید.' 
                    : 'Create a new Workflow in n8n and add a Webhook trigger node.'}
                </li>
                <li>
                  {settings.language === 'fa' 
                    ? 'متد HTTP Method را روی POST و مسیر Path را بر روی ' + (n8nConfig.webhookPath || '/webhook/safewatch-events') + ' قرار دهید.' 
                    : 'Set HTTP Method to POST and Path to ' + (n8nConfig.webhookPath || '/webhook/safewatch-events') + '.'}
                </li>
                <li>
                  {settings.language === 'fa' 
                    ? 'نود بعدی را به پلتفرم دلخواه (Telegram, Bale, Eitaa Bot یا SQL Database) وصل کنید تا پیام‌ها و هشدارهای HSE به‌صورت هوشمند توزیع گردند.' 
                    : 'Connect the Webhook node to Telegram, Bale, Eitaa, or SQL Database node for automatic dispatching.'}
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
