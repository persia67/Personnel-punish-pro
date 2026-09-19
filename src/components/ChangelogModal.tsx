import React from 'react';
import { X, Sparkles, Phone, Layers, RefreshCw, Milestone, Shield, Server } from 'lucide-react';
import { AppSettings } from '../types';
import { APP_VERSION } from '../constants';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, settings }) => {
  if (!isOpen) return null;

  const isFa = settings.language === 'fa';

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" 
      dir={isFa ? 'rtl' : 'ltr'}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
        
        {/* Modal Header */}
        <div className="p-5 flex justify-between items-center text-white bg-linear-to-r from-indigo-700 to-indigo-900 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-lg"></div>
          <div className="flex items-center gap-3 relative z-10">
            <img 
              src="/icon.png" 
              alt="SafeWatch" 
              className="w-10 h-10 rounded-xl object-contain shadow-md border border-white/20 bg-slate-950/60 p-0.5 shrink-0" 
            />
            <div>
              <h3 className="font-black text-sm md:text-base leading-tight">
                {isFa ? 'آخرین تغییرات و ویژگی‌های جدید' : 'Latest Features & Changelog'}
              </h3>
              <p className="text-[10px] text-indigo-200 font-mono mt-0.5">
                {isFa ? `نسخه فعلی: v${APP_VERSION}` : `Current Version: v${APP_VERSION}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-1.5 rounded-xl cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Modal Content */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-4 flex gap-3">
            <Milestone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 leading-relaxed font-medium">
              {isFa ? (
                <p>
                  در نسخه <strong>v{APP_VERSION}</strong>، کنسول جامع مرکز داده (Datacenter) با قابلیت اتصال مستقیم به IP سازمانی، تست زنده پینگ و پورت ۳۰۰۰، ابزار خودکار فایروال و ایجاد شورتکات‌های دسکتاپ کلاینت ارتقا یافت.
                </p>
              ) : (
                <p>
                  In version <strong>v{APP_VERSION}</strong>, the Datacenter Console was enhanced with dedicated LAN IP configuration, live Port 3000 health pings, automated firewall utilities, and one-click workstation shortcut creators.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Feature 1: Datacenter & Server/Client Architecture */}
            <div className="flex gap-4 items-start p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Server className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-gray-900">
                  {isFa ? '۱. کنسول مرکز داده و تفکیک سرور/کلاینت (Datacenter Architecture)' : '1. Datacenter Console & Node Separation'}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isFa ? (
                    <>
                      امکان تفکیک شفاف بین سرور مرکزی شرکت (هاست دیتابیس جامع و پشتیبان‌گیری)، سیستم‌های کلاینت متصل به شبکه محلی، و حالت مستقل آفلاین (Standalone) با تشخیص خودکار کارت‌های شبکه و آدرس IP.
                    </>
                  ) : (
                    <>
                      Clear separation between Enterprise Central Server, connected Workstation Clients, and Standalone modes with automatic NIC detection and local IP reporting.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Feature 2: Automated Firewall & Port 3000 Opening */}
            <div className="flex gap-4 items-start p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-gray-900">
                  {isFa ? '۲. اتوماسیون باز کردن پورت ۳۰۰۰ در فایروال ویندوز و لینوکس' : '2. Automated Port 3000 Firewall Configuration'}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isFa ? (
                    <>
                      تولید و دانلود اسکریپت خودکار با دسترسی Administrator برای ویندوز (.bat) و لینوکس (.sh) به همراه کدهای دستوری آماده PowerShell، CMD و UFW جهت پذیرش درخواست‌های کلاینت‌ها بدون بلاک شدن در شبکه.
                    </>
                  ) : (
                    <>
                      One-click generation and download of elevated scripts (.bat for Windows, .sh for Linux) and ready-to-run terminal commands (PowerShell/CMD/UFW) to allow incoming port 3000 traffic.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Feature 3: Interactive Setup Wizard */}
            <div className="flex gap-4 items-start p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-gray-900">
                  {isFa ? '۳. ویزارد هوشمند راه‌اندازی اولیه و تست سلامت اتصال' : '3. Interactive Setup Wizard & Health Testing'}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isFa ? (
                    <>
                      راهنمای گام‌به‌گام در راه‌اندازی نخست جهت انتخاب نقش سیستم (سرور/کلاینت/مستقل)، تست آنلاین ارتباط با سرور مرکزی، و اعتبارسنجی باز بودن پورت قبل از شروع به کار.
                    </>
                  ) : (
                    <>
                      A guided 3-step setup wizard assisting administrators in choosing node roles, testing network reachability to the central server, and validating firewall readiness.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Feature 4: Real-time Intranet Data Transmission */}
            <div className="flex gap-4 items-start p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <RefreshCw className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-gray-900">
                  {isFa ? '۴. پخش بلادرنگ ثبتیات و پشتیبان‌گیری روزانه ۳۰ روزه' : '4. Real-time Event Streaming & 30-Day Automated Backups'}
                </h4>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  {isFa ? (
                    <>
                      همگام‌سازی بلادرنگ رویدادها از طریق پروتکل SSE و شورتکات‌های دسکتاپ به همراه ذخیره خودکار نسخه‌های پشتیبان روزانه در سرور مرکزی با تاریخ شمسی.
                    </>
                  ) : (
                    <>
                      Instant event broadcast using SSE across connected client workstations combined with automatic 30-day daily backups on the central server.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-bold text-gray-600">HSE Safewatch & Reward AI</span>
          </div>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            {isFa ? 'متوجه شدم' : 'Got it'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ChangelogModal;
