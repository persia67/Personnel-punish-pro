import React, { useMemo, useState } from 'react';
import { Violation, Reward, User, AppSettings, Employee } from '../types';
import { TRANSLATIONS } from '../constants';
import { X, User as UserIcon, Shield, Activity, TrendingUp, TrendingDown, AlertTriangle, Briefcase, GraduationCap, Gavel, FileText, Calendar, Camera } from 'lucide-react';

interface PersonnelProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnelId: string;
  violations: Violation[];
  rewards: Reward[];
  settings: AppSettings;
  employees?: Employee[];
}

const PersonnelProfileModal: React.FC<PersonnelProfileModalProps> = ({ 
  isOpen, onClose, personnelId, violations, rewards, settings, employees = []
}) => {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  if (!isOpen) return null;
  const t = TRANSLATIONS[settings.language];

  // Search in primary employee registry
  const registeredEmployee = employees.find(emp => emp.personnelId === personnelId);

  // Check which details are missing
  const incompleteFields: string[] = [];
  if (registeredEmployee) {
    if (!registeredEmployee.department || registeredEmployee.department.trim() === '') {
      incompleteFields.push(settings.language === 'fa' ? 'واحد سازمانی' : 'Department');
    }
    if (!registeredEmployee.nationalId || registeredEmployee.nationalId.trim() === '') {
      incompleteFields.push(settings.language === 'fa' ? 'کد ملی' : 'National ID');
    }
    if (!registeredEmployee.phoneNumber || registeredEmployee.phoneNumber.trim() === '') {
      incompleteFields.push(settings.language === 'fa' ? 'شماره همراه پیامک' : 'SMS Phone Number');
    }
    if (!registeredEmployee.jobTitle || registeredEmployee.jobTitle.trim() === '') {
      incompleteFields.push(settings.language === 'fa' ? 'سمت شغلی' : 'Job Title');
    }
    if (!registeredEmployee.hireDate || registeredEmployee.hireDate.trim() === '') {
      incompleteFields.push(settings.language === 'fa' ? 'تاریخ شروع به کار' : 'Hire Date');
    }
  }

  // Aggregate Data
  const userViolations = violations.filter(v => v.personnelId === personnelId);
  const userRewards = rewards.filter(r => r.personnelId === personnelId);
  
  // Assemble basic info preferring registered registry records
  const basicInfo = {
    employeeName: registeredEmployee?.fullName || userViolations[0]?.employeeName || userRewards[0]?.employeeName || 'N/A',
    department: registeredEmployee?.department || userViolations[0]?.department || userRewards[0]?.department || 'N/A',
    personnelId,
    nationalId: registeredEmployee?.nationalId || '',
    jobTitle: registeredEmployee?.jobTitle || '',
    hireDate: registeredEmployee?.hireDate || ''
  };

  // Calculate Score (Base 100) - Only for approved items as requested
  const startScore = 100;
  const violationScore = userViolations.filter(v => v.isApproved).reduce((acc, v) => acc + (v.score || 0), 0); // scores are negative
  const rewardScore = userRewards.filter(r => r.isApproved).reduce((acc, r) => acc + (r.score || 0), 0);
  const totalScore = startScore + violationScore + rewardScore;

  const pendingViolationsCount = userViolations.filter(v => !v.isApproved).length;
  const pendingRewardsCount = userRewards.filter(r => !r.isApproved).length;

  // Determine Status based on Score
  let status = { text: t.status_Good, color: 'text-blue-600', bg: 'bg-blue-100', icon: <Activity /> };
  if (totalScore >= 120) status = { text: t.status_Excellent, color: 'text-emerald-600', bg: 'bg-emerald-100', icon: <TrendingUp /> };
  else if (totalScore < 70 && totalScore >= 50) status = { text: t.status_Warning, color: 'text-orange-600', bg: 'bg-orange-100', icon: <AlertTriangle /> };
  else if (totalScore < 50 && totalScore >= 20) status = { text: t.status_Danger, color: 'text-red-600', bg: 'bg-red-100', icon: <Gavel /> };
  else if (totalScore < 20) status = { text: t.status_Critical, color: 'text-red-800', bg: 'bg-red-200', icon: <X /> };

  // Group by Dept
  const byDept = (dept: string) => ({
    v: userViolations.filter(v => v.departmentSource === dept),
    r: userRewards.filter(r => r.departmentSource === dept)
  });

  // Find all unique department sources in this person's records dynamically
  const uniqueDeptSources = Array.from(new Set([
    ...userViolations.map(v => v.departmentSource),
    ...userRewards.map(r => r.departmentSource)
  ])).filter(Boolean);

  const getDeptDisplayName = (dept: string) => {
    const key = `dept_${dept}`;
    return (t as any)[key] || dept;
  };

  const getDeptColorClass = (dept: string) => {
    switch (dept) {
      case 'HSE': return 'bg-orange-100 text-orange-800';
      case 'SECURITY': return 'bg-slate-200 text-slate-800';
      case 'TRAINING': return 'bg-blue-100 text-blue-800';
      case 'ADMIN': 
      case 'HR':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-indigo-100 text-indigo-800';
    }
  };

  const getDeptIcon = (dept: string) => {
    switch (dept) {
      case 'HSE': return <Shield className="w-4 h-4" />;
      case 'SECURITY': return <AlertTriangle className="w-4 h-4" />;
      case 'TRAINING': return <GraduationCap className="w-4 h-4" />;
      case 'ADMIN':
      case 'HR':
        return <Briefcase className="w-4 h-4" />;
      default:
        return <Briefcase className="w-4 h-4" />;
    }
  };

  const renderSection = (title: string, icon: React.ReactNode, data: {v: Violation[], r: Reward[]}, colorClass: string, key: string) => {
    if (data.v.length === 0 && data.r.length === 0) return null;
    return (
      <div key={key} className={`mb-4 rounded-xl border border-gray-200 overflow-hidden shadow-sm`}>
        <div className={`px-4 py-2.5 ${colorClass} flex justify-between items-center`}>
            <div className="flex items-center gap-2 font-bold text-sm md:text-base">
                {icon} {title}
            </div>
            <span className="text-xs bg-white/30 px-2 py-0.5 rounded text-black/70 font-mono">
                {data.v.length} {t.violations} / {data.r.length} {t.rewards}
            </span>
        </div>
        <div className="p-3 space-y-2.5 bg-white">
            {data.v.map(v => (
                <div key={v.id} className={`flex justify-between items-center text-xs md:text-sm p-3 rounded-xl transition-all ${
                  v.isApproved 
                    ? 'bg-red-50/80 border-r-4 border-red-500 text-gray-900 shadow-xs' 
                    : 'bg-amber-50/60 border-2 border-dashed border-amber-300 text-gray-900 shadow-xs'
                }`}>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {v.evidence && (
                        <img 
                          src={v.evidence} 
                          alt="Evidence" 
                          className="w-9 h-9 object-cover rounded-lg cursor-pointer border border-red-200 hover:scale-105 transition-transform shrink-0" 
                          onClick={() => setActiveImage(v.evidence || null)}
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-semibold truncate">{v.violationType}</span>
                        {v.description && <span className="text-[10px] text-gray-500 truncate block font-medium">{v.description}</span>}
                        <span className="text-[10px] text-gray-500 font-medium">
                          {v.isApproved 
                            ? (settings.language === 'fa' ? '✓ تایید نهایی و درج در پرونده' : '✓ Approved & Logged') 
                            : (settings.language === 'fa' ? '⚠ ثبت اولیه - در انتظار تایید مدیریت' : '⚠ Preliminary - Pending Review')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                         <span className={`font-black font-mono text-sm ${v.isApproved ? 'text-red-600' : 'text-amber-600'} ltr`}>{v.score}</span>
                         <span className="text-gray-400 text-[10px] font-mono">{v.date}</span>
                    </div>
                </div>
            ))}
            {data.r.map(r => (
                <div key={r.id} className={`flex justify-between items-center text-xs md:text-sm p-3 rounded-xl transition-all ${
                  r.isApproved 
                    ? 'bg-emerald-50/80 border-r-4 border-emerald-500 text-gray-900 shadow-xs' 
                    : 'bg-amber-50/60 border-2 border-dashed border-amber-300 text-gray-900 shadow-xs'
                }`}>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {r.evidence && (
                        <img 
                          src={r.evidence} 
                          alt="Evidence" 
                          className="w-9 h-9 object-cover rounded-lg cursor-pointer border border-emerald-200 hover:scale-105 transition-transform shrink-0" 
                          onClick={() => setActiveImage(r.evidence || null)}
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-semibold truncate">{(t as any)[`type_${r.rewardType}`] || r.rewardType}</span>
                        {r.description && <span className="text-[10px] text-gray-500 truncate block font-medium">{r.description}</span>}
                        <span className="text-[10px] text-gray-500 font-medium">
                          {r.isApproved 
                            ? (settings.language === 'fa' ? '✓ تایید نهایی و درج در پرونده' : '✓ Approved & Logged') 
                            : (settings.language === 'fa' ? '⚠ ثبت اولیه - در انتظار تایید مدیریت' : '⚠ Preliminary - Pending Review')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                         <span className={`font-black font-mono text-sm ${r.isApproved ? 'text-emerald-600' : 'text-amber-650'} ltr`}>+{r.score}</span>
                         <span className="text-gray-400 text-[10px] font-mono">{r.date}</span>
                    </div>
                </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-0 md:p-4 animate-in fade-in zoom-in-95 duration-200" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
      <div className="bg-gray-50 w-full md:max-w-4xl h-full md:h-[85vh] md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-indigo-900 text-white p-4 md:p-6 flex justify-between items-start shrink-0">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20">
                    <UserIcon className="w-8 h-8 md:w-9 md:h-9" />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black">{basicInfo.employeeName}</h2>
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-indigo-200 text-xs md:text-sm mt-2 opacity-95">
                        <span className="bg-indigo-950/45 px-2 py-0.5 rounded border border-indigo-800/60 font-medium">
                          {t.personnelId}: {basicInfo.personnelId}
                        </span>
                        <span className="bg-indigo-950/45 px-2 py-0.5 rounded border border-indigo-800/60 font-medium">
                          {t.department}: {basicInfo.department}
                        </span>
                        {basicInfo.jobTitle && (
                          <span className="bg-indigo-950/45 px-2 py-0.5 rounded border border-indigo-800/60 flex items-center gap-1 font-medium">
                            <Briefcase className="w-3.5 h-3.5 text-indigo-300" />
                            {basicInfo.jobTitle}
                          </span>
                        )}
                        {basicInfo.nationalId && (
                          <span className="bg-indigo-950/45 px-2 py-0.5 rounded border border-indigo-800/60 flex items-center gap-1 font-medium font-mono">
                            {settings.language === 'fa' ? 'کد ملی:' : 'National ID:'} {basicInfo.nationalId}
                          </span>
                        )}
                        {basicInfo.hireDate && (
                          <span className="bg-indigo-950/45 px-2 py-0.5 rounded border border-indigo-800/60 flex items-center gap-1 font-medium font-mono">
                            <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                            {settings.language === 'fa' ? 'تاریخ شروع کار:' : 'Hire Date:'} {basicInfo.hireDate}
                          </span>
                        )}
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                <X className="w-6 h-6" />
            </button>
        </div>

        {/* Dashboard Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
            
            {incompleteFields.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl mb-6 flex items-start gap-3 text-xs md:text-sm shadow-xs animate-in fade-in slide-in-from-top-4 duration-300">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>{settings.language === 'fa' ? '⚠️ نقص اطلاعات پرونده پرسنلی' : '⚠️ Incomplete Personnel Profile'}</span>
                  </div>
                  <div className="opacity-95 leading-relaxed font-semibold">
                    {settings.language === 'fa' 
                      ? `این پرونده با اطلاعات ناقص در سیستم ثبت شده است. فیلدهای مفقود یا خالی: ${incompleteFields.join('، ')}`
                      : `This employee profile is recorded with missing values. Missing fields: ${incompleteFields.join(', ')}`}
                  </div>
                </div>
              </div>
            )}

            {/* Score Card */}
            <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-6 items-center justify-between">
                 <div className="flex flex-col items-center justify-center w-full md:w-auto">
                      <div className={`text-4xl md:text-5xl font-black ${totalScore < 50 ? 'text-red-600' : totalScore > 100 ? 'text-emerald-600' : 'text-blue-600'}`}>
                        {totalScore}
                      </div>
                      <span className="text-gray-400 text-xs uppercase tracking-widest mt-1">{t.totalScore}</span>
                 </div>
                 
                 <div className="h-px w-full md:w-px md:h-16 bg-gray-200"></div>

                 <div className="flex-1 w-full">
                     <div className={`flex items-center gap-3 p-3 rounded-xl ${status.bg} border border-transparent`}>
                        <div className={`p-2 bg-white rounded-lg shadow-sm ${status.color}`}>
                            {status.icon}
                        </div>
                        <div>
                            <div className={`font-bold ${status.color}`}>{t.riskStatus}: {status.text}</div>
                            <div className="text-xs text-gray-600 mt-0.5 opacity-80">
                                {totalScore < 50 ? "نیاز به اقدام فوری انضباطی" : "وضعیت نرمال"}
                                {(pendingViolationsCount > 0 || pendingRewardsCount > 0) && (
                                  <span className="block mt-1 text-amber-800 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200 text-[10px] animate-pulse">
                                    {settings.language === 'fa' 
                                      ? `⚠ تایید نشده: ${pendingViolationsCount + pendingRewardsCount} مورد ثبت اولیه در انتظار تایید`
                                      : `⚠ Unapproved: ${pendingViolationsCount + pendingRewardsCount} preliminary items pending review`}
                                  </span>
                                )}
                            </div>
                        </div>
                     </div>
                 </div>
            </div>

            {/* Department Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {uniqueDeptSources.map(dept => {
                    const data = byDept(dept);
                    return renderSection(
                        getDeptDisplayName(dept),
                        getDeptIcon(dept),
                        data,
                        getDeptColorClass(dept),
                        dept
                    );
                })}
            </div>

            {userViolations.length === 0 && userRewards.length === 0 && (
                <div className="text-center py-10 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>هیچ سابقه‌ای برای این پرسنل ثبت نشده است.</p>
                </div>
            )}
        </div>
      </div>
      
      {activeImage && (
        <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <button 
            onClick={() => setActiveImage(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2.5 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={activeImage} 
            alt="Evidence Full View" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
};

export default PersonnelProfileModal;