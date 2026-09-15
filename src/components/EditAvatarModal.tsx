import { useState } from 'react';
import { X, Save, Camera, Link as LinkIcon, Check, Upload } from 'lucide-react';
import { User, AppSettings } from '../types';

interface EditAvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateAvatar: (newAvatar: string) => void;
  settings: AppSettings;
}

const PRESET_AVATARS = [
  { id: 'av_hse', label: 'HSE / Safety', emoji: '🧑‍🚒', gradient: 'from-orange-500 to-red-600', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 'av_sec', label: 'Security / Patrol', emoji: '👮', gradient: 'from-slate-600 to-slate-850', url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150&auto=format&fit=crop&q=80' },
  { id: 'av_trn', label: 'Training / Mentor', emoji: '🎓', gradient: 'from-amber-400 to-yellow-600', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
  { id: 'av_hr', label: 'HR / Talent', emoji: '👔', gradient: 'from-blue-500 to-indigo-600', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { id: 'av_adm', label: 'Admin / Support', emoji: '💼', gradient: 'from-cyan-500 to-sky-600', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80' },
  { id: 'av_dev', label: 'SysAdmin / Developer', emoji: '🧑‍💻', gradient: 'from-emerald-500 to-teal-600', url: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&auto=format&fit=crop&q=80' },
  { id: 'av_mgr', label: 'Plant Manager', emoji: '👑', gradient: 'from-violet-500 to-purple-600', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 'av_tech', label: 'Engineer', emoji: '⚙️', gradient: 'from-rose-500 to-orange-500', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
];

export function EditAvatarModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateAvatar,
  settings,
}: EditAvatarModalProps) {
  const isFa = settings.language === 'fa';
  const [customUrl, setCustomUrl] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateAvatar(selectedAvatar);
    onClose();
  };

  const handleApplyCustomUrl = () => {
    if (customUrl.trim()) {
      setSelectedAvatar(customUrl.trim());
      setCustomUrl('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert(isFa 
          ? 'حجم فایل انتخاب شده نباید بیشتر از ۲ مگابایت باشد.' 
          : 'File size should not exceed 2MB.'
        );
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-300" />
            <div>
              <h3 className="font-black text-sm md:text-base">
                {isFa ? 'تغییر عکس پروفایل کاربر' : 'Edit Profile Photo'}
              </h3>
              <p className="text-[10px] text-indigo-200">
                {isFa ? currentUser.fullName : currentUser.fullName} • {currentUser.username}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6">
          {/* Current Avatar State */}
          <div className="flex flex-col items-center justify-center bg-gray-50 p-4 rounded-2xl border border-gray-150">
            <div className="w-24 h-24 rounded-2xl bg-indigo-950/85 border-4 border-indigo-400 p-1 shadow-lg flex items-center justify-center overflow-hidden mb-2">
              {selectedAvatar ? (
                <img 
                  src={selectedAvatar} 
                  alt="Selected Preview" 
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    // fallback if unsplash/image is blocked or broken
                    e.currentTarget.style.display = 'none';
                  }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-indigo-600 text-white flex items-center justify-center rounded-xl font-bold text-4xl">
                  {currentUser.fullName.charAt(0)}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 font-bold">
              {isFa ? 'پیش‌نمایش تصویر انتخابی' : 'Selected Photo Preview'}
            </span>
          </div>

          {/* Presets List */}
          <div className="space-y-3">
            <span className="block text-xs font-black text-gray-700">
              {isFa ? '۱. انتخاب از بین عکس‌های پرسنلی پیش‌فرض' : '1. Choose Predefined Corporate Avatar'}
            </span>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = selectedAvatar === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedAvatar(preset.url)}
                    className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all p-0.5 group active:scale-95 ${
                      isSelected 
                        ? 'border-indigo-600 ring-4 ring-indigo-500/10' 
                        : 'border-gray-250 hover:border-indigo-300'
                    }`}
                  >
                    <img 
                      src={preset.url} 
                      alt={preset.label} 
                      className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/65 text-[10px] p-0.5 rounded px-1 text-white font-mono flex items-center gap-0.5">
                      <span>{preset.emoji}</span>
                    </div>
                    {isSelected && (
                      <div className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white bg-indigo-600 p-1 rounded-full border border-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* File Upload from PC / Phone */}
          <div className="space-y-3 pt-2">
            <span className="block text-xs font-black text-gray-700">
              {isFa ? '۲. بارگذاری عکس از روی رایانه یا گوشی تلفن همراه' : '2. Upload Photo from PC or Mobile'}
            </span>
            <div className="relative border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl p-5 text-center transition-colors cursor-pointer group bg-gray-50/45">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-[11px] text-gray-600">
                  <span className="font-bold text-indigo-600 hover:underline">
                    {isFa ? 'برای انتخاب فایل کلیک کنید' : 'Click to choose image'}
                  </span>
                  {isFa ? ' یا تصویر را به این کادر بکشید' : ' or drag and drop image here'}
                </div>
                <p className="text-[9px] text-gray-400">
                  PNG, JPG, JPEG (Max. 2MB)
                </p>
              </div>
            </div>
          </div>

          {/* Custom Link Input */}
          <div className="space-y-3 pt-2">
            <span className="block text-xs font-black text-gray-700">
              {isFa ? '۳. استفاده از آدرس اینترنتی سفارشی' : '3. Enter Custom Image URL'}
            </span>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <LinkIcon className="absolute top-2.5 right-3 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-250 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs md:text-sm bg-gray-50/50"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCustomUrl}
                className="bg-indigo-600 text-white px-4 rounded-xl text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all"
              >
                {isFa ? 'اعمال آدرس' : 'Apply'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 leading-normal">
              {isFa 
                ? 'نکته: می‌توانید آدرس هر عکس عمومی را کپی کرده و در این کادر قرار دهید.' 
                : 'Note: You can copy and paste any public image link in this box.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-4 border-t border-gray-150 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
          >
            {isFa ? 'انصراف' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{isFa ? 'ذخیره عکس پروفایل' : 'Save Photo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
