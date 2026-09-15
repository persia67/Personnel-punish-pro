import React, { useState, useEffect } from 'react';
import { Violation, Severity, User, Department, Employee, CodeItem } from '../types';
import { X, Camera, AlertOctagon, CheckSquare, Square, UserCheck, Search, Filter, Calendar } from 'lucide-react';
import { TRANSLATIONS } from '../constants';
import { DEPARTMENTS_LIST } from './ManualEmployeeForm';
import { getAllDepartmentsList } from '../services/departmentUtils';
import { useSessionStorage, clearSessionStorageKeys } from '../hooks/useSessionStorage';

interface ViolationFormProps {
  existingViolations: Violation[];
  employees: Employee[];
  onClose: () => void;
  onSubmit: (violation: Violation) => void;
  currentUser: User;
  codes: CodeItem[];
}

const getTodayJalali = () => {
  try {
    return new Date().toLocaleDateString('fa-IR');
  } catch {
    return '1403/01/01';
  }
};

const ViolationForm: React.FC<ViolationFormProps> = ({ existingViolations, employees, onClose, onSubmit, currentUser, codes }) => {
  const lang = document.documentElement.dir === 'rtl' ? 'fa' : 'en';
  const t = TRANSLATIONS[lang];

  // Check if user is Global Admin
  const isGlobalUser = ['DEVELOPER', 'PLANT_MANAGER', 'HR_MANAGER'].includes(currentUser.role);

  // Determine initial Source Dept
  const getInitialDept = (): string => {
      if (currentUser.role === 'SECURITY_MANAGER' || currentUser.role === 'SECURITY_GUARD') return 'SECURITY';
      if (currentUser.role === 'TRAINING_MANAGER') return 'TRAINING';
      if (currentUser.role === 'ADMIN_STAFF') return 'ADMIN';
      if (currentUser.role === 'DEPARTMENT_MANAGER' && currentUser.managedDepartment) return currentUser.managedDepartment;
      return 'HSE'; // Default for global users
  };

  const [sourceDept, setSourceDept] = useSessionStorage<string>('violation_sourceDept', getInitialDept());

  // Filter available codes based on the selected Department with fallback
  const availableCodes = React.useMemo(() => {
    const filtered = codes.filter(c => c.department === sourceDept);
    return filtered.length > 0 ? filtered : codes;
  }, [codes, sourceDept]);

  // Get unique departments from codes for the dropdown (plus standard ones)
  const availableDepartments = Array.from(new Set([
      'HSE', 'SECURITY', 'TRAINING', 'ADMIN', 
      ...codes.map(c => c.department)
  ]));

  const [formData, setFormData] = useSessionStorage<Partial<Violation>>('violation_formData', {
    severity: Severity.MEDIUM,
    status: 'Pending',
    date: getTodayJalali(),
    penaltyActions: [],
    violationStage: 1,
    isApproved: false, 
    reporterName: currentUser.fullName,
    departmentSource: sourceDept
  });

  const [selectedCode, setSelectedCode] = useSessionStorage<number | null>('violation_selectedCode', null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, evidence: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Smart Search States
  const [empSearchTerm, setEmpSearchTerm] = useSessionStorage<string>('violation_empSearchTerm', '');
  const [showEmpResults, setShowEmpResults] = useState(false);
  const [customDeptText, setCustomDeptText] = useSessionStorage<string>('violation_customDeptText', '');
  const [isManualDept, setIsManualDept] = useSessionStorage<boolean>('violation_isManualDept', false);

  const matchedEmployees = React.useMemo(() => {
    if (!empSearchTerm.trim()) return [];
    const term = empSearchTerm.toLowerCase().trim();
    return employees.filter(emp => 
      emp.fullName.toLowerCase().includes(term) ||
      emp.personnelId.toLowerCase().includes(term) ||
      emp.department.toLowerCase().includes(term)
    );
  }, [empSearchTerm, employees]);

  const handleSelectEmployee = (emp: Employee) => {
    const isStandard = DEPARTMENTS_LIST.includes(emp.department);
    setFormData(prev => ({
      ...prev,
      personnelId: emp.personnelId,
      employeeName: emp.fullName,
      department: emp.department
    }));
    setEmpSearchTerm(`${emp.fullName} (${emp.personnelId})`);
    setShowEmpResults(false);
    setIsManualDept(!isStandard);
    if (!isStandard) {
      setCustomDeptText(emp.department);
    }
  };

  // Update formData when sourceDept changes
  useEffect(() => {
      setFormData(prev => ({ ...prev, departmentSource: sourceDept }));
      setSelectedCode(null); // Reset selection when switching dept
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceDept]);

  // Auto-calculate stage
  useEffect(() => {
    if (formData.personnelId && formData.personnelId.length >= 1) {
      const historyCount = existingViolations.filter(v => v.personnelId === formData.personnelId && v.isApproved).length;
      const newStage = Math.min(historyCount + 1, 3);
      setFormData(prev => ({ ...prev, violationStage: newStage }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.personnelId, existingViolations]);

  const handleCodeSelect = (codeId: number) => {
      setSelectedCode(codeId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDepartment = formData.department === 'سایر (ورود دستی)' 
      ? customDeptText.trim() 
      : (formData.department || '').trim();

    if (!formData.employeeName || !formData.personnelId || !finalDepartment || !selectedCode) {
        alert(t.requiredFields);
        return;
    }

    const codeObj = codes.find(c => Number(c.code) === Number(selectedCode) || String(c.code).trim() === String(selectedCode).trim());
    if (!codeObj) return;

    const isAutoApproved = currentUser.role === 'TRAINING_MANAGER' || formData.isApproved === true;

    const newViolation: Violation = {
      id: `V-${Math.floor(Math.random() * 10000)}`,
      employeeName: formData.employeeName!.trim(),
      personnelId: formData.personnelId!.trim(),
      department: finalDepartment,
      departmentSource: sourceDept,
      reporterName: formData.reporterName!, 
      date: formData.date || '1402/01/01',
      violationType: codeObj.label,
      violationCode: codeObj.code,
      score: codeObj.score,
      description: formData.description || '',
      severity: formData.severity as Severity,
      penaltyActions: formData.penaltyActions || [],
      violationStage: formData.violationStage || 1,
      evidence: formData.evidence,
      status: 'Pending',
      isApproved: isAutoApproved 
    };

    onSubmit(newViolation);
    clearSessionStorageKeys([
      'violation_sourceDept',
      'violation_formData',
      'violation_selectedCode',
      'violation_empSearchTerm',
      'violation_customDeptText',
      'violation_isManualDept'
    ]);
    setIsSuccess(true);
  };

  const handlePenaltyChange = (option: string) => {
    const current = formData.penaltyActions || [];
    if (current.includes(option)) {
      setFormData({ ...formData, penaltyActions: current.filter(p => p !== option) });
    } else {
      setFormData({ ...formData, penaltyActions: [...current, option] });
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-white md:bg-black/50 md:backdrop-blur-sm flex items-center justify-center z-50 md:p-4">
        <div className="bg-white md:rounded-2xl shadow-none md:shadow-2xl w-full md:max-w-md p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4 animate-bounce">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
            {lang === 'fa' ? 'ثبت اولیه با موفقیت انجام شد' : 'Preliminary Logged'}
          </h3>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            {lang === 'fa' 
              ? 'گزارش تخلف ثبت اولیه گردید و برای بررسی و تایید در پرونده، به میز کار مسئول مربوطه ارسال شد.' 
              : 'The violation report was logged as preliminary and routed to the corresponding manager\'s workspace for final approval and insertion to file.'}
          </p>
          <button 
            type="button" 
            onClick={onClose} 
            className="w-full py-3 px-4 text-white font-semibold rounded-xl bg-red-600 hover:bg-red-700 shadow-md transition-all"
          >
            {lang === 'fa' ? 'متوجه شدم' : 'Got it'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white md:bg-black/50 md:backdrop-blur-sm flex items-center justify-center z-50 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white md:rounded-2xl shadow-none md:shadow-2xl w-full md:max-w-3xl flex flex-col h-full md:h-auto md:max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 shrink-0 bg-red-50 md:bg-white md:rounded-t-2xl">
          <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800">{t.newViolation}</h2>
              {isGlobalUser ? (
                  <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">واحد گزارش دهنده:</span>
                      <select 
                        value={sourceDept} 
                        onChange={(e) => setSourceDept(e.target.value)}
                        className="text-xs font-bold text-red-600 bg-transparent border-b border-red-200 focus:outline-none cursor-pointer"
                      >
                          {availableDepartments.map(dept => (
                              <option key={dept} value={dept}>{(t as any)[`dept_${dept}`] || dept}</option>
                          ))}
                      </select>
                  </div>
              ) : (
                <p className="text-xs text-red-600 mt-1 font-bold">واحد: {sourceDept === 'HSE' ? (t as any)[`dept_${sourceDept}`] : sourceDept}</p>
              )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 active:scale-95">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
          
          {/* Warning Badge */}
          {formData.violationStage && formData.violationStage > 1 && (
            <div className={`p-3 md:p-4 rounded-xl flex items-start gap-3 ${formData.violationStage === 3 ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-orange-50 text-orange-800 border border-orange-200'}`}>
              <AlertOctagon className="w-5 h-5 md:w-6 md:h-6 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">{t.warningStage} {formData.violationStage}</h4>
                <p className="text-xs mt-1">{t.historyAlert}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 border border-red-100 bg-red-50/20 p-4 rounded-2xl">
            {/* Smart Search Field */}
            <div className="md:col-span-2 relative">
              <label className="block text-xs md:text-sm font-bold text-gray-750 mb-1.5 flex items-center gap-1">
                <Search className="w-4 h-4 text-red-500" />
                {lang === 'fa' ? 'جستجوی هوشمند پرسنل (بر اساس نام، کد پرسنلی یا واحد)' : 'Smart Search Personnel (Name, ID, or Dept)'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={lang === 'fa' ? '🔍 نام، کد پرسنلی یا واحد فرد را بنویسید... (مثال: علی عباسی یا ۱۰0۳)' : 'Search by Name, Personnel ID, or Department...'}
                  value={empSearchTerm}
                  onChange={e => {
                    setEmpSearchTerm(e.target.value);
                    setShowEmpResults(true);
                  }}
                  onFocus={() => setShowEmpResults(true)}
                  className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-white"
                />
              </div>
              
              {showEmpResults && empSearchTerm.trim() && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {matchedEmployees.length === 0 ? (
                    <div className="p-3 text-xs text-gray-500 text-center">
                      {lang === 'fa' ? 'نتیجه‌ای یافت نشد. می‌توانید اطلاعات زیر را مستقیماً وارد کنید.' : 'No matches. You can type info directly below.'}
                    </div>
                  ) : (
                    matchedEmployees.map(emp => (
                      <button
                        type="button"
                        key={emp.id}
                        onClick={() => handleSelectEmployee(emp)}
                        className="w-full text-right px-4 py-2.5 hover:bg-red-50/50 transition-colors flex items-center justify-between text-xs md:text-sm"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-gray-900">{emp.fullName}</span>
                          <span className="text-[11px] text-gray-500 font-mono">
                            {lang === 'fa' ? 'کد پرسنلی:' : 'ID:'} {emp.personnelId}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold text-slate-700">
                          {emp.department}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.personnelId} *</label>
              <input
                required
                type="text"
                value={formData.personnelId || ''}
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-white font-mono"
                onChange={e => {
                  const val = e.target.value;
                  setFormData(prev => ({ ...prev, personnelId: val }));
                  const foundEmployee = employees.find(emp => emp.personnelId === val);
                  if (foundEmployee) {
                    const isStandard = DEPARTMENTS_LIST.includes(foundEmployee.department);
                    setFormData(prev => ({
                      ...prev,
                      employeeName: foundEmployee.fullName,
                      department: isStandard ? foundEmployee.department : 'سایر (ورود دستی)'
                    }));
                    if (!isStandard) {
                      setCustomDeptText(foundEmployee.department);
                    }
                  }
                }}
              />
            </div>
            
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.fullName} *</label>
              <input
                required
                type="text"
                value={formData.employeeName || ''}
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-white"
                onChange={e => setFormData({...formData, employeeName: e.target.value})}
              />
            </div>
            
            <div className="flex flex-col">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.department} *</label>
              <select
                required
                value={formData.department || ''}
                onChange={e => {
                  setFormData({...formData, department: e.target.value});
                }}
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-white"
              >
                <option value="">{lang === 'fa' ? 'انتخاب واحد کاری...' : 'Select Department...'}</option>
                {getAllDepartmentsList().map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {formData.department === 'سایر (ورود دستی)' && (
                <input
                  type="text"
                  required
                  placeholder={lang === 'fa' ? 'نام واحد کاری دستی را بنویسید...' : 'Write custom department name...'}
                  value={customDeptText}
                  onChange={e => setCustomDeptText(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 text-base md:text-sm border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                />
              )}
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1.5">{t.severity}</label>
              <select 
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                onChange={e => setFormData({...formData, severity: e.target.value as Severity})}
                defaultValue={Severity.MEDIUM}
              >
                <option value={Severity.LOW}>{t.severity_Low}</option>
                <option value={Severity.MEDIUM}>{t.severity_Medium}</option>
                <option value={Severity.HIGH}>{t.severity_High}</option>
                <option value={Severity.CRITICAL}>{t.severity_Critical}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-red-500" />
                  {lang === 'fa' ? 'تاریخ ثبت (جلالی / شمسی) *' : 'Jalali Date *'}
                </span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, date: getTodayJalali() }))}
                  className="text-[10px] text-red-600 hover:underline font-bold"
                >
                  {lang === 'fa' ? 'تاریخ امروز' : 'Today'}
                </button>
              </label>
              <input
                required
                type="text"
                placeholder={lang === 'fa' ? 'مثال: ۱۴۰۳/۰۵/۱۱' : 'e.g. 1403/05/11'}
                value={formData.date || ''}
                className="w-full px-3 py-2.5 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all bg-white font-mono"
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                 <label className="block text-xs md:text-sm font-medium text-gray-700">{t.violationType} *</label>
                 <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                     نمایش کدهای واحد: {(t as any)[`dept_${sourceDept}`] || sourceDept}
                 </span>
            </div>
            <div className="grid grid-cols-1 gap-2 mb-3 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50">
              {availableCodes.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">هیچ کدی برای واحد {sourceDept} تعریف نشده است.</p>
              ) : availableCodes.map((codeItem) => (
                <div 
                  key={codeItem.id} 
                  onClick={() => handleCodeSelect(codeItem.code)}
                  className={`flex items-start p-2 md:p-3 rounded-lg border cursor-pointer transition-all select-none active:scale-[0.99] ${selectedCode === codeItem.code ? 'bg-red-50 border-red-300 text-red-900 ring-1 ring-red-300' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                >
                   {selectedCode === codeItem.code ? 
                      <CheckSquare className="w-4 h-4 md:w-5 md:h-5 text-red-600 ml-2 shrink-0 mt-0.5" /> : 
                      <Square className="w-4 h-4 md:w-5 md:h-5 text-gray-300 ml-2 shrink-0 mt-0.5" />
                   }
                   <div className="flex-1">
                       <div className="flex justify-between items-center mb-1">
                           <span className="text-xs md:text-sm font-bold">{codeItem.label}</span>
                           <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-700 font-mono">#{codeItem.code}</span>
                       </div>
                       <div className="text-[10px] text-red-500 font-bold">امتیاز منفی: {codeItem.score}</div>
                   </div>
                </div>
              ))}
            </div>
          </div>

          <div>
             <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">{t.penaltyActions}</label>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-2">
               {t.penaltyList.map((option) => (
                 <label key={option} className={`flex items-center p-2 md:p-3 rounded-lg border cursor-pointer transition-all active:scale-95 ${formData.penaltyActions?.includes(option) ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                   <input
                     type="checkbox"
                     checked={formData.penaltyActions?.includes(option)}
                     onChange={() => handlePenaltyChange(option)}
                     className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 ml-2"
                   />
                   <span className="text-xs md:text-sm select-none">{option}</span>
                 </label>
               ))}
             </div>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">{t.description}</label>
            <textarea
              className="w-full px-3 py-2 text-base md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all h-20 md:h-24 resize-none"
              placeholder="..."
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
              {lang === 'fa' ? 'ضمیمه عکس / مستندات تصویری' : 'Attach Photo / Documentation'}
            </label>
            <div className="flex flex-col gap-3 bg-gray-50 p-4 border border-dashed border-gray-300 rounded-2xl">
              <div className="flex flex-wrap gap-2">
                <label className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold py-2 px-3 rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5 text-xs">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>{lang === 'fa' ? 'انتخاب فایل یا عکاسی' : 'Upload / Capture'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
                
                <label className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold py-2 px-3 rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5 text-xs">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'fa' ? 'عکاسی مستقیم با دوربین' : 'Direct Camera Capture'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {formData.evidence ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-gray-200 bg-white group shadow-sm">
                  <img 
                    src={formData.evidence} 
                    alt="Evidence Preview" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, evidence: undefined }))}
                    className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs"
                  >
                    {lang === 'fa' ? 'حذف عکس' : 'Remove'}
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 font-semibold">
                  {lang === 'fa' 
                    ? 'فرمت‌های مجاز: JPG، PNG. عکس گرفته شده به صورت خودکار فشرده و ضمیمه می‌گردد.' 
                    : 'Supported formats: JPG, PNG. Captured photo will be attached as evidence.'}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 md:pt-4 border-t border-gray-100 mt-auto shrink-0 pb-safe">
            <button type="button" onClick={onClose} className="px-4 py-2.5 md:px-6 md:py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-100 font-medium transition-colors">
              {t.cancel}
            </button>
            <button type="submit" className="px-4 py-2.5 md:px-6 md:py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-lg shadow-red-200 transition-all active:scale-95">
              {t.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ViolationForm;