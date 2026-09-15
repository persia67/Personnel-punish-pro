import React from 'react';
import { X, Keyboard, Command, Sparkles } from 'lucide-react';
import { AppSettings } from '../types';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

export const KEYBOARD_SHORTCUTS = [
  {
    category: 'actions',
    categoryFa: 'اقدامات سریع',
    categoryEn: 'Quick Actions',
    items: [
      {
        keys: ['Alt', 'V'],
        altKeys: ['Ctrl', 'Shift', 'V'],
        descriptionFa: 'ثبت تخلف / عدم انطباق جدید',
        descriptionEn: 'Register New Violation',
        badgeColor: 'bg-red-100 text-red-800 border-red-200',
      },
      {
        keys: ['Alt', 'R'],
        altKeys: ['Ctrl', 'Shift', 'R'],
        descriptionFa: 'ثبت تشویقی / امتیاز مثبت جدید',
        descriptionEn: 'Register New Reward',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      },
      {
        keys: ['Ctrl', 'K'],
        altKeys: ['/'],
        descriptionFa: 'تمرکز روی کادر جستجو و یافتن پرسنل',
        descriptionEn: 'Focus Search Bar',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      },
      {
        keys: ['Alt', 'M'],
        descriptionFa: 'سوییچ حالت سامانه (تخلفات / تشویقی)',
        descriptionEn: 'Toggle System Mode (Violation / Reward)',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      },
      {
        keys: ['Alt', 'L'],
        descriptionFa: 'نمایش راهنمای کدهای انضباطی و تشویقی',
        descriptionEn: 'Open Code Legend',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      },
    ],
  },
  {
    category: 'navigation',
    categoryFa: 'جابجایی بین بخش‌ها',
    categoryEn: 'Navigation',
    items: [
      {
        keys: ['Alt', 'D'],
        altKeys: ['Ctrl', '1'],
        descriptionFa: 'ورود به پیشخوان تخلفات و تشویق‌ها',
        descriptionEn: 'Go to Compliance Dashboard',
        badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
      },
      {
        keys: ['Alt', 'P'],
        altKeys: ['Ctrl', '2'],
        descriptionFa: 'ورود به پایگاه پرونده‌های پرسنلی',
        descriptionEn: 'Go to Personnel Directory',
        badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
      },
      {
        keys: ['Alt', 'I'],
        altKeys: ['Ctrl', '3'],
        descriptionFa: 'ورود به صندوق ورودی مدیریت',
        descriptionEn: 'Go to Manager Inbox',
        badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
      },
    ],
  },
  {
    category: 'system',
    categoryFa: 'کنترل‌های عمومی',
    categoryEn: 'System Controls',
    items: [
      {
        keys: ['Shift', '?'],
        altKeys: ['Alt', 'K'],
        descriptionFa: 'نمایش راهنمای کلیدهای میانبر',
        descriptionEn: 'Show Keyboard Shortcuts Guide',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      {
        keys: ['Esc'],
        descriptionFa: 'بستن پنجره‌های باز و انصراف',
        descriptionEn: 'Close Active Modals',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      },
    ],
  },
];

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  if (!isOpen) return null;

  const isFa = settings.language === 'fa';

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      dir={isFa ? 'rtl' : 'ltr'}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 shadow-inner">
              <Keyboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg md:text-xl">
                  {isFa ? 'کلیدهای میانبر کیبورد' : 'Keyboard Shortcuts'}
                </h3>
                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/20">
                  Power User Mode
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                {isFa
                  ? 'جهت افزایش سرعت ثبت گزارش‌ها و مدیریت سریع‌تر سیستم'
                  : 'Accelerate workflow and quick action registration'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all active:scale-95 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-5 md:p-6 space-y-6 flex-1 bg-gray-50/50">
          {KEYBOARD_SHORTCUTS.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h4 className="font-extrabold text-sm text-gray-800">
                  {isFa ? section.categoryFa : section.categoryEn}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {section.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="p-3 rounded-2xl bg-white border border-gray-200/80 shadow-xs flex items-center justify-between gap-3 hover:border-indigo-200 transition-colors"
                  >
                    <span className="text-xs font-bold text-gray-700">
                      {isFa ? item.descriptionFa : item.descriptionEn}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 text-[11px] font-mono font-black bg-gray-100 text-gray-800 border border-gray-300 rounded-lg shadow-2xs min-w-[24px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="bg-white p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-indigo-600" />
            <span>
              {isFa
                ? 'کلیدهای میانبر در تمامی بخش‌های سیستم فعال هستند.'
                : 'Keyboard shortcuts are globally available across the app.'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            {isFa ? 'متوجه شدم (Esc)' : 'Got it (Esc)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
