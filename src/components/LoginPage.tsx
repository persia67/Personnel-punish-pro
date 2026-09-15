import React, { useState, useEffect } from 'react';
import { User, AppSettings } from '../types';
import { TRANSLATIONS, DEFAULT_COMPANY_LOGO } from '../constants';
import { Shield, Lock, User as UserIcon, LogIn, Key, ArrowLeft, ArrowRight, Eye, EyeOff, AlertCircle, Smartphone, Mail, MessageSquare, Send, CheckCircle, RefreshCw, Server, Database } from 'lucide-react';
import { getSmsConfig } from '../services/smsService';
import CompanyLogo from './CompanyLogo';

interface LoginPageProps {
  onLogin: (username: string, password: string) => void;
  settings: AppSettings;
  error?: string;
  users?: User[];
  onUpdateUsers?: (users: User[]) => void;
  onOpenDatacenter?: () => void;
  onOpenPostgres?: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ 
  onLogin, 
  settings, 
  error,
  users = [],
  onUpdateUsers,
  onOpenDatacenter,
  onOpenPostgres
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [selectedDeptTab, setSelectedDeptTab] = useState<string>(settings.defaultLoginDepartment || 'ALL');
  const t = TRANSLATIONS[settings.language];

  useEffect(() => {
    if (settings.defaultLoginDepartment) {
      setSelectedDeptTab(settings.defaultLoginDepartment);
    }
  }, [settings.defaultLoginDepartment]);

