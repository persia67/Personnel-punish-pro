import React, { useState, useEffect, useMemo } from 'react';
import { X, UserCheck, Edit } from 'lucide-react';
import { Employee, AppSettings } from '../types';
import { normalizeDepartmentName, getMasterDepartments, getAllDepartmentsList, ensureDepartmentExists } from '../services/departmentUtils';
import { DEPARTMENTS_LIST, JOB_TITLES_LIST } from './ManualEmployeeForm';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  employees: Employee[];
  settings: AppSettings;
  onUpdateEmployee: (updatedEmp: Employee) => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  employees,
  settings,
  onUpdateEmployee,
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
    phoneNumber: '',
  });

  const [customDept, setCustomDept] = useState('');
  const [isCustomDeptActive, setIsCustomDeptActive] = useState(false);
  const [customJobTitle, setCustomJobTitle] = useState('');
  const [isCustomJobTitleActive, setIsCustomJobTitleActive] = useState(false);

  useEffect(() => {
    if (employee) {
      const isPreset = availableDepartments.includes(employee.department);
      const isPresetJob = JOB_TITLES_LIST.includes(employee.jobTitle || '');
      setEmpFormData({
        personnelId: employee.personnelId || '',
        fullName: employee.fullName || '',
        nationalId: employee.nationalId || '',
        department: isPreset ? employee.department : (employee.department ? 'سایر (ورود دستی)' : ''),
        hireDate: employee.hireDate || '',
        jobTitle: isPresetJob ? (employee.jobTitle || '') : (employee.jobTitle ? 'سایر (ورود دستی)' : ''),
        phoneNumber: employee.phoneNumber || '',
      });
      if (!isPreset && employee.department) {
        setCustomDept(employee.department);
        setIsCustomDeptActive(true);
      } else {
        setCustomDept('');
        setIsCustomDeptActive(false);
      }
      if (!isPresetJob && employee.jobTitle) {
        setCustomJobTitle(employee.jobTitle);
        setIsCustomJobTitleActive(true);
      } else {
        setCustomJobTitle('');
        setIsCustomJobTitleActive(false);
      }
    }
  }, [employee, isOpen, availableDepartments]);

  if (!isOpen || !employee) return null;

  const handleDeptChange = (val: string) => {
    setEmpFormData(prev => ({ ...prev, department: val }));
    if (val === 'سایر (ورود دستی)') {
      setIsCustomDeptActive(true);
    } else {
      setIsCustomDeptActive(false);
      setCustomDept('');
    }
  };

  const handleJobTitleChange = (val: string) => {
    setEmpFormData(prev => ({ ...prev, jobTitle: val }));
    if (val === 'سایر (ورود دستی)') {
      setIsCustomJobTitleActive(true);
    } else {
      setIsCustomJobTitleActive(false);
      setCustomJobTitle('');
    }
  };

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

    // Check duplicate if personnel ID was changed
    if (trimmedPId !== employee.personnelId) {
      const exists = employees.some(emp => emp.personnelId === trimmedPId);
      if (exists) {
        alert(
          settings.language === 'fa'
            ? 'کد پرسنلی وارد شده از قبل به شخص دیگری تخصیص داده شده است!'
            : 'Personnel ID already exists and is assigned to another employee!'
        );
        return;
      }
    }

    let finalDept = empFormData.department === 'سایر (ورود دستی)'
      ? customDept.trim()
      : empFormData.department.trim();

    if (finalDept) {
      const { normalized } = normalizeDepartmentName(finalDept, getMasterDepartments(settings.customDepartments));
      finalDept = normalized;
      ensureDepartmentExists(finalDept, settings.customDepartments);
    }

    const finalJobTitle = empFormData.jobTitle === 'سایر (ورود دستی)'
      ? customJobTitle.trim()
      : empFormData.jobTitle.trim();

    const updatedEmp: Employee = {
      ...employee,
      personnelId: trimmedPId,
      fullName: empFormData.fullName.trim(),
      nationalId: empFormData.nationalId.trim() || undefined,
      department: finalDept || '',
      hireDate: empFormData.hireDate.trim() || undefined,
      jobTitle: finalJobTitle || undefined,
      phoneNumber: empFormData.phoneNumber.trim() || undefined,
    };

    onUpdateEmployee(updatedEmp);
    onClose();

    alert(
      settings.language === 'fa'
        ? 'اطلاعات پرسنل با موفقیت بروزرسانی شد.'
        : 'Personnel details updated successfully.'
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl border border-gray-200 max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <h3 className="text-sm md:text-base font-black text-gray-900 flex items-center gap-1.5">
            <Edit className="w-5 h-5 text-indigo-600" />
            <span>{settings.language === 'fa' ? 'ویرایش پرونده اطلاعات پرسنل' : 'Edit Personnel Profile'}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                {settings.language === 'fa' ? 'کد پرسنلی (اجباری)' : 'Personnel ID (Required)'}
              </label>
              <input
                type="text"
                value={empFormData.personnelId}
                onChange={e => setEmpFormData({ ...empFormData, personnelId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors"
                required
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                {settings.language === 'fa' ? 'نام و نام خانوادگی (اجباری)' : 'Full Name (Required)'}
              </label>
              <input
                type="text"
                value={empFormData.fullName}
                onChange={e => setEmpFormData({ ...empFormData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors"
                required
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                {settings.language === 'fa' ? 'کد ملی' : 'National ID'}
              </label>
              <input
                type="text"
                maxLength={10}
                value={empFormData.nationalId}
                onChange={e => setEmpFormData({ ...empFormData, nationalId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="flex flex-col">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                {settings.language === 'fa' ? 'بخش / واحد کاری' : 'Department'}
              </label>
              <select
                value={empFormData.department}
                onChange={e => handleDeptChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">{settings.language === 'fa' ? 'انتخاب واحد...' : 'Select Department...'}</option>
                {availableDepartments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {isCustomDeptActive && (
                <input
                  type="text"
                  required
                  placeholder={settings.language === 'fa' ? 'نام واحد کاری دستی...' : 'Custom Dept Name...'}
                  value={customDept}
                  onChange={e => setCustomDept(e.target.value)}
                  className="mt-1.5 w-full px-3 py-1.5 border border-red-200 bg-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              )}
            </div>

            <div className="flex flex-col">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                {settings.language === 'fa' ? 'سمت سازمانی' : 'Job Title'}
              </label>
              <select
                value={empFormData.jobTitle}
                onChange={e => handleJobTitleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="">{settings.language === 'fa' ? 'انتخاب سمت...' : 'Select Job Title...'}</option>
                {JOB_TITLES_LIST.map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
              {isCustomJobTitleActive && (
                <input
                  type="text"
                  required
                  placeholder={settings.language === 'fa' ? 'سمت سازمانی دستی...' : 'Custom Job Title...'}
                  value={customJobTitle}
                  onChange={e => setCustomJobTitle(e.target.value)}
                  className="mt-1.5 w-full px-3 py-1.5 border border-red-200 bg-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                {settings.language === 'fa' ? 'تاریخ شروع به کار' : 'Start Hire Date'}
              </label>
              <input
                type="text"
                value={empFormData.hireDate}
                onChange={e => setEmpFormData({ ...empFormData, hireDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-[11px] font-bold text-gray-500 mb-1">
                {settings.language === 'fa' ? 'شماره همراه جهت پیامک' : 'SMS Mobile for Notifications'}
              </label>
              <input
                type="text"
                value={empFormData.phoneNumber}
                onChange={e => setEmpFormData({ ...empFormData, phoneNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 bg-gray-50 hover:bg-white focus:bg-white rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-colors"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-500 bg-white hover:bg-gray-50 rounded-xl text-xs font-bold transition-all active:scale-95"
            >
              {settings.language === 'fa' ? 'انصراف' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 leading-none"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{settings.language === 'fa' ? 'ذخیره تغییرات' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
