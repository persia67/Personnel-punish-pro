import React, { useState, useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import { Employee, AppSettings } from '../types';
import { DEFAULT_DEPARTMENTS_LIST, getMasterDepartments, normalizeDepartmentName, getAllDepartmentsList } from '../services/departmentUtils';

export const DEPARTMENTS_LIST = [
  ...DEFAULT_DEPARTMENTS_LIST,
  'سایر (ورود دستی)'
];

export const JOB_TITLES_LIST = [
  'مدیر عامل',
  'مدیر کارخانه',
  'معاونت تولید و بهره برداری',
  'مدیر واحد',
  'مسئول واحد',
  'سرپرست',
  'کارشناس واحد',
  'افسر ایمنی',
  'مسئول واحد انتظامات',
  'نگهبان یا نیروی انتظامات',
  'مسئول واحد آموزش',
  'کارگر',
  'سایر (ورود دستی)'
];

interface ManualEmployeeFormProps {
  settings: AppSettings;
  employees: Employee[];
  onAddEmployee: (newEmp: Employee) => void;
}

export const ManualEmployeeForm: React.FC<ManualEmployeeFormProps> = ({
  settings,
  employees,
  onAddEmployee
}) => {
  const availableDepartments = useMemo(() => {
    return getAllDepartmentsList(settings?.customDepartments);
  }, [settings?.customDepartments]);

  const [empFormData, setEmpFormData] = useState({

    personnelId: '',
    fullName: '',
    nationalId: '',
    department: '',
    hireDate: '',
    jobTitle: '',
    phoneNumber: ''
  });

  const [customDept, setCustomDept] = useState('');
  const [customJobTitle, setCustomJobTitle] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empFormData.personnelId || !empFormData.fullName) {
      alert(
        settings.language === 'fa'
          ? 'لطفا کد پرسنلی و نام پرسنل را وارد کنید.'
          : 'Please enter Personnel ID and Name.'
      );
      return;
    }

    const trimmedPId = empFormData.personnelId.trim();
    // Check duplicate
    const exists = employees.some(emp => emp.personnelId === trimmedPId);
    if (exists) {
      alert(
        settings.language === 'fa'
          ? 'کد پرسنلی وارد شده از قبل وجود دارد!'
          : 'Personnel ID already exists!'
      );
      return;
    }

    let finalDept = empFormData.department === 'سایر (ورود دستی)' 
      ? customDept.trim() 
      : empFormData.department.trim();

    if (finalDept) {
      const { normalized } = normalizeDepartmentName(finalDept, getMasterDepartments(settings.customDepartments));
      finalDept = normalized;
    }

    const finalJobTitle = empFormData.jobTitle === 'سایر (ورود دستی)'
      ? customJobTitle.trim()
      : empFormData.jobTitle.trim();

    const newEmp: Employee = {
      id: Date.now().toString() + Math.random().toString().slice(2, 6),
      personnelId: trimmedPId,
      fullName: empFormData.fullName.trim(),
      nationalId: empFormData.nationalId.trim() || undefined,
      department: finalDept || '',
      hireDate: empFormData.hireDate.trim() || undefined,
      jobTitle: finalJobTitle || undefined,
      phoneNumber: empFormData.phoneNumber.trim() || undefined
    };

    onAddEmployee(newEmp);

    // Reset form
    setEmpFormData({
      personnelId: '',
      fullName: '',
      nationalId: '',
      department: '',
      hireDate: '',
      jobTitle: '',
      phoneNumber: ''
    });
    setCustomDept('');
    setCustomJobTitle('');

    const isProfileIncomplete = 
      !newEmp.department || newEmp.department.trim() === '' || 
      !newEmp.nationalId || newEmp.nationalId.trim() === '' || 
      !newEmp.phoneNumber || newEmp.phoneNumber.trim() === '' || 
      !newEmp.jobTitle || newEmp.jobTitle.trim() === '' || 
      !newEmp.hireDate || newEmp.hireDate.trim() === '';

    let successMsg = settings.language === 'fa'
      ? 'پرسنل جدید با موفقیت ثبت شد.'
      : 'Personnel successfully logged.';

    if (isProfileIncomplete) {
      successMsg += settings.language === 'fa'
        ? '\n\n⚠️ توجه: این پرونده به صورت ناقص تشکیل شد! برخی اطلاعات (مانند واحد، شماره همراه، سمت، کد ملی یا تاریخ استخدام) مفقود یا خالی است و نیاز به تکمیل دارد.'
        : '\n\n⚠️ Warning: This profile was logged with incomplete details! Some fields (like department, phone number, job title, national ID, or hire date) are missing and need to be completed.';
    }

    alert(successMsg);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-gray-150 rounded-xl p-4 bg-slate-50/50 space-y-3.5">
      <span className="block text-xs font-black text-gray-700 flex items-center gap-1">
        <UserPlus className="w-4 h-4 text-indigo-500" />
        {settings.language === 'fa' ? 'ثبت و تعریف دستی پرسنل جدید' : 'Manually Enroll New Personnel'}
      </span>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'کد پرسنلی (اجباری)' : 'Personnel ID (Required)'}
          </label>
          <input
            type="text"
            placeholder="e.g. 1003"
            value={empFormData.personnelId}
            onChange={e => setEmpFormData({ ...empFormData, personnelId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'نام و نام خانوادگی (اجباری)' : 'Full Name (Required)'}
          </label>
          <input
            type="text"
            placeholder="e.g. علی عباسی"
            value={empFormData.fullName}
            onChange={e => setEmpFormData({ ...empFormData, fullName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            required
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'کد ملی' : 'National ID'}
          </label>
          <input
            type="text"
            maxLength={10}
            placeholder="e.g. 0012345678"
            value={empFormData.nationalId}
            onChange={e => setEmpFormData({ ...empFormData, nationalId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col">
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'بخش / واحد (اختیاری)' : 'Department (Optional)'}
          </label>
          <select
            value={empFormData.department}
            onChange={e => setEmpFormData({ ...empFormData, department: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">{settings.language === 'fa' ? 'انتخاب واحد کاری...' : 'Select Department...'}</option>
            {availableDepartments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          {empFormData.department === 'سایر (ورود دستی)' && (
            <input
              type="text"
              required
              placeholder={settings.language === 'fa' ? 'نام واحد کاری دستی...' : 'Custom Dept...'}
              value={customDept}
              onChange={e => setCustomDept(e.target.value)}
              className="mt-1.5 w-full px-3 py-1.5 border border-red-200 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          )}
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'سمت سازمانی (اختیاری)' : 'Job Title (Optional)'}
          </label>
          <select
            value={empFormData.jobTitle}
            onChange={e => setEmpFormData({ ...empFormData, jobTitle: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="">{settings.language === 'fa' ? 'انتخاب سمت سازمانی...' : 'Select Job Title...'}</option>
            {JOB_TITLES_LIST.map(title => (
              <option key={title} value={title}>{title}</option>
            ))}
          </select>
          {empFormData.jobTitle === 'سایر (ورود دستی)' && (
            <input
              type="text"
              required
              placeholder={settings.language === 'fa' ? 'سمت سازمانی دستی...' : 'Custom Job Title...'}
              value={customJobTitle}
              onChange={e => setCustomJobTitle(e.target.value)}
              className="mt-1.5 w-full px-3 py-1.5 border border-red-200 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          )}
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'تاریخ شروع به کار (اختیاری)' : 'Start Hire Date (Optional)'}
          </label>
          <input
            type="text"
            placeholder="e.g. 1402/06/20"
            value={empFormData.hireDate}
            onChange={e => setEmpFormData({ ...empFormData, hireDate: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            {settings.language === 'fa' ? 'شماره همراه جهت پیامک (اختیاری)' : 'SMS Mobile for Notifications (Optional)'}
          </label>
          <input
            type="text"
            placeholder="e.g. 09123456789"
            value={empFormData.phoneNumber}
            onChange={e => setEmpFormData({ ...empFormData, phoneNumber: e.target.value })}
            className="w-full px-3 py-2 border border-gray-250 bg-white rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95 font-sans leading-none"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{settings.language === 'fa' ? 'تعریف پرسنل جدید' : 'Enroll Personnel'}</span>
        </button>
      </div>
    </form>
  );
};
