import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Laptop, 
  User, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Terminal, 
  Copy, 
  Check, 
  Globe, 
  AlertCircle,
  HardDrive,
  Network
} from 'lucide-react';
import { DeploymentMode, DatacenterStatus } from '../types';
import { 
  fetchDatacenterStatus, 
  configureDatacenterMode, 
  getFirewallScriptDownloadUrl, 
  getClientShortcutDownloadUrl,
  setLocalDeploymentMode,
  getLocalDeploymentMode
} from '../services/syncService';

interface InitialSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  isFa: boolean;
  onComplete?: () => void;
}

export const InitialSetupWizard: React.FC<InitialSetupWizardProps> = ({
  isOpen,
  onClose,
  isFa,
  onComplete
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMode, setSelectedMode] = useState<DeploymentMode>(getLocalDeploymentMode());
  const [datacenterStatus, setDatacenterStatus] = useState<DatacenterStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Server options
  const [allowFirewall, setAllowFirewall] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState(false);
  
  // Client options
  const [serverUrlInput, setServerUrlInput] = useState('http://192.168.1.100:3000');
  const [isTestingClient, setIsTestingClient] = useState(false);
  const [clientTestResult, setClientTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Finalizing
  const [isConfiguring, setIsConfiguring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchDatacenterStatus()
        .then(res => {
          if (res.success && res.data) {
            setDatacenterStatus(res.data);
            if (res.data.primaryIp && res.data.primaryIp !== '127.0.0.1') {
              setServerUrlInput(`http://${res.data.primaryIp}:${res.data.port}`);
            }
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestClientConnection = async () => {
    setIsTestingClient(true);
    setClientTestResult(null);
    try {
      let target = serverUrlInput.trim();
      if (!/^https?:\/\//i.test(target)) {
        target = 'http://' + target;
      }
      const testEndpoint = target.endsWith('/') ? `${target}api/health` : `${target}/api/health`;
      const res = await fetch(testEndpoint);
      if (res.ok) {
        setClientTestResult({
          success: true,
          message: isFa ? 'اتصال موفقیت‌آمیز بود! سرور مرکزی پاسخ داد.' : 'Connected successfully to central server!'
        });
      } else {
        setClientTestResult({
          success: false,
          message: isFa ? `سرور پاسخ داد اما با وضعیت ${res.status}` : `Server returned status ${res.status}`
        });
      }
    } catch (err: any) {
      setClientTestResult({
        success: false,
        message: isFa ? `عدم دسترسی به سرور مرکزی: ${err.message}` : `Cannot reach server: ${err.message}`
      });
    } finally {
      setIsTestingClient(false);
    }
  };

  const handleApplyFinalConfig = async () => {
    setIsConfiguring(true);
    try {
      // 1. Save locally
      setLocalDeploymentMode(selectedMode);
      if (selectedMode === 'CLIENT') {
        localStorage.setItem('sg_serverUrl', serverUrlInput.trim());
      } else if (selectedMode === 'STANDALONE') {
        localStorage.removeItem('sg_serverUrl');
      }

      // 2. Configure server backend
      await configureDatacenterMode(
        selectedMode, 
        selectedMode === 'CLIENT' ? serverUrlInput.trim() : undefined
      );

      // 3. Mark initial setup completed
      localStorage.setItem('sg_initial_setup_completed', 'true');

      // 4. Progress to final step or close
      setStep(3);
    } catch (err: any) {
      alert(err.message || 'Error configuring setup');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleFinish = () => {
    onClose();
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" dir={isFa ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col">
        
        {/* Wizard Header */}
        <div className="p-6 bg-linear-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg">
                  {isFa ? 'ویزارد راه‌اندازی و انتخاب حالت استقرار' : 'Deployment Architecture Setup Wizard'}
                </h3>
                <p className="text-xs text-indigo-200">
                  {isFa ? 'پیکربندی هوشمند و خودکار بر اساس نیاز شرکت یا استفاده شخصی' : 'Intelligent Automated Setup & Firewall Configuration'}
                </p>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1 text-xs font-bold text-indigo-200">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-white/10'}`}>1</span>
              <span>-</span>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-white/10'}`}>2</span>
              <span>-</span>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center ${step === 3 ? 'bg-emerald-600 text-white' : 'bg-white/10'}`}>3</span>
            </div>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh]">
          
          {/* STEP 1: SELECT DEPLOYMENT INTENT */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                  {isFa ? 'قصد استفاده از نرم‌افزار را به چه صورتی دارید؟' : 'How do you intend to deploy and use this software?'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isFa ? 'یکی از ۳ حالت زیر را انتخاب نمایید تا پیکربندی شبکه و سیستم به طور خودکار انجام شود:' : 'Choose from the 3 deployment architectures below:'}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {/* Option 1: Central Server */}
                <div 
                  onClick={() => setSelectedMode('SERVER')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                    selectedMode === 'SERVER'
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Server className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {isFa ? '۱. سرور مرکزی شرکت (مرکز داده / Datacenter)' : '1. Central Enterprise Server (Datacenter Node)'}
                      </h5>
                      {selectedMode === 'SERVER' && (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isFa 
                        ? 'می‌خواهم این رایانه سرور اصلی شرکت باشد؛ دیتابیس جامع و بکاپ‌های خودکار در این رایانه ذخیره شده و سایر سیستم‌ها (کلاینت‌ها) به آن متصل شوند.' 
                        : 'This computer will act as the master host. Holds the master database, automatic daily backups, and serves all client workstations.'}
                    </p>
                  </div>
                </div>

                {/* Option 2: Client Workstation */}
                <div 
                  onClick={() => setSelectedMode('CLIENT')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                    selectedMode === 'CLIENT'
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {isFa ? '۲. سیستم کلاینت (Workstation)' : '2. Workstation Client Node'}
                      </h5>
                      {selectedMode === 'CLIENT' && (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isFa 
                        ? 'سرور مرکزی قبلاً در شرکت نصب شده است؛ می‌خواهم این سیستم به عنوان کلاینت (نگهبانی، HSE، آموزش، اداری) به سرور متصل شود.' 
                        : 'Central server is already installed elsewhere; this computer will connect to it as a client workstation.'}
                    </p>
                  </div>
                </div>

                {/* Option 3: Standalone */}
                <div 
                  onClick={() => setSelectedMode('STANDALONE')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-4 ${
                    selectedMode === 'STANDALONE'
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        {isFa ? '۳. استفاده شخصی و تک‌کاربره (مستقل / Standalone)' : '3. Personal Standalone Mode'}
                      </h5>
                      {selectedMode === 'STANDALONE' && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">✓</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isFa 
                        ? 'استفاده انفرادی و مستقل روی همین سیستم بدون نیاز به شبکه محلی، سرور یا اتصال کلاینت‌ها.' 
                        : 'Standalone local usage on this single computer without requiring network synchronization.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MODE-SPECIFIC CONFIGURATION */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              
              {/* IF SERVER MODE: FIREWALL & PORT CONFIG */}
              {selectedMode === 'SERVER' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                      <ShieldCheck className="w-5 h-5" />
                      <h4 className="font-black text-xs sm:text-sm">
                        {isFa ? 'پیکربندی پورت فایروال و شبکه سرور مرکزی' : 'Server Firewall & Network Port Configuration'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isFa 
                        ? 'جهت اتصال کلاینت‌های دیگر در شبکه شرکت به این رایانه، پورت ۳۰۰۰ پروتکل TCP باید در فایروال باز باشد.' 
                        : 'To allow workstation clients on your local network to connect, port 3000 TCP must be allowed in firewall.'}
                    </p>
                  </div>

                  {/* Firewall Agreement Box */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowFirewall}
                        onChange={(e) => setAllowFirewall(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {isFa ? 'تایید و ایجاد خودکار قانون باز کردن پورت ۳۰۰۰ در فایروال (توصیه شده)' : 'Automatically authorize & configure Port 3000 in Firewall (Recommended)'}
                      </span>
                    </label>

                    {allowFirewall && (
                      <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                        <a
                          href={getFirewallScriptDownloadUrl('windows')}
                          download="setup-firewall-port-3000.bat"
                          className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Download className="w-4 h-4" />
                          {isFa ? 'دانلود اسکریپت خودکار فایروال ویندوز (.bat)' : 'Download Windows Firewall Bat'}
                        </a>

                        <button
                          onClick={() => {
                            const cmd = datacenterStatus?.firewallCommands?.windowsPowerShell || `New-NetFirewallRule -DisplayName "HSE-SafeWatch Central Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow`;
                            navigator.clipboard.writeText(cmd);
                            setCopiedCmd(true);
                            setTimeout(() => setCopiedCmd(false), 2500);
                          }}
                          className="py-2 px-3.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {copiedCmd ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                          {copiedCmd ? (isFa ? 'دستور کپی شد' : 'Copied') : (isFa ? 'کپی دستور PowerShell' : 'Copy PowerShell Cmd')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Detected Server IP preview */}
                  <div className="p-3 bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{isFa ? 'آدرس IP این سرور در شبکه شرکت:' : 'Server Primary IP:'}</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      http://{datacenterStatus?.primaryIp || '127.0.0.1'}:3000
                    </span>
                  </div>
                </div>
              )}

              {/* IF CLIENT MODE: ENTER SERVER URL & TEST */}
              {selectedMode === 'CLIENT' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 space-y-2">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Laptop className="w-5 h-5" />
                      <h4 className="font-black text-xs sm:text-sm">
                        {isFa ? 'آدرس سرور مرکزی شرکت را وارد کنید' : 'Enter Central Server Address'}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {isFa 
                        ? 'آدرس IP یا دامنه سرور مرکزی کارخانه را وارد نمایید. این سیستم پس از ذخیره، کلیه داده‌ها را به صورت خودکار با سرور هماهنگ خواهد کرد.' 
                        : 'Enter the IP address of the central server. This client will automatically sync all events with it.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                    <label className="text-xs font-bold text-slate-900 dark:text-white block">
                      {isFa ? 'آدرس سرور مرکزی (همراه با پورت ۳۰۰۰):' : 'Central Server URL:'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={serverUrlInput}
                        onChange={(e) => setServerUrlInput(e.target.value)}
                        placeholder="http://192.168.1.100:3000"
                        className="flex-1 p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-left"
                        dir="ltr"
                      />
                      <button
                        onClick={handleTestClientConnection}
                        disabled={isTestingClient}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {isTestingClient ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Globe className="w-4 h-4" />}
                        {isFa ? 'تست اتصال' : 'Test Connection'}
                      </button>
                    </div>

                    {clientTestResult && (
                      <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${clientTestResult.success ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300'}`}>
                        {clientTestResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {clientTestResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* IF STANDALONE MODE: CONFIRMATION */}
              {selectedMode === 'STANDALONE' && (
                <div className="p-5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <User className="w-6 h-6" />
                  </div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {isFa ? 'تایید استفاده مستقل و تک‌کاربره' : 'Standalone Single-User Confirmation'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                    {isFa 
                      ? 'سامانه به صورت مستقل روی همین سیستم بدون اتصال به هیچ سروری اجرا می‌شود. کلیه داده‌ها در پایگاه داده محلی ذخیره شده و نیازی به پیکربندی شبکه یا فایروال وجود ندارد.' 
                      : 'The application will operate completely standalone with local storage. No network firewall or external server configuration is required.'}
                  </p>
                </div>
              )}

            </div>
          )}

          {/* STEP 3: FINAL SUCCESS */}
          {step === 3 && (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              
              <div className="space-y-1">
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  {isFa ? 'پیکربندی با موفقیت انجام شد!' : 'Configuration Successfully Applied!'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isFa 
                    ? `سامانه با موفقیت در وضعیت [${selectedMode === 'SERVER' ? 'سرور مرکزی شرکت' : selectedMode === 'CLIENT' ? 'کلاینت متصل به سرور' : 'شخصی و مستقل'}] تنظیم شد و آماده استفاده است.`
                    : `System is now configured in ${selectedMode} mode and ready for production use.`}
                </p>
              </div>

              {selectedMode === 'SERVER' && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto space-y-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isFa ? 'شورتکات اتصال کلاینت‌ها برای سایر سیستم‌ها:' : 'Client Workstation Shortcut:'}
                  </p>
                  <a
                    href={getClientShortcutDownloadUrl(datacenterStatus?.primaryIp || 'localhost')}
                    download="Create-SafeWatch-Shortcut.bat"
                    className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    {isFa ? 'دانلود اسکریپت شورتکات دسکتاپ کلاینت‌ها (.bat)' : 'Download Client Shortcut Installer'}
                  </a>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Wizard Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {step > 1 && step < 3 ? (
            <button
              onClick={() => setStep((step - 1) as 1 | 2)}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isFa ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              {isFa ? 'مرحله قبل' : 'Back'}
            </button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer ml-auto"
            >
              {isFa ? 'ادامه به مرحله بعد' : 'Continue'}
              {isFa ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          )}

          {step === 2 && (
            <button
              onClick={handleApplyFinalConfig}
              disabled={isConfiguring}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer ml-auto"
            >
              {isConfiguring ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {isFa ? 'تایید و کانفیگ خودکار نهایی' : 'Confirm & Apply Configuration'}
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer ml-auto"
            >
              {isFa ? 'ورود به سامانه' : 'Enter Application'}
              {isFa ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