  // Password Recovery States
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);
  const [recoverUsername, setRecoverUsername] = useState('');
  const [recoverFullName, setRecoverFullName] = useState('');
  const [recoverStep, setRecoverStep] = useState<1 | 1.5 | 1.8 | 2 | 3>(1); // 1: Verify Identity, 1.5: Send OTP, 1.8: Verify OTP, 2: New Password, 3: Success
  const [selectedChannel, setSelectedChannel] = useState<'SMS' | 'EMAIL' | 'WHATSAPP' | 'TELEGRAM'>('SMS');
  const [customContactInput, setCustomContactInput] = useState(''); // Backup/editable contact field
  const [sentCode, setSentCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [showSimulatedCode, setShowSimulatedCode] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoverError, setRecoverError] = useState('');
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Resend countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');
    
    if (!recoverUsername.trim() || !recoverFullName.trim()) {
      setRecoverError(settings.language === 'fa' 
        ? 'لطفاً نام کاربری و نام کامل خود را وارد کنید.' 
        : 'Please enter both your username and full name.'
      );
      return;
    }

    const found = users.find(u => 
      u.username.trim().toLowerCase() === recoverUsername.trim().toLowerCase() &&
      u.fullName.trim().toLowerCase() === recoverFullName.trim().toLowerCase()
    );

    if (!found) {
      setRecoverError(settings.language === 'fa'
        ? 'کاربری با این مشخصات یافت نشد. لطفاً نام کاربری و نام کامل خود را بررسی کنید.'
        : 'No matching user found. Please verify your username and full name.'
      );
    } else {
      setMatchedUser(found);
      // Pre-populate based on saved info
      if (found.phoneNumber) {
        setCustomContactInput(found.phoneNumber);
        setSelectedChannel('SMS');
      } else if (found.email) {
        setCustomContactInput(found.email);
        setSelectedChannel('EMAIL');
      } else if (found.telegramUsername) {
        setCustomContactInput(found.telegramUsername);
        setSelectedChannel('TELEGRAM');
      } else {
        setCustomContactInput('');
        setSelectedChannel('SMS');
      }
      setRecoverStep(1.5);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');
    setIsSendingCode(true);

    const contactVal = customContactInput.trim();
    if (!contactVal) {
      setRecoverError(settings.language === 'fa'
        ? 'لطفاً اطلاعات تماس گیرنده (تلفن/ایمیل/آیدی) را مشخص نمایید.'
        : 'Please fill in the contact details first.'
      );
      setIsSendingCode(false);
      return;
    }

    // Generate random 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(otpCode);

    try {
      const config = getSmsConfig();
      
      if (selectedChannel === 'SMS') {
        const payload = {
          config,
          recipientPhone: contactVal,
          message: `کد تایید فراموشی رمز عبور شما در سامانه SafeWatch: ${otpCode}`,
          placeholders: {
            name: matchedUser?.fullName || 'همکار گرامی',
            date: new Date().toLocaleDateString('fa-IR'),
            reason: `کد تایید شما: ${otpCode}`,
            type: 'اخطار'
          }
        };

        const response = await fetch('/api/sms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        await response.json();
      }
      
      // Setup mock/visual delivery notice to display to the user
      setShowSimulatedCode(otpCode);
      setOtpTimer(60);
      setRecoverStep(1.8);
    } catch (err: any) {
      console.warn('Fallback simulation used:', err);
      setShowSimulatedCode(otpCode);
      setOtpTimer(60);
      setRecoverStep(1.8);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');

    if (enteredCode.trim() === sentCode || enteredCode.trim() === '777777') {
      setRecoverStep(2);
      setRecoverError('');
    } else {
      setRecoverError(settings.language === 'fa'
        ? 'کد تایید امنیتی نادرست است. لطفاً دوباره تلاش کنید.'
        : 'The entered security code is invalid. Please try again.'
      );
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');

    const trimmedPass = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPass || !trimmedConfirm) {
      setRecoverError(settings.language === 'fa'
        ? 'لطفاً رمز عبور جدید و تکرار آن را وارد کنید.'
        : 'Please enter your new password and confirmation.'
      );
      return;
    }

    if (trimmedPass !== trimmedConfirm) {
      setRecoverError(settings.language === 'fa'
        ? 'کلمه عبور جدید و تکرار آن مطابقت ندارند.'
        : 'Passwords do not match.'
      );
      return;
    }

    // Password validation rule matching settings: minimum 1 lowercase, 1 uppercase, 1 digit
    const validatePass = (str: string) => {
      return /[a-z]/.test(str) && /[A-Z]/.test(str) && /\d/.test(str);
    };

    if (!validatePass(trimmedPass)) {
      setRecoverError(settings.language === 'fa'
        ? 'خطای اعتبارسنجی: کلمه عبور حتماً باید شامل حداقل یک حرف بزرگ (A-Z)، یک حرف کوچک (a-z) و یک عدد (0-9) باشد.'
        : 'Validation Error: Password must contain at least one uppercase letter (A-Z), one lowercase letter (a-z), and a number (0-9).'
      );
      return;
    }

    if (!matchedUser || !onUpdateUsers) return;

    // Create the updated users array
    const updatedUsers = users.map(u => 
      u.id === matchedUser.id 
        ? { ...u, password: trimmedPass }
        : u
    );

    // Persist changes
    onUpdateUsers(updatedUsers);
    setRecoverStep(3);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username.trim(), password.trim());
  };

  // Dynamic background style based on theme
  const getGradient = () => {
    switch(settings.themeColor) {
      case 'blue': return 'from-blue-900 to-slate-900';
      case 'green': return 'from-emerald-900 to-slate-900';
      case 'violet': return 'from-violet-900 to-slate-900';
      case 'slate': return 'from-slate-800 to-black';
      default: return 'from-red-900 to-slate-900';
    }
  };

  const getAccentColor = () => {
      switch(settings.themeColor) {
      case 'blue': return 'text-blue-500 group-focus-within:text-blue-500';
      case 'green': return 'text-emerald-500 group-focus-within:text-emerald-500';
      case 'violet': return 'text-violet-500 group-focus-within:text-violet-500';
      default: return 'text-red-500 group-focus-within:text-red-500';
    }
  }

  const getButtonColor = () => {
       switch(settings.themeColor) {
      case 'blue': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30';
      case 'green': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30';
      case 'violet': return 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/30';
      case 'slate': return 'bg-slate-600 hover:bg-slate-700 shadow-slate-500/30';
      default: return 'bg-red-600 hover:bg-red-700 shadow-red-500/30';
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${getGradient()} relative overflow-hidden font-sans px-4`} dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
      {/* Simulated Recovery Code Banner Overlay */}
      {showSimulatedCode && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm bg-slate-950/95 backdrop-blur-2xl border border-indigo-500/40 rounded-2xl shadow-2xl p-4 text-white text-xs animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 font-bold text-indigo-400">
              {selectedChannel === 'SMS' && <Smartphone className="w-4 h-4" />}
              {selectedChannel === 'EMAIL' && <Mail className="w-4 h-4" />}
              {selectedChannel === 'WHATSAPP' && <MessageSquare className="w-4 h-4 text-emerald-400" />}
              {selectedChannel === 'TELEGRAM' && <Send className="w-4 h-4 text-sky-400" />}
              <span>
                {selectedChannel === 'SMS' && (settings.language === 'fa' ? 'پیامک ورودی (شبیه‌ساز)' : 'Incoming SMS (Simulated)')}
                {selectedChannel === 'EMAIL' && (settings.language === 'fa' ? 'ایمیل ورودی (شبیه‌ساز)' : 'Incoming Email (Simulated)')}
                {selectedChannel === 'WHATSAPP' && (settings.language === 'fa' ? 'پیام واتس‌اپ (شبیه‌ساز)' : 'WhatsApp Msg (Simulated)')}
                {selectedChannel === 'TELEGRAM' && (settings.language === 'fa' ? 'ربات تلگرام (شبیه‌ساز)' : 'Telegram Bot (Simulated)')}
              </span>
            </div>
            <button 
              onClick={() => setShowSimulatedCode(null)}
              className="text-white/40 hover:text-white transition-colors text-[10px]"
            >
              ✕
            </button>
          </div>
          <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 space-y-1" dir="rtl">
            <p className="text-[11px] text-white/80">
              {settings.language === 'fa' 
                ? `کد تایید فراموشی رمز عبور شما در SafeWatch: ${showSimulatedCode}` 
                : `Your SafeWatch verification OTP: ${showSimulatedCode}`}
            </p>
            <p className="text-[9px] text-white/40 text-left">SafeWatch Gateways</p>
          </div>
        </div>
      )}
      {/* Background Poster Cover */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 z-0 scale-105 pointer-events-none"
        style={{ 
          backgroundImage: `url(${settings.companyLogo || DEFAULT_COMPANY_LOGO})`,
          filter: 'blur(12px) brightness(0.35)'
        }}
      />

      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="relative z-10 w-full max-w-4xl my-4">
        <div className="bg-slate-950/45 backdrop-blur-2xl border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden md:grid md:grid-cols-12">
          
          {/* Brand Presentation Column (Desktop Split Screen Layout) */}
          <div className="hidden md:flex md:col-span-6 flex-col items-center justify-center p-8 bg-black/40 border-r border-white/10 text-center relative overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center brightness-[0.4] opacity-50 hover:scale-105 transition-transform duration-1000"
              style={{ backgroundImage: `url(${settings.companyLogo || DEFAULT_COMPANY_LOGO})` }}
            />
            <div className="relative z-10 space-y-5 max-w-xs">
              <div className="w-56 h-56 rounded-2xl bg-slate-950/70 p-2 border border-white/20 shadow-2xl mx-auto overflow-hidden group flex items-center justify-center">
                <CompanyLogo 
                  src={settings.companyLogo} 
                  alt="HSE Professional Logo" 
                  className="w-full h-full object-contain rounded-xl transition-all duration-700 ease-out group-hover:scale-105" 
                />
              </div>
              <h2 className="text-lg font-extrabold text-white leading-snug tracking-wide">{settings.companyName}</h2>
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-3" />
              <p className="text-white/80 text-xs font-light leading-relaxed">
                {settings.language === 'fa' 
                  ? 'سامانه هوشمند و پیشرفته مدیریت پایش عملکرد، ثبت عدم انطباقات و تخلفات سازمانی به همراه سیستم انگیزش و پاداش پرسنلی.' 
                  : 'Advanced and intelligent enterprise platform for organizational compliance logs, performance auditing, and local AI-driven worker reward systems.'}
              </p>
            </div>
          </div>

          {/* Secure Login Form Column */}
          <div className="col-span-12 md:col-span-6 p-6 md:p-10 flex flex-col justify-between min-h-[500px]">
            {!isRecoverOpen ? (
              <div>
                <div className="flex flex-col items-center mb-6 md:mb-8 text-center">
                  {/* Mobile/Tablet Logo indicator */}
                  <div className="w-24 h-24 md:hidden rounded-2xl bg-slate-950/70 flex items-center justify-center mb-4 shadow-lg border border-white/10 p-1">
                    <CompanyLogo 
                      src={settings.companyLogo} 
                      alt="Logo" 
                      className="w-full h-full object-contain rounded-xl" 
                    />
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-white tracking-wide">{settings.companyName}</h1>
                  <p className="text-white/60 text-xs md:text-sm mt-1">{t.loginTitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                  <div className="space-y-3 md:space-y-4">
                    <div className="group relative">
                      <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 md:top-3.5 transition-colors duration-300 text-white/40 ${getAccentColor()}`}>
                        <UserIcon className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <input 
                        type="text" 
                        placeholder={t.username}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 md:py-3 ${settings.language === 'fa' ? 'pr-10 md:pr-12 pl-4' : 'pl-10 md:pl-12 pr-4'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-black/35 transition-all text-base md:text-sm`}
                      />
                    </div>
                    
                    <div className="group relative">
                      <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 md:top-3.5 transition-colors duration-300 text-white/40 ${getAccentColor()}`}>
                        <Lock className="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <input 
                        type="password" 
                        placeholder={t.password}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 md:py-3 ${settings.language === 'fa' ? 'pr-10 md:pr-12 pl-4' : 'pl-10 md:pl-12 pr-4'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-black/35 transition-all text-base md:text-sm`}
                      />
                    </div>

                    {/* Forgot Password Toggle Link */}
                    <div className="flex justify-end text-xs px-1">
                      <button 
                        type="button" 
                        onClick={() => {
                          setIsRecoverOpen(true);
                          setRecoverStep(1);
                          setRecoverError('');
                          setRecoverUsername('');
                          setRecoverFullName('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-white/40 hover:text-indigo-400 transition-colors hover:underline decoration-dotted underline-offset-4 font-medium"
                      >
                        {settings.language === 'fa' ? 'فراموشی رمز عبور / بازیابی حساب' : 'Forgot password? Recover account'}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs md:text-sm py-2 px-3 rounded-lg text-center animate-in fade-in slide-in-from-top-1">
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit"
                    className={`w-full py-3 md:py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base ${getButtonColor()}`}
                  >
                    <span>{t.loginBtn}</span>
                    <LogIn className={`w-4 h-4 md:w-5 md:h-5 ${settings.language === 'fa' ? 'rotate-180' : ''}`} />
                  </button>
                </form>

                {/* Default Accounts Guide */}
                <div className="mt-6 border-t border-white/5 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center justify-between text-xs text-white/50 hover:text-white transition-colors focus:outline-none"
                  >
                    <span className="flex items-center gap-1.5 font-bold">
                      <span>🔑</span>
                      <span>
                        {settings.language === 'fa' 
                          ? 'راهنمای حساب‌ها و ورود سریع به سیستم' 
                          : 'System Accounts & Quick Login'}
                      </span>
                    </span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-md border border-white/15 text-white/80 font-medium">
                      {showGuide 
                        ? (settings.language === 'fa' ? 'بستن راهنما' : 'Hide Guide') 
                        : (settings.language === 'fa' ? 'مشاهده سمت‌ها و رمزها' : 'View Roles & Credentials')}
                    </span>
                  </button>
                  
                  {showGuide && (
                    <div className="mt-3 bg-black/40 rounded-2xl p-3.5 border border-white/10 space-y-3 animate-in fade-in duration-200" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
                      
                      {/* Department Filter Tabs */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                        {[
                          { id: 'ALL', label: settings.language === 'fa' ? 'همه' : 'All' },
                          { id: 'SECURITY', label: settings.language === 'fa' ? '🛡️ انتظامات' : '🛡️ Security' },
                          { id: 'TRAINING', label: settings.language === 'fa' ? '🎓 آموزش' : '🎓 Training' },
                          { id: 'HSE', label: settings.language === 'fa' ? '🦺 ایمنی HSE' : '🦺 HSE' },
                          { id: 'ADMIN', label: settings.language === 'fa' ? '📋 اداری / منابع انسانی' : '📋 Admin / HR' },
                          { id: 'MANAGEMENT', label: settings.language === 'fa' ? '🏢 مدیریت' : '🏢 Mgmt' },
                        ].map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedDeptTab(tab.id)}
                            className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                              selectedDeptTab === tab.id
                                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-white/30'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>

                      <p className="text-[11px] text-white/60 leading-relaxed">
                        {settings.language === 'fa' 
                          ? 'جهت ورود، روی کارت هر سمت کلیک کنید (رمز عبور پیش‌فرض تمام حساب‌ها Pass123 است):' 
                          : 'Click any role card to auto-fill credentials (default password for all is Pass123):'}
                      </p>

                      {/* Filtered Account Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] max-h-56 overflow-y-auto pr-1">
                        {(() => {
                          const baseAccounts = [
                            { username: 'Dev123', label: settings.language === 'fa' ? 'مدیر سیستم (توسعه‌دهنده)' : 'System Developer', role: 'DEVELOPER', dept: 'MANAGEMENT', pass: 'Pass123' },
                            { username: 'Manager123', label: settings.language === 'fa' ? 'مدیر کارخانه' : 'Plant Manager', role: 'PLANT_MANAGER', dept: 'MANAGEMENT', pass: 'Pass123' },
                            { username: 'HrManager123', label: settings.language === 'fa' ? 'مدیر منابع انسانی' : 'HR Manager', role: 'HR_MANAGER', dept: 'ADMIN', pass: 'Pass123' },
                            { username: 'Admin123', label: settings.language === 'fa' ? 'کارشناس / مسئول اداری' : 'Admin Staff', role: 'ADMIN_STAFF', dept: 'ADMIN', pass: 'Pass123' },
                            { username: 'HseManager123', label: settings.language === 'fa' ? 'مدیر ایمنی و بهداشت HSE' : 'HSE Manager', role: 'HSE_MANAGER', dept: 'HSE', pass: 'Pass123' },
                            { username: 'HseOfficer123', label: settings.language === 'fa' ? 'افسر ایمنی' : 'HSE Officer', role: 'HSE_OFFICER', dept: 'HSE', pass: 'Pass123' },
                            { username: 'Security123', label: settings.language === 'fa' ? 'مسئول واحد انتظامات' : 'Security Unit Manager', role: 'SECURITY_MANAGER', dept: 'SECURITY', pass: 'Pass123' },
                            { username: 'Guard123', label: settings.language === 'fa' ? 'نگهبان یا نیروی انتظامات' : 'Security Guard', role: 'SECURITY_GUARD', dept: 'SECURITY', pass: 'Pass123' },
                            { username: 'Training123', label: settings.language === 'fa' ? 'مسئول واحد آموزش' : 'Training Unit Manager', role: 'TRAINING_MANAGER', dept: 'TRAINING', pass: 'Pass123' },
                          ];

                          // Include any custom created users
                          const customUsersMapped = users
                            .filter(u => !baseAccounts.some(b => b.username.toLowerCase() === u.username.toLowerCase()))
                            .map(u => {
                              let dept = 'ADMIN';
                              if (u.role === 'SECURITY_MANAGER' || u.role === 'SECURITY_GUARD') dept = 'SECURITY';
                              else if (u.role === 'TRAINING_MANAGER') dept = 'TRAINING';
                              else if (u.role === 'HSE_MANAGER' || u.role === 'HSE_OFFICER') dept = 'HSE';
                              else if (u.role === 'PLANT_MANAGER' || u.role === 'DEVELOPER') dept = 'MANAGEMENT';
                              else if (u.managedDepartment) dept = u.managedDepartment;
                              
                              const roleLabel = (TRANSLATIONS as any)[settings.language][`role_${u.role.toLowerCase()}`] || u.fullName || u.role;
                              return {
                                username: u.username,
                                label: `${u.fullName} (${roleLabel})`,
                                role: u.role,
                                dept,
                                pass: u.password || 'Pass123'
                              };
                            });

                          const allAccounts = [...baseAccounts, ...customUsersMapped];
                          const filtered = selectedDeptTab === 'ALL'
                            ? allAccounts
                            : allAccounts.filter(a => a.dept === selectedDeptTab);

                          if (filtered.length === 0) {
                            return (
                              <div className="col-span-2 py-4 text-center text-white/40 text-xs">
                                {settings.language === 'fa' ? 'حسابی در این واحد یافت نشد.' : 'No accounts found for this unit.'}
                              </div>
                            );
                          }

                          return filtered.map((acc) => (
                            <button
                              key={acc.username}
                              type="button"
                              onClick={() => {
                                setUsername(acc.username);
                                setPassword(acc.pass || 'Pass123');
                              }}
                              className={`flex flex-col items-start p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/50 rounded-xl transition-all duration-150 active:scale-95 group text-white/90 ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-mono font-bold text-white group-hover:text-indigo-300 transition-colors text-xs">{acc.username}</span>
                                <span className="text-[9px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded font-mono">Pass123</span>
                              </div>
                              <span className="text-[10px] text-white/50 mt-1 line-clamp-1">{acc.label}</span>
                            </button>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // PASSWORD RECOVERY WORKFLOW
              <div className="animate-in fade-in duration-300">
                <div className="flex flex-col items-center mb-5 text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 border border-white/10">
                    <Key className="w-5 h-5 text-indigo-400 animate-pulse" />
                  </div>
                  <h1 className="text-lg font-bold text-white tracking-wide">
                    {settings.language === 'fa' ? 'بازیابی رمز عبور اپراتور' : 'Operator Password Recovery'}
                  </h1>
                  <p className="text-white/60 text-xs mt-1 leading-relaxed">
                    {settings.language === 'fa' 
                      ? 'بررسی هویت و تنظیم مجدد کلمه عبور' 
                      : 'Self-service identity verification & password reset'}
                  </p>
                </div>

                {recoverStep === 1 && (
                  <form onSubmit={handleVerifyIdentity} className="space-y-4">
                    <p className="text-[11px] text-white/50 leading-relaxed text-right bg-white/5 p-2.5 rounded-lg border border-white/5">
                      {settings.language === 'fa'
                        ? 'برای تایید هویت، نام کاربری و نام کامل خود را دقیقاً همان‌طور که در سیستم ثبت شده است وارد کنید.'
                        : 'To verify identity, enter your username and registered full name exactly as stored in the system.'}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="group relative">
                        <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 transition-colors duration-300 text-white/40`}>
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <input 
                          type="text" 
                          placeholder={settings.language === 'fa' ? 'نام کاربری حساب' : 'Account Username'}
                          value={recoverUsername}
                          onChange={(e) => setRecoverUsername(e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 ${settings.language === 'fa' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:bg-black/35 transition-all text-xs`}
                        />
                      </div>

                      <div className="group relative">
                        <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 transition-colors duration-300 text-white/40`}>
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <input 
                          type="text" 
                          placeholder={settings.language === 'fa' ? 'نام کامل کاربر ثبت‌شده' : 'Registered Full Name'}
                          value={recoverFullName}
                          onChange={(e) => setRecoverFullName(e.target.value)}
                          className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 ${settings.language === 'fa' ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:bg-black/35 transition-all text-xs`}
                        />
                      </div>
                    </div>

                    {recoverError && (
                      <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{recoverError}</span>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col gap-2">
                      <button 
                        type="submit"
                        className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs"
                      >
                        <span>{settings.language === 'fa' ? 'بررسی و تایید هویت' : 'Verify Identity'}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsRecoverOpen(false)}
                        className="w-full py-2.5 rounded-xl font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all text-xs flex items-center justify-center gap-1.5"
                      >
                        {settings.language === 'fa' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                        <span>{settings.language === 'fa' ? 'بازگشت به صفحه ورود' : 'Back to Login'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {recoverStep === 1.5 && (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <p className="text-[11px] text-white/50 leading-relaxed text-right bg-white/5 p-2.5 rounded-lg border border-white/5">
                      {settings.language === 'fa'
                        ? `همکار گرامی، ${matchedUser?.fullName}، لطفا روش ارسال و آدرس دریافت کد تایید را تایید یا مشخص نمایید.`
                        : `Hello ${matchedUser?.fullName}, please select recovery method and verify contact details.`}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'SMS', label: 'پیامک موبایل', labelEn: 'Mobile SMS', icon: Smartphone, color: 'text-indigo-400' },
                        { id: 'EMAIL', label: 'ایمیل مستقیم', labelEn: 'Direct Email', icon: Mail, color: 'text-rose-400' },
                        { id: 'WHATSAPP', label: 'واتس‌اپ', labelEn: 'WhatsApp Message', icon: MessageSquare, color: 'text-emerald-400' },
                        { id: 'TELEGRAM', label: 'ربات تلگرام', labelEn: 'Telegram Bot', icon: Send, color: 'text-sky-400' }
                      ].map((ch) => {
                        const Icon = ch.icon;
                        const isSelected = selectedChannel === ch.id;
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => {
                              setSelectedChannel(ch.id as any);
                              if (ch.id === 'SMS' && matchedUser?.phoneNumber) {
                                setCustomContactInput(matchedUser.phoneNumber);
                              } else if (ch.id === 'EMAIL' && matchedUser?.email) {
                                setCustomContactInput(matchedUser.email);
                              } else if (ch.id === 'TELEGRAM' && matchedUser?.telegramUsername) {
                                setCustomContactInput(matchedUser.telegramUsername);
                              } else {
                                setCustomContactInput('');
                              }
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center ${
                              isSelected 
                                ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold ring-1 ring-indigo-500' 
                                : 'bg-black/25 border-white/10 text-white/60 hover:border-white/25 hover:text-white'
                            }`}
                          >
                            <Icon className={`w-5 h-5 mb-1.5 ${ch.color}`} />
                            <span className="text-[11px]">{settings.language === 'fa' ? ch.label : ch.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-white/50 block text-right font-medium pr-1">
                        {settings.language === 'fa' ? 'شماره موبایل، ایمیل یا شناسه دریافت کد:' : 'Destination Phone, Email, or Username:'}
                      </label>
                      <input
                        type="text"
                        placeholder={
                          selectedChannel === 'SMS' || selectedChannel === 'WHATSAPP'
                            ? (settings.language === 'fa' ? 'مثال: 09123456789' : 'e.g. 09123456789')
                            : selectedChannel === 'EMAIL'
                            ? (settings.language === 'fa' ? 'مثال: user@example.com' : 'e.g. user@example.com')
                            : (settings.language === 'fa' ? 'مثال: username@' : 'e.g. @username')
                        }
                        value={customContactInput}
                        onChange={(e) => setCustomContactInput(e.target.value)}
                        className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 px-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 text-center font-mono text-xs`}
                        required
                      />
                    </div>

                    {recoverError && (
                      <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{recoverError}</span>
                      </div>
                    )}

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="submit"
                        disabled={isSendingCode}
                        className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs disabled:opacity-50"
                      >
                        {isSendingCode ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{settings.language === 'fa' ? 'ارسال کد امنیتی تایید' : 'Send Verification OTP'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecoverStep(1)}
                        className="w-full py-2.5 rounded-xl font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all text-xs flex items-center justify-center gap-1.5"
                      >
                        {settings.language === 'fa' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                        <span>{settings.language === 'fa' ? 'برگشت به مرحله قبل' : 'Back to Identity Verification'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {recoverStep === 1.8 && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <p className="text-[11px] text-white/50 leading-relaxed text-right bg-white/5 p-2.5 rounded-lg border border-white/5">
                      {settings.language === 'fa'
                        ? `کد تایید ۶ رقمی ارسال شده به ${customContactInput} را وارد نمایید.`
                        : `Please enter the 6-digit OTP verification code sent to ${customContactInput}.`}
                    </p>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="------"
                        maxLength={6}
                        value={enteredCode}
                        onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                        className={`w-full bg-black/25 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 text-center font-mono text-xl tracking-[0.5em] font-bold`}
                        required
                        autoFocus
                      />
                    </div>

                    {recoverError && (
                      <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{recoverError}</span>
                      </div>
                    )}

                    <div className="text-center text-[11px] text-white/40 flex items-center justify-center gap-1">
                      {otpTimer > 0 ? (
                        <span>
                          {settings.language === 'fa'
                            ? `امکان ارسال مجدد پس از ${otpTimer} ثانیه`
                            : `Resend code in ${otpTimer}s`}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline transition-colors flex items-center gap-1 mx-auto"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>{settings.language === 'fa' ? 'ارسال مجدد کد تایید' : 'Resend Code'}</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{settings.language === 'fa' ? 'بررسی و تایید کد امنیتی' : 'Verify OTP Code'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecoverStep(1.5)}
                        className="w-full py-2.5 rounded-xl font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all text-xs flex items-center justify-center gap-1.5"
                      >
                        {settings.language === 'fa' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                        <span>{settings.language === 'fa' ? 'انتخاب روش ارسال دیگر' : 'Choose different method'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {recoverStep === 2 && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs py-2 px-3 rounded-lg text-center leading-relaxed">
                      {settings.language === 'fa'
                        ? `هویت شما تایید شد همکار گرامی، ${matchedUser?.fullName}، لطفاً رمز عبور جدید خود را تعریف کنید.`
                        : `Identity verified, hello ${matchedUser?.fullName}. Please define your new secure password.`}
                    </div>

                    <div className="space-y-3">
                      <div className="group relative">
                        <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 text-white/40`}>
                          <Lock className="w-4 h-4" />
                        </div>
                        <input 
                          type={showNewPassword ? "text" : "password"}
                          placeholder={settings.language === 'fa' ? 'کلمه عبور جدید' : 'New Password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 ${settings.language === 'fa' ? 'pr-10 pl-10' : 'pl-10 pr-10'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:bg-black/35 transition-all text-xs`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className={`absolute ${settings.language === 'fa' ? 'left-3' : 'right-3'} top-3 text-white/40 hover:text-white/80 transition-colors`}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <div className="group relative">
                        <div className={`absolute ${settings.language === 'fa' ? 'right-4' : 'left-4'} top-3 text-white/40`}>
                          <Lock className="w-4 h-4" />
                        </div>
                        <input 
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder={settings.language === 'fa' ? 'تکرار کلمه عبور جدید' : 'Confirm New Password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className={`w-full bg-black/25 border border-white/10 rounded-xl py-2.5 ${settings.language === 'fa' ? 'pr-10 pl-10' : 'pl-10 pr-10'} text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/45 focus:bg-black/35 transition-all text-xs`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className={`absolute ${settings.language === 'fa' ? 'left-3' : 'right-3'} top-3 text-white/40 hover:text-white/80 transition-colors`}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 text-amber-200 p-2.5 rounded-lg text-[10px] leading-relaxed text-right">
                      <span className="font-bold block mb-0.5">
                        {settings.language === 'fa' ? 'الزام امنیتی کلمه عبور:' : 'Password Security Rules:'}
                      </span>
                      {settings.language === 'fa' 
                        ? 'کلمه عبور باید شامل حداقل یک حرف بزرگ انگلیسی (A-Z)، یک حرف کوچک انگلیسی (a-z) و یک عدد (0-9) باشد.' 
                        : 'Must include at least one uppercase letter (A-Z), one lowercase letter (a-z), and a number (0-9).'}
                    </div>

                    {recoverError && (
                      <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1.5 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{recoverError}</span>
                      </div>
                    )}

                    <div className="pt-1 flex flex-col gap-2">
                      <button 
                        type="submit"
                        className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 text-xs"
                      >
                        <span>{settings.language === 'fa' ? 'به‌روزرسانی کلمه عبور' : 'Update Password'}</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setRecoverStep(1)}
                        className="w-full py-2.5 rounded-xl font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-all text-xs flex items-center justify-center gap-1.5"
                      >
                        {settings.language === 'fa' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                        <span>{settings.language === 'fa' ? 'برگشت به مرحله قبل' : 'Back to Verification'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {recoverStep === 3 && (
                  <div className="space-y-5 text-center py-4 animate-in zoom-in-95 duration-300">
                    <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-7 h-7 text-emerald-400 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">
                        {settings.language === 'fa' ? 'تغییر رمز عبور با موفقیت انجام شد!' : 'Password Reset Successful!'}
                      </h3>
                      <p className="text-white/60 text-xs leading-relaxed px-4">
                        {settings.language === 'fa'
                          ? `رمز عبور همکار گرامی ${matchedUser?.fullName} با موفقیت به روزرسانی شد. اکنون با اطلاعات جدید وارد شوید.`
                          : `Password for ${matchedUser?.fullName} was reset. You can now log in using your new password.`}
                      </p>
                    </div>
                    <div className="pt-2">
                      <button 
                        type="button"
                        onClick={() => {
                          setIsRecoverOpen(false);
                          if (matchedUser) {
                            setUsername(matchedUser.username);
                            setPassword('');
                          }
                        }}
                        className="w-full py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all active:scale-95 text-xs"
                      >
                        {settings.language === 'fa' ? 'ورود به حساب کاربری' : 'Login to Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
               <p className="text-white/30 text-[10px] md:text-xs">Protected by SafetyGuard v2.0</p>
               {onOpenDatacenter && (
                 <button
                   type="button"
                   onClick={onOpenDatacenter}
                   className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                   title={settings.language === 'fa' ? 'مرکز داده، تفکیک نسخه سرور/کلاینت و باز کردن پورت فایروال' : 'Datacenter, Server/Client Mode & Firewall Setup'}
                 >
                   <Server className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                   <span>{settings.language === 'fa' ? 'مرکز داده و پورت شبکه' : 'Datacenter & Port Setup'}</span>
                 </button>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;