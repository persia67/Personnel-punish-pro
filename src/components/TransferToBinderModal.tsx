import React, { useState, useMemo } from 'react';
import { X, UserPlus, Search, Check, ShieldAlert, ArrowLeftRight, Users, CheckSquare, Square, Filter } from 'lucide-react';
import { Employee, AppSettings } from '../types';
import { getMasterDepartments } from '../services/departmentUtils';

interface TransferToBinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  binderKey: string;
  groupCriteria: 'DEPARTMENT' | 'SAFETY_STATUS' | 'JOB_TITLE';
  employees: Employee[];
  settings: AppSettings;
  onTransferPersonnel: (employeeIds: string[], targetBinderKey: string) => void;
}

export const TransferToBinderModal: React.FC<TransferToBinderModalProps> = ({
  isOpen,
  onClose,
  binderKey,
  groupCriteria,
  employees,
  settings,
  onTransferPersonnel
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [showOnlyOtherBinders, setShowOnlyOtherBinders] = useState(true);

  // Get master departments for filter dropdown
  const masterDepartments = useMemo(() => {
    return getMasterDepartments(settings.customDepartments);
  }, [settings.customDepartments]);

  // Filter employees
  const candidateEmployees = useMemo(() => {
    return employees.filter(emp => {
      // Check search query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        emp.fullName.toLowerCase().includes(query) ||
        emp.personnelId.toLowerCase().includes(query) ||
        (emp.department && emp.department.toLowerCase().includes(query)) ||
        (emp.jobTitle && emp.jobTitle.toLowerCase().includes(query));

      // Check dept filter
      const matchesDept = deptFilter === 'ALL' || emp.department === deptFilter;

      // Check binder status
      let isInCurrentBinder = false;
      if (groupCriteria === 'DEPARTMENT') {
        isInCurrentBinder = emp.department === binderKey;
      } else if (groupCriteria === 'JOB_TITLE') {
        isInCurrentBinder = emp.jobTitle === binderKey;
      }

      if (showOnlyOtherBinders && isInCurrentBinder) {
        return false;
      }

      return matchesSearch && matchesDept;
    });
  }, [employees, searchQuery, deptFilter, binderKey, groupCriteria, showOnlyOtherBinders]);

  if (!isOpen) return null;

  const isAllCandidateSelected = candidateEmployees.length > 0 && candidateEmployees.every(emp => selectedEmpIds.includes(emp.id));

  const handleToggleSelectAll = () => {
    if (isAllCandidateSelected) {
      const candidateIds = candidateEmployees.map(emp => emp.id);
      setSelectedEmpIds(prev => prev.filter(id => !candidateIds.includes(id)));
    } else {
      const candidateIds = candidateEmployees.map(emp => emp.id);
      setSelectedEmpIds(prev => Array.from(new Set([...prev, ...candidateIds])));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedEmpIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSingleTransfer = (empId: string) => {
    onTransferPersonnel([empId], binderKey);
    setSelectedEmpIds(prev => prev.filter(id => id !== empId));
  };

  const handleBatchTransfer = () => {
    if (selectedEmpIds.length === 0) return;
    onTransferPersonnel(selectedEmpIds, binderKey);
    setSelectedEmpIds([]);
    onClose();
  };

  const isFa = settings.language === 'fa';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir={isFa ? 'rtl' : 'ltr'}>
      <div className="bg-white rounded-3xl border border-gray-200 max-w-3xl w-full p-5 md:p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-black text-gray-900 flex items-center gap-2">
                <span>{isFa ? `افزودن و انتقال پرسنل به زونکن: ${binderKey}` : `Transfer Personnel to Binder: ${binderKey}`}</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isFa 
                  ? `پرسنل مورد نظر را انتخاب کنید تا واحد یا مشخصات آنها به «${binderKey}» تغییر یافته و منتقل شوند.` 
                  : `Select personnel to update their record and assign them into folder "${binderKey}".`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-3 mb-4 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className={`absolute ${isFa ? 'right-3' : 'left-3'} top-2.5 h-4 w-4 text-gray-400`} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isFa ? 'جستجوی نام، کد پرسنلی یا واحد...' : 'Search name, personnel ID or department...'}
                className={`w-full py-2 ${isFa ? 'pr-9 pl-3' : 'pl-9 pr-3'} text-xs md:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50`}
              />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="w-full py-2 px-3 text-xs md:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50/50 font-bold text-gray-700 cursor-pointer"
              >
                <option value="ALL">{isFa ? 'تصفیه بر اساس واحد فعلی (همه واحدها)' : 'All Current Departments'}</option>
                {masterDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-all cursor-pointer"
            >
              {isAllCandidateSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <span>{isFa ? 'لغو انتخاب همه' : 'Deselect All'}</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-gray-400" />
                  <span>{isFa ? `انتخاب همه موارد نمایش داده شده (${candidateEmployees.length} نفر)` : `Select All (${candidateEmployees.length})`}</span>
                </>
              )}
            </button>

            <label className="flex items-center gap-2 cursor-pointer text-gray-600 font-bold select-none">
              <input
                type="checkbox"
                checked={showOnlyOtherBinders}
                onChange={e => setShowOnlyOtherBinders(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <span>{isFa ? 'فقط پرسنل زونکن‌های دیگر نمایش داده شوند' : 'Hide personnel already in this binder'}</span>
            </label>
          </div>
        </div>

        {/* Candidate List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-[240px] max-h-[400px]">
          {candidateEmployees.length === 0 ? (
            <div className="text-center py-12 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-500">
                {isFa ? 'هیچ فردی با این فیلترها جهت انتقال پیدا نشد.' : 'No matching personnel found for transfer.'}
              </p>
            </div>
          ) : (
            candidateEmployees.map(emp => {
              const isSelected = selectedEmpIds.includes(emp.id);
              const isAlreadyInBinder = groupCriteria === 'DEPARTMENT' 
                ? emp.department === binderKey
                : emp.jobTitle === binderKey;

              return (
                <div
                  key={emp.id}
                  onClick={() => handleToggleSelectOne(emp.id)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent div onClick
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                      {emp.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-gray-900">{emp.fullName}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-600 font-mono px-1.5 py-0.5 rounded font-bold">
                          {emp.personnelId}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 font-medium">
                        <span>{isFa ? `واحد فعلی: ${emp.department || 'ثبت نشده'}` : `Dept: ${emp.department || 'N/A'}`}</span>
                        <span>•</span>
                        <span>{emp.jobTitle || (isFa ? 'پست ثبت نشده' : 'No Title')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAlreadyInBinder ? (
                      <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg font-bold">
                        {isFa ? 'در این زونکن قرار دارد' : 'Already in binder'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleTransfer(emp.id);
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-extrabold transition-all shadow-xs active:scale-95 flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>{isFa ? 'انتقال سریع' : 'Move Now'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-100 pt-4 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500 font-bold">
            {isFa 
              ? `تعداد افراد انتخاب شده: ${selectedEmpIds.length} نفر` 
              : `Selected: ${selectedEmpIds.length} personnel`}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {isFa ? 'انصراف' : 'Cancel'}
            </button>

            <button
              type="button"
              disabled={selectedEmpIds.length === 0}
              onClick={handleBatchTransfer}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                selectedEmpIds.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4 font-bold" />
              <span>
                {isFa 
                  ? `انتقال گروهی (${selectedEmpIds.length} نفر) به زونکن «${binderKey}»` 
                  : `Transfer Selected (${selectedEmpIds.length})`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
