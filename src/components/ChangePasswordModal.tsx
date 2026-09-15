import React, { useState } from 'react';
import { X, Key, ShieldAlert } from 'lucide-react';
import { User, AppSettings } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: AppSettings;
  onUpdatePassword: (newPasword: string) => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onUpdatePassword,
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const validatePassword = (pwd: string) => {
    return /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) && /\d/.test(pwd);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Check current password matched
    if (currentPass !== currentUser.password) {
      setErrorMessage(
        settings.language === 'fa'
          ? 'رمز عبور فعلی نادرست است.'
          : 'Current password is incorrect.'
      );
      return;
    }

    // Check validation of new password
    if (!validatePassword(newPass)) {
      setErrorMessage(
        settings.language === 'fa'
          ? 'رمز عبور جدید باید حداقل دارای یک حرف بزرگ، یک حرف کوچک و یک عدد باشد.'
          : 'New password must contain at least one uppercase letter, one lowercase letter, and one number.'
      );
      return;
    }

    // Check match
    if (newPass !== confirmPass) {
      setErrorMessage(
        settings.language === 'fa'
          ? 'رمز عبور جدید با تکرار آن مطابقت ندارد.'
          : 'New password and confirmation do not match.'
      );
      return;
    }

    if (newPass === currentPass) {
      setErrorMessage(
        settings.language === 'fa'
          ? 'رمز عبور جدید نمی‌تواند مشابه رمز قدیمی باشد.'
          : 'New password cannot be the same as your old password.'
      );
      return;
    }

    // Run callback
    onUpdatePassword(newPass);

    setSuccessMessage(
      settings.language === 'fa'
        ? 'رمز عبور شما با موفقیت تغییر یافت.'
        : 'Your password has been changed successfully.'
    );

    // Clear form fields
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');

    setTimeout(() => {
      onClose();
      setSuccessMessage('');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-250">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden scale-100 transform transition-all border border-gray-100"
        dir={settings.language === 'fa' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b border-gray-150">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-800">
              {settings.language === 'fa' ? 'تغییر رمز عبور کاربر' : 'Change Password'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 flex gap-2 items-start">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="leading-relaxed">
              <strong>{settings.language === 'fa' ? 'شرط امنیتی کلمه عبور:' : 'Password Security Rule:'}</strong>
              <p className="mt-1">
                {settings.language === 'fa'
                  ? 'بر اساس الزامات جدید هک‌ناپذیری، کلمه عبور شما حتماً باید شامل حداقل یک حرف بزرگ (A-Z)، یک حرف کوچک (a-z) و یک عدد (0-9) باشد.'
                  : 'For higher system containment, passwords must contain at least one uppercase letter (A-Z), one lowercase letter (a-z), and a number (0-9).'}
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="text-xs font-semibold bg-red-50 border border-red-200 text-red-650 p-3 rounded-xl">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl animate-bounce">
              {successMessage}
            </div>
          )}

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                {settings.language === 'fa' ? 'کلمه عبور فعلی' : 'Current Password'}
              </label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="*****"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                {settings.language === 'fa' ? 'کلمه عبور جدید' : 'New Password'}
              </label>
              <input
                type="password"
                required
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Upper, Lower, Number"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                {settings.language === 'fa' ? 'تکرار کلمه عبور جدید' : 'Confirm New Password'}
              </label>
              <input
                type="password"
                required
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Upper, Lower, Number"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-150 rounded-xl transition-colors"
            >
              {settings.language === 'fa' ? 'انصراف' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-750 rounded-xl transition-colors shadow-md shadow-indigo-100"
            >
              {settings.language === 'fa' ? 'بروزرسانی رمز عبور' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
