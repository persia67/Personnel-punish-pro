import React from 'react';
import { X, BookOpen, AlertCircle, Medal } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { AppSettings, SystemMode, CodeItem } from '../types';

interface CodeLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  mode: SystemMode;
  violationCodes: CodeItem[];
  rewardCodes: CodeItem[];
}

const CodeLegendModal: React.FC<CodeLegendModalProps> = ({ isOpen, onClose, settings, mode, violationCodes, rewardCodes }) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[settings.language];
  const items = mode === 'VIOLATION' ? violationCodes : rewardCodes;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className={`p-4 flex justify-between items-center text-white ${mode === 'VIOLATION' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          <div className="flex items-center gap-2">
             <BookOpen className="w-5 h-5" />
             <h3 className="font-bold text-lg">{t.codeLegend}</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="overflow-y-auto p-0 flex-1">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 sticky top-0">
                    <tr>
                        <th className={`p-3 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}>
                            {mode === 'VIOLATION' ? t.violationCode : t.rewardCode}
                        </th>
                        <th className={`p-3 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}>
                            {t.description}
                        </th>
                         <th className={`p-3 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}>
                            {t.department}
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-3 font-bold font-mono text-gray-800 w-20">
                                {item.code}
                            </td>
                            <td className="p-3 text-gray-600">
                                {item.label}
                            </td>
                            <td className="p-3 text-xs text-gray-400">
                                {item.department}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        
        <div className="bg-gray-50 p-3 text-center border-t border-gray-100 text-xs text-gray-500">
           {mode === 'VIOLATION' 
             ? "کدها برای ثبت سریع تخلفات استفاده می‌شوند." 
             : "کدها برای ثبت سریع تشویقات استفاده می‌شوند."}
        </div>
      </div>
    </div>
  );
};

export default CodeLegendModal;