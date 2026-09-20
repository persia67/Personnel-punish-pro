import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Network, 
  ShieldCheck, 
  Copy, 
  Check, 
  Download, 
  RefreshCw, 
  Monitor, 
  Laptop, 
  User, 
  Activity, 
  HardDrive, 
  Terminal, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  HelpCircle,
  X,
  Sparkles,
  Layers,
  ChevronRight,
  Globe
} from 'lucide-react';
import { DatacenterStatus, DeploymentMode } from '../types';
import { 
  fetchDatacenterStatus, 
  configureDatacenterMode, 
  getFirewallScriptDownloadUrl, 
  getClientShortcutDownloadUrl,
  getServerLauncherScriptDownloadUrl,
  getLocalDeploymentMode,
  setLocalDeploymentMode,
  getServerUrl,
  getServerLanIp,
  setServerLanIp,
  detectLocalIpsWebRTC,
  testServerPing,
  safeParseJson
} from '../services/syncService';

interface DatacenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isFa: boolean;
  onOpenWizard?: () => void;
}

export const DatacenterModal: React.FC<DatacenterModalProps> = ({
  isOpen,
  onClose,
  isFa,
  onOpenWizard
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'firewall' | 'clients' | 'modes'>('overview');
  const [status, setStatus] = useState<DatacenterStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIp, setSelectedIp] = useState<string>(() => getServerLanIp() || '10.1.1.17');
  const [manualIpInput, setManualIpInput] = useState<string>(() => getServerLanIp() || '10.1.1.17');
  const [detectedLocalIps, setDetectedLocalIps] = useState<string[]>([]);
  const [isServerActive, setIsServerActive] = useState<boolean | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ testing: boolean; success?: boolean; message?: string } | null>(null);
  const [pingResult, setPingResult] = useState<{ testing: boolean; success?: boolean; latency?: number; message?: string } | null>(null);
  
  // Mode Change state
  const [currentLocalMode, setCurrentLocalMode] = useState<DeploymentMode>(getLocalDeploymentMode());
  const [clientServerInput, setClientServerInput] = useState<string>(localStorage.getItem('sg_serverUrl') || '');
  const [savingMode, setSavingMode] = useState(false);
  const [modeSuccessMsg, setModeSuccessMsg] = useState<string | null>(null);

  const checkServerOnline = async (urlToCheck?: string) => {
    const target = urlToCheck || getServerUrl() || 'http://localhost:3000';
    const ping = await testServerPing(target);
    setIsServerActive(ping.success);
    return ping;
  };

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      checkServerOnline();
      const res = await fetchDatacenterStatus();
      if (res.success && res.data) {
        setStatus(res.data);
        setIsServerActive(true);
        const saved = getServerLanIp();
        if (!saved && res.data.primaryIp && res.data.primaryIp !== '127.0.0.1') {
          setSelectedIp(res.data.primaryIp);
          setManualIpInput(res.data.primaryIp);
        }
      } else {
        setIsServerActive(false);
      }
    } catch {
      setIsServerActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setCurrentLocalMode(getLocalDeploymentMode());
      setClientServerInput(localStorage.getItem('sg_serverUrl') || '');
      detectLocalIpsWebRTC().then((ips) => {
        if (ips && ips.length > 0) {
          setDetectedLocalIps(ips);
          const saved = getServerLanIp();
          if (!saved && (ips.includes('10.1.1.17') || ips[0])) {
            const preferred = ips.includes('10.1.1.17') ? '10.1.1.17' : ips[0];
            setSelectedIp(preferred);
            setManualIpInput(preferred);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleApplyIp = (ipToApply: string) => {
    const clean = ipToApply.trim().replace(/^https?:\/\//i, '').split(':')[0].replace(/\/.*$/, '');
    if (clean) {
      setSelectedIp(clean);
      setManualIpInput(clean);
      setServerLanIp(clean);
      checkServerOnline(`http://${clean}:3000`);
    }
  };

  const handleTestIpPing = async (ipToTest: string) => {
    setPingResult({ testing: true });
    const clean = ipToTest.trim().replace(/^https?:\/\//i, '').split(':')[0].replace(/\/.*$/, '') || '10.1.1.17';
    const res = await testServerPing(`http://${clean}:3000`);
    setPingResult({
      testing: false,
      success: res.success,
      latency: res.latencyMs,
      message: res.success 
        ? (isFa ? `اتصال موفق! پورت ۳۰۰۰ پاسخ داد (${res.latencyMs} میلی‌ثانیه)` : `Connected! Port 3000 responded in ${res.latencyMs}ms`)
        : (isFa ? `پورت ۳۰۰۰ روی آدرس ${clean} در دسترس نیست (${res.error || 'عدم دسترسی'}). سرور را با فایل Start-SafeWatch-Server.bat اجرا فرمایید.` : `Port 3000 is not reachable on ${clean}.`)
    });
    if (res.success) {
      setIsServerActive(true);
    }
  };

  const handleTestPort = async () => {
    setTestResult({ testing: true });
    try {
      const start = Date.now();
      const base = getServerUrl();
      const targetUrl = base ? `${base}/api/health` : '/api/health';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(targetUrl, {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      const parsed = await safeParseJson(res);
      if (res.ok && parsed.ok) {
        const json = parsed.data;
        setIsServerActive(true);
        setTestResult({
          testing: false,
          success: true,
          message: isFa 
            ? `پورت ۳۰۰۰ باز و فعال است! زمان پاسخ: ${latency} میلی‌ثانیه (وضعیت: ${json?.status || 'فعال'})` 
            : `Port 3000 is open and healthy! Latency: ${latency}ms (Status: ${json?.status || 'healthy'})`
        });
      } else {
        setIsServerActive(false);
        setTestResult({
          testing: false,
          success: false,
          message: parsed.error || (isFa ? 'پاسخ نامعتبر از پورت ۳۰۰۰ دریافت شد. لطفاً سرور را اجرا فرمایید.' : 'Invalid response from port 3000.')
        });
      }
    } catch (err: any) {
      setIsServerActive(false);
      setTestResult({
        testing: false,
        success: false,
        message: isFa ? `پورت ۳۰۰۰ در حال حاضر پاسخگو نیست: ${err.message}` : `Connection failed: ${err.message}`
      });
    }
  };

  const handleSaveMode = async (newMode: DeploymentMode) => {
    setSavingMode(true);
    setModeSuccessMsg(null);
    try {
      if (newMode === 'CLIENT') {
        const trimmed = clientServerInput.trim();
        if (trimmed) {
          localStorage.setItem('sg_serverUrl', trimmed);
        }
      } else if (newMode === 'STANDALONE') {
        localStorage.removeItem('sg_serverUrl');
      }

      setLocalDeploymentMode(newMode);
      setCurrentLocalMode(newMode);

      await configureDatacenterMode(newMode, newMode === 'CLIENT' ? clientServerInput : undefined);
      
      setModeSuccessMsg(isFa ? 'حالت استقرار با موفقیت تغییر کرد و ذخیره شد.' : 'Deployment mode updated successfully.');
      setTimeout(() => setModeSuccessMsg(null), 4000);
      loadStatus();
    } catch (err: any) {
      alert(err.message || 'Error updating mode');
    } finally {
      setSavingMode(false);
    }
  };

  const activeIp = selectedIp || manualIpInput || getServerLanIp() || status?.primaryIp || '10.1.1.63';
  const port = status?.port || 3000;
  const fullServerUrl = `http://${activeIp}:${port}`;

  // Aggregate all unique detected/known IPs
  const candidateIps = new Set<string>();
  candidateIps.add('10.1.1.63');
  candidateIps.add('10.1.1.17');
  if (getServerLanIp()) candidateIps.add(getServerLanIp());
  if (status?.primaryIp && status.primaryIp !== '127.0.0.1') candidateIps.add(status.primaryIp);
  (status?.networkInterfaces || []).forEach(n => {
    if (!n.internal && n.address) candidateIps.add(n.address);
  });
  detectedLocalIps.forEach(ip => candidateIps.add(ip));
  candidateIps.add('127.0.0.1');
  const allSuggestedIps = Array.from(candidateIps);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in" dir={isFa ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative flex justify-between items-center border-b border-indigo-900/50">
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Server className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {isFa ? 'مرکز داده و مدیریت استقرار شبکه (Datacenter Console)' : 'Datacenter & Network Deployment Console'}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border flex items-center gap-1.5 ${
                  isServerActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : isServerActive === false
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isServerActive ? 'bg-emerald-400 animate-pulse' : isServerActive === false ? 'bg-amber-400' : 'bg-slate-400'
                  }`} />
                  {isServerActive 
                    ? (isFa ? 'پورت ۳۰۰۰ فعال و آنلاین' : 'Port 3000 Active') 
                    : isServerActive === false
                    ? (isFa ? 'سرور متوقف است (پورت ۳۰۰۰ آفلاین)' : 'Server Offline (Port 3000)')
                    : (isFa ? 'پورت ۳۰۰۰' : 'Port 3000')}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isFa 
                  ? 'مدیریت تفکیک نسخه سرور و کلاینت، باز کردن خودکار پورت فایروال و ایجاد شورتکات سیستم‌ها' 
                  : 'Central Server, Client Workstations, Automated Firewall Port & Shortcut Setup'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 z-10">
            <button
              onClick={loadStatus}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
              title={isFa ? 'بروزرسانی وضعیت' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 sm:px-6 gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800/80 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            {isFa ? 'داشبورد مانیتورینگ سرور' : 'Server Dashboard'}
          </button>
          
          <button
            onClick={() => setActiveTab('firewall')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'firewall'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800/80 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            {isFa ? 'پیکربندی فایروال و پورت ۳۰۰۰' : 'Firewall & Port 3000'}
          </button>

          <button
            onClick={() => setActiveTab('clients')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'clients'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800/80 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4 text-blue-500" />
            {isFa ? 'اتصال کلاینت‌ها و شورتکات' : 'Client Workstation Hub'}
          </button>

          <button
            onClick={() => setActiveTab('modes')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'modes'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800/80 rounded-t-xl'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            {isFa ? 'تغییر معماری و ویزارد' : 'Architecture & Wizard'}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: OVERVIEW & MONITORING */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              {/* Architecture Banner */}
              <div className="bg-linear-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                    {currentLocalMode === 'SERVER' ? <Server className="w-6 h-6" /> : currentLocalMode === 'CLIENT' ? <Laptop className="w-6 h-6" /> : <User className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {isFa ? 'وضعیت استقرار سیستم:' : 'Current Deployment Node:'}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white">
                        {currentLocalMode === 'SERVER' 
                          ? (isFa ? 'سرور مرکزی شرکت (Datacenter Hub)' : 'Enterprise Central Server')
                          : currentLocalMode === 'CLIENT'
                          ? (isFa ? 'سیستم کلاینت (Workstation Client)' : 'Workstation Client')
                          : (isFa ? 'نسخه تک‌کاربره شخصی (Standalone)' : 'Standalone Personal')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {currentLocalMode === 'SERVER' 
                        ? (isFa ? 'این رایانه به عنوان سرور مرکزی عمل می‌کند؛ دیتابیس جامع، سرویس همگام‌سازی بلادرنگ و پشتیبان‌گیری در این رایانه مستقر است.' : 'Serving as corporate central database and real-time SSE broadcast node.')
                        : currentLocalMode === 'CLIENT'
                        ? (isFa ? `متصل به سرور مرکزی: ${getServerUrl() || 'http://localhost:3000'}` : `Connected to central server: ${getServerUrl() || 'http://localhost:3000'}`)
                        : (isFa ? 'داده‌ها به صورت مستقل در این رایانه ذخیره می‌شوند و اتصالی به سرور شبکه وجود ندارد.' : 'Data stored locally without enterprise network dependency.')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('modes')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  {isFa ? 'تغییر وضعیت استقرار' : 'Change Mode'}
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-bold">{isFa ? 'کلاینت‌های متصل بلادرنگ' : 'Active SSE Clients'}</span>
                    <Network className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {status?.activeClientsCount ?? 0}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {isFa ? 'سیستم آنلاین' : 'online'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-bold">{isFa ? 'پورت سرویس شبکه' : 'Network Port'}</span>
                    <Globe className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {status?.port ?? 3000}
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      TCP
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-bold">{isFa ? 'حجم دیتابیس مرکزی' : 'Database Size'}</span>
                    <HardDrive className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {status?.dbStats?.dbSizeBytes ? (status.dbStats.dbSizeBytes / 1024).toFixed(1) : '0'}
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold">
                      KB
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[11px] font-bold">{isFa ? 'بکاپ‌های خودکار سرور' : 'Server Backups'}</span>
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {status?.dbStats?.backupsCount ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold">
                      {isFa ? 'نسخه روزانه' : 'daily'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detected Server Network IPs */}
              <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-250 dark:border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {isFa ? 'آدرس‌های IP شناسایی‌شده سرور در شبکه شرکت' : 'Detected Server Network IP Addresses'}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {isFa ? 'جهت استفاده در اتصال کلاینت‌ها' : 'For client connection'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {status?.networkInterfaces && status.networkInterfaces.length > 0 ? (
                    status.networkInterfaces.map((iface, idx) => {
                      const isPrimary = iface.address === status.primaryIp;
                      return (
                        <div 
                          key={idx}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                            isPrimary
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full ${iface.internal ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                  {iface.address}
                                </span>
                                {isPrimary && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-indigo-600 text-white rounded font-bold">
                                    {isFa ? 'اصلی / Primary' : 'Primary'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {iface.name} {iface.internal ? (isFa ? '(لوکال)' : '(Internal)') : ''}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => copyToClipboard(`http://${iface.address}:${status.port}`, `ip-${idx}`)}
                              className="px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-slate-700 dark:text-slate-200 cursor-pointer"
                              title={isFa ? 'کپی آدرس کامل' : 'Copy Full URL'}
                            >
                              {copiedKey === `ip-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span className="font-mono text-[10px]">{status.port}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    allSuggestedIps.map((ip, idx) => {
                      const isTarget = ip === activeIp || ip === '10.1.1.17';
                      return (
                        <div 
                          key={idx}
                          className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                            isTarget
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full ${ip === '127.0.0.1' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                  {ip}
                                </span>
                                {ip === '10.1.1.17' && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-indigo-600 text-white rounded font-bold">
                                    {isFa ? 'سرور شبکه کارخانه' : 'Plant Server'}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                                {ip === '10.1.1.17' ? (isFa ? 'آی‌پی اصلی سازمان' : 'Enterprise LAN') : ip === '127.0.0.1' ? (isFa ? 'رایانه محلی (لوکال)' : 'Local Loopback') : (isFa ? 'شناسایی شده' : 'Detected')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => copyToClipboard(`http://${ip}:${port}`, `ip-sug-${idx}`)}
                              className="px-2 py-1 text-[11px] rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex items-center gap-1 text-slate-700 dark:text-slate-200 cursor-pointer"
                              title={isFa ? 'کپی آدرس کامل' : 'Copy Full URL'}
                            >
                              {copiedKey === `ip-sug-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              <span className="font-mono text-[10px]">{port}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Host OS Specs */}
              {status?.os && (
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 text-xs flex flex-wrap items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-slate-500" />
                    <span><strong>{isFa ? 'نام هاست سرور:' : 'Hostname:'}</strong> {status.os.hostname}</span>
                  </div>
                  <div>
                    <span><strong>{isFa ? 'سیستم‌عامل:' : 'OS:'}</strong> {status.os.platform} ({status.os.arch})</span>
                  </div>
                  <div>
                    <span><strong>{isFa ? 'حافظه RAM:' : 'RAM:'}</strong> {status.os.freeMemMb}MB / {status.os.totalMemMb}MB</span>
                  </div>
                  <div>
                    <span><strong>{isFa ? 'مدت زمان روشن بودن:' : 'Uptime:'}</strong> {Math.floor(status.os.uptimeSeconds / 3600)} {isFa ? 'ساعت' : 'hrs'}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FIREWALL & PORT 3000 AUTOMATION */}
          {activeTab === 'firewall' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 flex items-start gap-3.5">
                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed text-emerald-950 dark:text-emerald-200">
                  <h4 className="font-black text-sm text-emerald-900 dark:text-emerald-300">
                    {isFa ? 'پیکربندی خودکار باز کردن پورت ۳۰۰۰ در فایروال' : 'Automated Firewall Port 3000 Configuration'}
                  </h4>
                  <p>
                    {isFa 
                      ? 'برای اینکه سیستم‌های دیگر در شبکه شرکت (کلاینت‌ها) بتوانند به این سرور متصل شوند، پورت ۳۰۰۰ پروتکل TCP باید در فایروال سیستم عامل باز باشد. شما می‌توانید با استفاده از اسکریپت خودکار یک‌کلیکه و یا اجرای مستقیم دستورات زیر در محیط CMD/PowerShell پورت را در کسری از ثانیه باز کنید.'
                      : 'To allow workstation clients across your company network to connect to this server, inbound TCP port 3000 must be open. Use our one-click elevated script or run the terminal commands below.'}
                  </p>
                </div>
              </div>

              {/* One-Click Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Windows Auto Script */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-3.5 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      WIN
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {isFa ? 'اسکریپت خودکار فایروال ویندوز (.bat)' : 'Windows Auto Firewall Script (.bat)'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {isFa ? 'نصب خودکار قانون فایروال با دسترسی Administrator' : 'Auto-applies Windows inbound firewall rule'}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {isFa 
                      ? 'فایل اسکریپت را دانلود کرده و روی آن کلیک راست کنید و گزینه Run as administrator را بزنید.' 
                      : 'Download script, right-click, and select "Run as administrator".'}
                  </p>

                  <a
                    href={getFirewallScriptDownloadUrl('windows')}
                    download="setup-firewall-port-3000.bat"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    {isFa ? 'دانلود اسکریپت خودکار فایروال ویندوز' : 'Download Windows Firewall Script'}
                  </a>
                </div>

                {/* Linux Auto Script */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-3.5 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                      LNX
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        {isFa ? 'اسکریپت خودکار سرور لینوکس (UFW / Firewalld)' : 'Linux Auto Firewall Script (.sh)'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {isFa ? 'سازگار با Ubuntu, Debian, CentOS, RHEL' : 'Compatible with Ubuntu, Debian, RHEL'}
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    {isFa 
                      ? 'اسکریپت لینوکس را دانلود و با دستور sudo bash اجرا نمایید.' 
                      : 'Download and execute with sudo bash open-firewall-port-3000.sh.'}
                  </p>

                  <a
                    href={getFirewallScriptDownloadUrl('linux')}
                    download="open-firewall-port-3000.sh"
                    className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    {isFa ? 'دانلود اسکریپت فایروال لینوکس' : 'Download Linux Firewall Script'}
                  </a>
                </div>
              </div>

              {/* Direct Terminal Commands */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-500" />
                  {isFa ? 'یا اجرای مستقیم دستورات در ترمینال سیستم عامل:' : 'Or Run Direct Terminal Commands:'}
                </h4>

                {/* Windows PowerShell */}
                <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-slate-400 text-[10px]">
                    <span>Windows PowerShell (Admin)</span>
                    <button
                      onClick={() => copyToClipboard(status?.firewallCommands?.windowsPowerShell || `New-NetFirewallRule -DisplayName "HSE-SafeWatch Central Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow`, 'ps')}
                      className="hover:text-white flex items-center gap-1 text-slate-300 cursor-pointer"
                    >
                      {copiedKey === 'ps' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'ps' ? (isFa ? 'کپی شد' : 'Copied') : (isFa ? 'کپی' : 'Copy')}</span>
                    </button>
                  </div>
                  <p className="select-all text-emerald-400">
                    {status?.firewallCommands?.windowsPowerShell || `New-NetFirewallRule -DisplayName "HSE-SafeWatch Central Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow`}
                  </p>
                </div>

                {/* Windows Netsh CMD */}
                <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-slate-400 text-[10px]">
                    <span>Windows Command Prompt CMD (Admin)</span>
                    <button
                      onClick={() => copyToClipboard(status?.firewallCommands?.windowsCmd || `netsh advfirewall firewall add rule name="HSE-SafeWatch-Port-3000" dir=in action=allow protocol=TCP localport=3000`, 'cmd')}
                      className="hover:text-white flex items-center gap-1 text-slate-300 cursor-pointer"
                    >
                      {copiedKey === 'cmd' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'cmd' ? (isFa ? 'کپی شد' : 'Copied') : (isFa ? 'کپی' : 'Copy')}</span>
                    </button>
                  </div>
                  <p className="select-all text-blue-300">
                    {status?.firewallCommands?.windowsCmd || `netsh advfirewall firewall add rule name="HSE-SafeWatch-Port-3000" dir=in action=allow protocol=TCP localport=3000`}
                  </p>
                </div>

                {/* Linux UFW */}
                <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 border border-slate-800 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center text-slate-400 text-[10px]">
                    <span>Linux Ubuntu / Debian (UFW)</span>
                    <button
                      onClick={() => copyToClipboard(status?.firewallCommands?.linuxUfw || `sudo ufw allow 3000/tcp comment 'HSE-SafeWatch Server'`, 'ufw')}
                      className="hover:text-white flex items-center gap-1 text-slate-300 cursor-pointer"
                    >
                      {copiedKey === 'ufw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'ufw' ? (isFa ? 'کپی شد' : 'Copied') : (isFa ? 'کپی' : 'Copy')}</span>
                    </button>
                  </div>
                  <p className="select-all text-amber-300">
                    {status?.firewallCommands?.linuxUfw || `sudo ufw allow 3000/tcp comment 'HSE-SafeWatch Server'`}
                  </p>
                </div>
              </div>

              {/* Test Port Live */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {isFa ? 'بررسی سلامت و در دسترس بودن پورت ۳۰۰۰' : 'Verify Port 3000 Accessibility'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isFa ? 'تست ارسال درخواست به سرویس سلامت سرور جهت اعتبارسنجی' : 'Sends a ping request to /api/health'}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  {testResult && (
                    <span className={`text-xs font-bold flex items-center gap-1 ${testResult.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {testResult.message}
                    </span>
                  )}
                  <button
                    onClick={handleTestPort}
                    disabled={testResult?.testing}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testResult?.testing ? 'animate-spin' : ''}`} />
                    {isFa ? 'تست اتصال پورت ۳۰۰۰' : 'Test Port 3000'}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CLIENT WORKSTATION HUB */}
          {activeTab === 'clients' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex items-start gap-3.5">
                <Laptop className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed text-blue-950 dark:text-blue-200">
                  <h4 className="font-black text-sm text-blue-900 dark:text-blue-300">
                    {isFa ? 'مرکز اتصال کلاینت‌ها و ساخت شورتکات دسکتاپ' : 'Client Connection & Desktop Shortcut Generator'}
                  </h4>
                  <p>
                    {isFa 
                      ? 'به منظور سهولت پرسنل در واحدهای مختلف (نگهبانی، ایمنی، اداری، آموزش و مدیریت)، می‌توانید شورتکات آماده را دانلود کرده و روی دسکتاپ سیستم‌های دیگر کپی نمایید. با باز کردن شورتکات، سامانه مستقیماً به سرور مرکزی متصل می‌گردد.'
                      : 'Easily deploy client access across plant workstations with one-click shortcut installers and connection URLs.'}
                  </p>
                </div>
              </div>

              {/* Offline Warning & Server Launcher Card */}
              {isServerActive === false && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-900 dark:text-amber-200">
                        {isFa ? 'سرویس سرور مرکزی روی پورت ۳۰۰۰ متوقف است' : 'Central Server service on Port 3000 is stopped'}
                      </h4>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300/80">
                        {isFa 
                          ? 'پورت ۳۰۰۰ باز است، اما فرآیند پردازشی سرور هنوز راه‌اندازی نشده است. فایل راه‌انداز زیر را روی سرور اجرا کنید.' 
                          : 'Port 3000 is open, but the server background process is not running. Launch the server script below.'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={getServerLauncherScriptDownloadUrl(port)}
                    download="Start-SafeWatch-Server.bat"
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    {isFa ? 'دانلود راه‌انداز سرور ویندوز (.bat)' : 'Download Server Launcher (.bat)'}
                  </a>
                </div>
              )}

              {/* Target IP Configuration & Custom Override */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Network className="w-4 h-4 text-indigo-500" />
                    {isFa ? 'آدرس IP سرور مرکزی در شبکه کارخانه (LAN IP):' : 'Central Server LAN IP Address:'}
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold font-mono">
                    {isFa ? `آی‌پی انتخابی سرور: ${activeIp}` : `Active Server IP: ${activeIp}`}
                  </span>
                </div>

                {/* Input + Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={manualIpInput}
                      onChange={(e) => setManualIpInput(e.target.value)}
                      placeholder="10.1.1.17"
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      dir="ltr"
                    />
                  </div>

                  <button
                    onClick={() => handleApplyIp(manualIpInput)}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {isFa ? 'ذخیره و ثبت آی‌پی' : 'Save & Set IP'}
                  </button>

                  <button
                    onClick={() => handleTestIpPing(manualIpInput)}
                    disabled={pingResult?.testing}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${pingResult?.testing ? 'animate-spin' : ''}`} />
                    {isFa ? 'تست اتصال زنده (Ping)' : 'Test Ping'}
                  </button>
                </div>

                {/* Quick IP Suggestion Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 font-bold">{isFa ? 'انتخاب سریع آی‌پی:' : 'Quick Select:'}</span>
                  {allSuggestedIps.map((ip) => {
                    const isSelected = activeIp === ip;
                    return (
                      <button
                        key={ip}
                        onClick={() => handleApplyIp(ip)}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        {ip} {ip === '10.1.1.17' ? (isFa ? '★ سازمانی' : '★ LAN') : ip === '127.0.0.1' ? (isFa ? '(لوکال)' : '(local)') : ''}
                      </button>
                    );
                  })}
                </div>

                {/* Live Ping Feedback */}
                {pingResult && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                    pingResult.success 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  }`}>
                    {pingResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />}
                    <span>{pingResult.message}</span>
                  </div>
                )}

                {/* Full Target URL Display */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 font-bold">{isFa ? 'آدرس نهایی اتصال کلاینت‌ها:' : 'Client Connection URL:'}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 select-all">
                      {fullServerUrl}
                    </span>
                    <button
                      onClick={() => copyToClipboard(fullServerUrl, 'full-url')}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 text-slate-700 dark:text-slate-200 cursor-pointer"
                      title={isFa ? 'کپی آدرس' : 'Copy'}
                    >
                      {copiedKey === 'full-url' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Shortcut Installer Download */}
              <div className="p-5 rounded-2xl bg-linear-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {isFa ? 'دانلود اسکریپت‌های راه‌اندازی و اتصال (.bat)' : 'Download Setup & Shortcut Scripts (.bat)'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isFa ? 'اسکریپت شورتکات را روی سیستم کلاینت‌ها، و اسکریپت راه‌انداز سرور را روی رایانه سرور اجرا نمایید.' : 'Run shortcut installer on workstations, or server launcher on the host server.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <a
                    href={getClientShortcutDownloadUrl(activeIp, port)}
                    download="Create-SafeWatch-Shortcut.bat"
                    className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    {isFa ? 'دانلود شورتکات کلاینت (.bat)' : 'Download Workstation Shortcut (.bat)'}
                  </a>

                  <a
                    href={getServerLauncherScriptDownloadUrl(port)}
                    download="Start-SafeWatch-Server.bat"
                    className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Server className="w-4 h-4" />
                    {isFa ? 'دانلود راه‌انداز سرور (.bat)' : 'Download Server Launcher (.bat)'}
                  </a>

                  <a
                    href={fullServerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all text-slate-700 dark:text-slate-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {isFa ? 'باز کردن در مرورگر' : 'Open in Browser'}
                  </a>
                </div>
              </div>

              {/* 3 Step Deployment Guide */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-white dark:bg-slate-850 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-500" />
                  {isFa ? 'راهنمای ۳ مرحله‌ای راه‌اندازی کلاینت‌های کارخانه:' : '3-Step Workstation Rollout Guide:'}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">۱</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{isFa ? 'پورت فایروال را باز کنید' : 'Open Server Firewall'}</p>
                    <p className="text-[11px] text-slate-500">{isFa ? 'از تب فایروال، اسکریپت را با Administrator روی سرور اجرا کنید.' : 'Run the firewall script as administrator on this server.'}</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">۲</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{isFa ? 'شورتکات را توزیع کنید' : 'Distribute Shortcut'}</p>
                    <p className="text-[11px] text-slate-500">{isFa ? 'فایل bat را روی فلش یا شبکه در سیستم‌های پرسنل قرار دهید و اجرا کنید.' : 'Copy and run the bat installer on each workstation desktop.'}</p>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">۳</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{isFa ? 'ورود و استفاده بلادرنگ' : 'Instant Real-time Sync'}</p>
                    <p className="text-[11px] text-slate-500">{isFa ? 'تمام داده‌ها و ثبتیات به صورت زنده با سرور مرکزی هماهنگ می‌شوند.' : 'All data and actions stream instantaneously via SSE.'}</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: ARCHITECTURE SELECTION & WIZARD */}
          {activeTab === 'modes' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex items-start gap-3.5">
                <Layers className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs leading-relaxed text-amber-950 dark:text-amber-200">
                  <h4 className="font-black text-sm text-amber-900 dark:text-amber-300">
                    {isFa ? 'پیکربندی حالت کارکرد سامانه (سرور مرکزی، کلاینت یا شخصی)' : 'Select Operating Mode (Server, Client or Standalone)'}
                  </h4>
                  <p>
                    {isFa 
                      ? 'شما می‌توانید مشخص کنید که این نسخه از سامانه روی این رایانه به چه صورتی کار کند. تغییرات فوراً اعمال شده و ذخیره می‌گردند.'
                      : 'Configure how this workstation instance should operate. Changes apply immediately.'}
                  </p>
                </div>
              </div>

              {modeSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {modeSuccessMsg}
                </div>
              )}

              {/* 3 Interactive Mode Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                
                {/* Option 1: Enterprise Central Server */}
                <div 
                  onClick={() => handleSaveMode('SERVER')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    currentLocalMode === 'SERVER'
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Server className="w-5 h-5" />
                      </div>
                      {currentLocalMode === 'SERVER' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                          {isFa ? 'فعال' : 'Active'}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {isFa ? '۱. سرور مرکزی شرکت (Datacenter)' : '1. Enterprise Central Server'}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isFa 
                        ? 'میزبانی پایگاه داده اصلی، پشتیبان‌گیری خودکار روزانه و مدیریت کلاینت‌های متصل از طریق پورت ۳۰۰۰.'
                        : 'Hosts master database, auto daily backups, and feeds all connected client workstations.'}
                    </p>
                  </div>

                  <button
                    disabled={savingMode}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      currentLocalMode === 'SERVER'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {currentLocalMode === 'SERVER' ? (isFa ? 'حالت جاری' : 'Current Mode') : (isFa ? 'انتخاب سرور مرکزی' : 'Select Server')}
                  </button>
                </div>

                {/* Option 2: Workstation Client */}
                <div 
                  onClick={() => handleSaveMode('CLIENT')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    currentLocalMode === 'CLIENT'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <Laptop className="w-5 h-5" />
                      </div>
                      {currentLocalMode === 'CLIENT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                          {isFa ? 'فعال' : 'Active'}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {isFa ? '۲. سیستم کلاینت (Workstation)' : '2. Workstation Client'}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isFa 
                        ? 'اتصال مستقیم به سرور مرکزی کارخانه در شبکه داخلی و ارسال/دریافت بلادرنگ داده‌ها.'
                        : 'Connects to company central server via local intranet with auto-fallback offline cache.'}
                    </p>
                  </div>

                  <button
                    disabled={savingMode}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      currentLocalMode === 'CLIENT'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {currentLocalMode === 'CLIENT' ? (isFa ? 'حالت جاری' : 'Current Mode') : (isFa ? 'انتخاب کلاینت' : 'Select Client')}
                  </button>
                </div>

                {/* Option 3: Standalone Personal */}
                <div 
                  onClick={() => handleSaveMode('STANDALONE')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    currentLocalMode === 'STANDALONE'
                      ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                        <User className="w-5 h-5" />
                      </div>
                      {currentLocalMode === 'STANDALONE' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                          {isFa ? 'فعال' : 'Active'}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">
                      {isFa ? '۳. استفاده شخصی و مستقل' : '3. Standalone Personal'}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isFa 
                        ? 'عملکرد کاملاً مستقل و آفلاین روی همین سیستم بدون نیاز به اتصال به شبکه یا سرور مرکزی.'
                        : 'Pure standalone single-device operation without any network or server dependency.'}
                    </p>
                  </div>

                  <button
                    disabled={savingMode}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      currentLocalMode === 'STANDALONE'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {currentLocalMode === 'STANDALONE' ? (isFa ? 'حالت جاری' : 'Current Mode') : (isFa ? 'انتخاب شخصی' : 'Select Personal')}
                  </button>
                </div>
              </div>

              {/* Client Server Address Form (When in Client Mode) */}
              {currentLocalMode === 'CLIENT' && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {isFa ? 'آدرس IP سرور مرکزی شرکت جهت اتصال:' : 'Central Server Address (IP or Hostname):'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clientServerInput}
                      onChange={(e) => setClientServerInput(e.target.value)}
                      placeholder="مثال: http://192.168.1.100:3000"
                      className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-left"
                      dir="ltr"
                    />
                    <button
                      onClick={() => handleSaveMode('CLIENT')}
                      disabled={savingMode}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      {isFa ? 'ذخیره آدرس سرور' : 'Save Address'}
                    </button>
                  </div>
                </div>
              )}

              {/* Full Interactive Wizard Trigger */}
              <div className="pt-2 flex justify-between items-center border-t border-slate-250 dark:border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isFa ? 'ویزارد راهنمای گام‌به‌گام نصب' : 'Setup Installation Wizard'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {isFa ? 'می‌توانید ویزارد کامل مرحله‌به‌مرحله را مجدداً اجرا کنید.' : 'Relaunch full interactive setup wizard.'}
                  </p>
                </div>
                {onOpenWizard && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenWizard();
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {isFa ? 'اجرای ویزارد راه‌اندازی' : 'Run Setup Wizard'}
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {isFa ? 'مرکز داده سامانه پایش HSE & Reward AI' : 'HSE SafeWatch Datacenter Core'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
          >
            {isFa ? 'بستن پنجره' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
