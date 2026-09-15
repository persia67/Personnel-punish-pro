import React, { useState, useMemo, useEffect } from 'react';
import { X, Printer, Download, Calendar, Award, AlertTriangle, FileText, CheckCircle, TrendingUp, TrendingDown, Building, Layers } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { AppSettings, Violation, Reward, Employee } from '../types';
import { TRANSLATIONS } from '../constants';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  violations: Violation[];
  rewards: Reward[];
  employees: Employee[];
}

const LOCAL_TX = {
  fa: {
    title: "صدور گزارش چاپی و PDF واحدها",
    selectDept: "انتخاب واحد سازمانی پرسنل",
    selectSource: "انتخاب واحد صادرکننده (حوزه ثبت)",
    filterType: "نوع فیلتر دپارتمان",
    byEmployeeDept: "بر اساس دپارتمان پرسنل (تولید، انبار، فنی و...)",
    bySourceDept: "بر اساس واحد گزارش‌دهنده (HSE، حراست، آموزش و...)",
    startDate: "تاریخ شروع",
    endDate: "تاریخ پایان",
    downloadPdf: "دانلود فایل PDF گزارش",
    printReport: "چاپ سند (System Print)",
    previewTitle: "پیش‌نمایش سند رسمی چاپی",
    noRecords: "هیچ رکوردی برای این دپارتمان در محدوده تاریخی مشخص شده یافت نشد.",
    approvedViolations: "الف) عدم انطباق‌ها و تخلفات آیین‌نامه‌ای تایید شده",
    approvedRewards: "ب) تشویقات و نقاط قوت عملکردی تایید شده پرسنل",
    summaryMetrics: "خلاصه شاخص‌های عملکرد دپارتمان",
    netScore: "خالص امتیاز عملکرد واحد",
    classification: "سطح انطباق واحد",
    hseManager: "مسئول ایمنی و بهداشت (HSE)",
    committeeRepresentative: "نماینده کمیته انضباطی سازمان",
    plantManager: "مدیریت ارشد مجتمع / کارخانه",
    signatureAndStamp: "مهر و امضا",
    empName: "نام و نام خانوادگی",
    personnelId: "شماره پرسنلی",
    date: "تاریخ",
    codeLabel: "شرح بند انضباطی / تشویقی",
    severity: "درجه",
    score: "امتیاز",
    period: "دوره گزارش",
    allPeriods: "کل دوره زمانی ثبت شده",
    reportId: "شماره گزارش",
    docTitle: "گزارش رسمی پایش عملکرد و انطباق آیین‌نامه انضباطی",
    totalViolations: "تعداد کل اخطارها",
    totalRewards: "تعداد کل تشویق‌ها",
    classA: "رعایت فوق‌العاده و نمونه (کلاس A)",
    classB: "انطباق مطلوب و استاندارد (کلاس B)",
    classC: "نیازمند بهبود و پایش مستمر (کلاس C)",
    classD: "وضعیت بحرانی و پرخطر (کلاس D)"
  },
  en: {
    title: "Generate Official PDF Report",
    selectDept: "Select Personnel Working Dept",
    selectSource: "Select Reporting Unit (Source)",
    filterType: "Department Filter Type",
    byEmployeeDept: "By Employee Working Dept (Production, Facilities...)",
    bySourceDept: "By Reporting Unit (HSE, Security, Training...)",
    startDate: "Start Date",
    endDate: "End Date",
    downloadPdf: "Download PDF Report",
    printReport: "Print Document (System Print)",
    previewTitle: "Official Print Document Preview",
    noRecords: "No approved records found for this department in the selected date range.",
    approvedViolations: "A) Approved Non-Compliances & Warnings",
    approvedRewards: "B) Approved Positive Points & Safe Behaviors",
    summaryMetrics: "Department Performance Summary Indicators",
    netScore: "Net Department Score",
    classification: "HSE Compliance Class",
    hseManager: "HSE & Health Coordinator",
    committeeRepresentative: "Disciplinary Committee",
    plantManager: "Plant / General Manager",
    signatureAndStamp: "Signature & Seal",
    empName: "Employee Name",
    personnelId: "Personnel ID",
    date: "Date",
    codeLabel: "Code & Violation/Reward Clause",
    severity: "Severity",
    score: "Score",
    period: "Report Period",
    allPeriods: "All Time",
    reportId: "Report ID",
    docTitle: "Official Performance & Compliance Evaluation Report",
    totalViolations: "Total Non-Compliances",
    totalRewards: "Total Rewards Given",
    classA: "Excellent Compliance (Class A)",
    classB: "Satisfactory Compliance (Class B)",
    classC: "Needs Improvement (Class C)",
    classD: "Critical Non-Compliance (Class D)"
  }
};

const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  settings,
  violations,
  rewards,
  employees
}) => {
  const isFa = settings.language === 'fa';
  const t = TRANSLATIONS[settings.language];
  const tx = LOCAL_TX[settings.language];

  // States
  const [filterType, setFilterType] = useState<'EMPLOYEE_DEPT' | 'SOURCE_DEPT'>('EMPLOYEE_DEPT');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  // Dynamic lists of unique departments
  const employeeDepts = useMemo(() => {
    const list = Array.from(new Set([
      ...employees.map(e => e.department),
      ...violations.map(v => v.department),
      ...rewards.map(r => r.department)
    ].filter(Boolean))).sort();
    return list;
  }, [employees, violations, rewards]);

  const sourceDepts = useMemo(() => {
    const list = Array.from(new Set([
      ...violations.map(v => v.departmentSource),
      ...rewards.map(r => r.departmentSource)
    ].filter(Boolean))).sort();
    return list;
  }, [violations, rewards]);

  // Set initial selected department
  useEffect(() => {
    const defaultList = filterType === 'EMPLOYEE_DEPT' ? employeeDepts : sourceDepts;
    if (defaultList.length > 0 && !defaultList.includes(selectedDept)) {
      setSelectedDept(defaultList[0]);
    }
  }, [filterType, employeeDepts, sourceDepts, selectedDept]);

  // Filter approved violations & rewards
  const filteredData = useMemo(() => {
    const approvedV = violations.filter(v => v.isApproved);
    const approvedR = rewards.filter(r => r.isApproved);

    const matchesDept = (item: Violation | Reward) => {
      if (!selectedDept) return true;
      if (filterType === 'EMPLOYEE_DEPT') {
        return item.department === selectedDept;
      } else {
        return item.departmentSource === selectedDept;
      }
    };

    const matchesDate = (item: Violation | Reward) => {
      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;
      return true;
    };

    return {
      violations: approvedV.filter(v => matchesDept(v) && matchesDate(v)),
      rewards: approvedR.filter(r => matchesDept(r) && matchesDate(r))
    };
  }, [violations, rewards, filterType, selectedDept, startDate, endDate]);

  // Statistics
  const stats = useMemo(() => {
    const vCount = filteredData.violations.length;
    const rCount = filteredData.rewards.length;
    
    // Sum scores
    const vScore = filteredData.violations.reduce((sum, v) => sum + (v.score || 0), 0);
    const rScore = filteredData.rewards.reduce((sum, r) => sum + (r.score || 0), 0);
    const netScore = vScore + rScore;

    let classification = tx.classB;
    let classColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
    
    if (netScore >= 0) {
      classification = tx.classA;
      classColor = 'text-green-600 bg-green-50 border-green-200';
    } else if (netScore >= -15) {
      classification = tx.classB;
      classColor = 'text-blue-600 bg-blue-50 border-blue-200';
    } else if (netScore >= -40) {
      classification = tx.classC;
      classColor = 'text-amber-600 bg-amber-50 border-amber-200';
    } else {
      classification = tx.classD;
      classColor = 'text-red-600 bg-red-50 border-red-200';
    }

    return {
      vCount,
      rCount,
      vScore,
      rScore,
      netScore,
      classification,
      classColor
    };
  }, [filteredData, tx]);

  // Report Date metadata
  const reportMetadata = useMemo(() => {
    const today = new Date();
    const formattedSystemDate = isFa
      ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long' }).format(today)
      : today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const reportId = `SW-REP-2026-${randomNum}`;

    return {
      todayDate: formattedSystemDate,
      reportId
    };
  }, [isFa]);

  // Native Print Trigger
  const handlePrint = () => {
    window.print();
  };

  // PDF Generation using html2pdf.js
  const handleDownloadPdf = () => {
    const element = document.getElementById('report-print-content');
    if (!element) return;

    setIsDownloading(true);
    
    const opt = {
      margin:       [10, 10, 10, 10], // top, left, bottom, right
      filename:     `HSE_Report_${selectedDept || 'all'}_2026.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
      html2pdf().set(opt).from(element).save().then(() => {
        setIsDownloading(false);
      }).catch((err: any) => {
        console.error('PDF generation error:', err);
        setIsDownloading(false);
        alert(isFa ? 'خطا در تولید فایل PDF. لطفا دکمه چاپ را برای خروجی جایگزین امتحان کنید.' : 'Failed to generate PDF. Please try the Print button instead.');
      });
    } catch (err) {
      console.error('html2pdf execution failure:', err);
      setIsDownloading(false);
      // Fallback
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[90] p-4 overflow-y-auto animate-in fade-in duration-200 print-modal-backdrop" dir={isFa ? 'rtl' : 'ltr'}>
      
      {/* Dynamic style block to enable clean paper printing natively */}
      <style>{`
        @media print {
          /* Hide non-print elements */
          header, main, footer, .print-hidden, .print\\:hidden {
            display: none !important;
          }

          /* Reset html & body elements to allow full page print */
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }

          /* Strip backdrop fixed layout constraints */
          .print-modal-backdrop {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
          }

          /* Strip modal container constraints */
          .print-modal-container {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Strip flex split row layout */
          .print-content-split {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
          }

          /* Strip preview panel scroll and padding */
          .print-preview-panel {
            background: transparent !important;
            padding: 0 !important;
            overflow: visible !important;
            display: block !important;
            height: auto !important;
          }

          /* Style our main report-print-wrapper to act as the full page flow */
          .report-print-wrapper {
            position: static !important; /* Let it flow natively */
            width: 100% !important;
            min-width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 10mm !important; /* Elegant page margin */
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            display: block !important;
            background: white !important;
          }

          .report-print-wrapper * {
            color: black !important;
            border-color: #6b7280 !important; /* High contrast print borders */
          }

          /* Maintain color fills during print */
          .print-badge-red {
            background-color: #fee2e2 !important;
            color: #991b1b !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-badge-green {
            background-color: #d1fae5 !important;
            color: #065f46 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-badge-blue {
            background-color: #dbeafe !important;
            color: #1e40af !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-score-box {
            background-color: #f3f4f6 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-250 print-modal-container">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black">{tx.title}</h2>
              <p className="text-[10px] text-slate-300 font-medium">SafeWatch AI Report Dispatcher</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split: Left controls, Right preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden print-content-split">
          
          {/* Controls Panel */}
          <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-e border-gray-200 p-5 flex flex-col gap-4 overflow-y-auto shrink-0 print:hidden">
            
            {/* Browser Sandbox/Iframe warning */}
            <div className="bg-amber-50/75 border border-amber-200 rounded-2xl p-3 text-[10px] leading-relaxed text-amber-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 animate-pulse" />
                <span>{isFa ? 'راهنمای چاپ در محیط وب' : 'Web Printing Guide'}</span>
              </div>
              <p>
                {isFa 
                  ? 'اگر از بخش پیش‌نمایش یا داخل ویرایشگر استفاده می‌کنید، مرورگر ممکن است دکمه‌های پرینت و خروجی PDF را بلاک کند. در این صورت، ابتدا برنامه را با استفاده از دکمه گوشه بالا سمت راست در تب جدید باز کنید و سپس پرینت بگیرید.'
                  : 'If you are viewing this app within a frame, browser security might block Print/PDF actions. To ensure success, open the application in a new browser tab first, then execute.'}
              </p>
            </div>

            {/* Filter Type Toggle */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{tx.filterType}</label>
              <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFilterType('EMPLOYEE_DEPT')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 ${
                    filterType === 'EMPLOYEE_DEPT' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>{isFa ? 'دپارتمان پرسنل' : 'Personnel Dept'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('SOURCE_DEPT')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 ${
                    filterType === 'SOURCE_DEPT' ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isFa ? 'حوزه ثبت' : 'Reporter Source'}</span>
                </button>
              </div>
            </div>

            {/* Department Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                {filterType === 'EMPLOYEE_DEPT' ? tx.selectDept : tx.selectSource}
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 border border-gray-250 bg-white rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {(filterType === 'EMPLOYEE_DEPT' ? employeeDepts : sourceDepts).map((dept, index) => (
                  <option key={index} value={dept}>
                    {isFa && (dept === 'HSE' ? 'واحد ایمنی و بهداشت (HSE)' : dept === 'SECURITY' ? 'واحد حراست و انتظامات' : dept === 'TRAINING' ? 'واحد آموزش فنی' : dept === 'ADMIN' ? 'واحد امور اداری' : dept === 'HR' ? 'کمیته انضباطی / منابع انسانی' : dept)}
                    {!isFa && dept}
                  </option>
                ))}
                {(filterType === 'EMPLOYEE_DEPT' ? employeeDepts : sourceDepts).length === 0 && (
                  <option value="">{isFa ? 'دپارتمانی یافت نشد' : 'No departments available'}</option>
                )}
              </select>
            </div>

            {/* Date Range Filters */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>{tx.period}</span>
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block mb-1">{tx.startDate}</span>
                  <input
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder={isFa ? "مثال: 1403/01/01" : "e.g. 1403/01/01"}
                    className="w-full px-3 py-1.5 border border-gray-250 bg-white rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-center"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 block mb-1">{tx.endDate}</span>
                  <input
                    type="text"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder={isFa ? "مثال: 1403/12/29" : "e.g. 1403/12/29"}
                    className="w-full px-3 py-1.5 border border-gray-250 bg-white rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-center"
                  />
                </div>
              </div>
            </div>

            {/* Dispatch Actions */}
            <div className="mt-auto pt-6 space-y-2.5 border-t border-gray-150">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>{tx.printReport}</span>
              </button>

              <button
                type="button"
                disabled={isDownloading}
                onClick={handleDownloadPdf}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md disabled:opacity-50"
              >
                {isDownloading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{tx.downloadPdf}</span>
              </button>
            </div>

          </div>

          {/* Document Preview Panel */}
          <div className="flex-1 bg-slate-200 p-4 md:p-8 overflow-auto flex justify-start md:justify-center print-preview-panel">
            
            {/* Live Preview Paper Wrapper (Formatted as A4 portrait) */}
            <div 
              id="report-print-content" 
              className="report-print-wrapper bg-white w-full max-w-[210mm] min-h-[297mm] shadow-xl rounded-2xl p-6 md:p-10 border border-gray-300 flex flex-col justify-between text-black font-sans select-text relative shrink"
              dir="rtl"
            >
              
              {/* Outer border trim for printable official look */}
              <div className="absolute inset-4 border border-slate-200 pointer-events-none rounded-xl print:hidden"></div>
              
              <div className="relative z-10 space-y-6">
                
                {/* 1. Official Document Header */}
                <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3 flex-wrap sm:flex-nowrap gap-4">
                  
                  {/* Right Header: Logo & Company */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 font-extrabold text-sm border border-indigo-700">
                      HSE
                    </div>
                    <div className="text-right">
                      <h1 className="text-sm font-black text-slate-900 leading-tight">
                        {settings.companyName || (isFa ? 'شرکت معدنی و صنعتی نمونه' : 'General Mining & Industrial Co.')}
                      </h1>
                      <p className="text-[10px] text-gray-500 font-extrabold tracking-wider font-mono">SAFEWATCH AI CORE</p>
                    </div>
                  </div>

                  {/* Center Header: Document Title */}
                  <div className="text-center flex-1 py-1 px-3 bg-slate-100 rounded-lg border border-slate-200 sm:max-w-xs mx-auto">
                    <h2 className="text-xs md:text-sm font-black text-slate-800 tracking-tight">{tx.docTitle}</h2>
                  </div>

                  {/* Left Header: Date, ID, Period */}
                  <div className="text-left font-mono text-[9px] text-slate-600 space-y-0.5">
                    <div><strong>{isFa ? 'شماره سند:' : 'Doc ID:'}</strong> {reportMetadata.reportId}</div>
                    <div><strong>{isFa ? 'تاریخ صدور:' : 'Date:'}</strong> {reportMetadata.todayDate}</div>
                    <div><strong>{isFa ? 'دوره گزارش:' : 'Period:'}</strong> {startDate || endDate ? `${startDate || '...'} ${isFa ? 'تا' : 'to'} ${endDate || '...'}` : tx.allPeriods}</div>
                  </div>

                </div>

                {/* Scope Header details */}
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl flex justify-between items-center flex-wrap gap-2 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-slate-500" />
                    <span>{isFa ? 'واحد ارزیابی شده:' : 'Target Unit:'}</span>
                    <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-black">
                      {isFa && (selectedDept === 'HSE' ? 'واحد ایمنی و بهداشت (HSE)' : selectedDept === 'SECURITY' ? 'واحد حراست و انتظامات' : selectedDept === 'TRAINING' ? 'واحد آموزش فنی' : selectedDept === 'ADMIN' ? 'واحد امور اداری' : selectedDept === 'HR' ? 'کمیته انضباطی / منابع انسانی' : selectedDept)}
                      {!isFa && (selectedDept || 'ALL')}
                    </span>
                  </div>
                  <div>
                    <span>{isFa ? 'نوع فیلترینگ گزارش:' : 'Scope Selection:'}</span>
                    <span className="text-slate-600 font-extrabold mr-1">
                      {filterType === 'EMPLOYEE_DEPT' ? (isFa ? 'دپارتمان کاری پرسنل' : 'Personnel Dept') : (isFa ? 'واحد ناظر و ثبت‌کننده' : 'Watcher Unit')}
                    </span>
                  </div>
                </div>

                {/* 2. Summary Metrics Dashboard Section */}
                <div className="space-y-2.5">
                  <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{tx.summaryMetrics}</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    
                    {/* Stat item: Total violations */}
                    <div className="border border-slate-200 rounded-xl p-3 bg-white text-center print-score-box">
                      <div className="text-[10px] font-bold text-gray-500 flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        {tx.totalViolations}
                      </div>
                      <div className="text-lg font-black text-red-600 font-mono mt-1">{stats.vCount}</div>
                    </div>

                    {/* Stat item: Total rewards */}
                    <div className="border border-slate-200 rounded-xl p-3 bg-white text-center print-score-box">
                      <div className="text-[10px] font-bold text-gray-500 flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {tx.totalRewards}
                      </div>
                      <div className="text-lg font-black text-emerald-600 font-mono mt-1">{stats.rCount}</div>
                    </div>

                    {/* Stat item: Net score balance */}
                    <div className="border border-slate-200 rounded-xl p-3 bg-white text-center print-score-box">
                      <div className="text-[10px] font-bold text-gray-500">{tx.netScore}</div>
                      <div className={`text-lg font-black font-mono mt-1 ${stats.netScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {stats.netScore > 0 ? `+${stats.netScore}` : stats.netScore}
                      </div>
                    </div>

                    {/* Stat item: HSE Class */}
                    <div className={`border rounded-xl p-3 text-center flex flex-col justify-center items-center ${stats.classColor}`}>
                      <span className="text-[10px] font-bold opacity-80">{tx.classification}</span>
                      <span className="text-[10px] font-black tracking-tight mt-1">{stats.classification}</span>
                    </div>

                  </div>
                </div>

                {/* 3. Approved Violations Table */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 border-b border-gray-200 pb-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    {tx.approvedViolations}
                  </h3>

                  <div className="border border-slate-250 rounded-xl overflow-hidden">
                    <table className="w-full text-[10px] text-right">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-250 font-black">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">#</th>
                          <th className="px-3 py-2">{tx.empName}</th>
                          <th className="px-3 py-2 text-center">{tx.personnelId}</th>
                          <th className="px-3 py-2 text-center">{tx.date}</th>
                          <th className="px-3 py-2 text-right">{tx.codeLabel}</th>
                          <th className="px-3 py-2 text-center">{tx.severity}</th>
                          <th className="px-3 py-2 text-center w-16">{tx.score}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredData.violations.map((v, index) => (
                          <tr key={v.id} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-center text-slate-400 font-mono">{index + 1}</td>
                            <td className="px-3 py-1.5 font-bold text-slate-900">{v.employeeName}</td>
                            <td className="px-3 py-1.5 text-center font-mono font-bold text-slate-600">{v.personnelId}</td>
                            <td className="px-3 py-1.5 text-center font-mono">{v.date}</td>
                            <td className="px-3 py-1.5 text-slate-700 text-right leading-relaxed font-semibold">
                              <span className="font-mono text-gray-500 font-bold ml-1">[{v.violationCode}]</span>
                              {v.violationType}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold print-badge-red bg-red-100 text-red-800">
                                {isFa
                                  ? (v.severity === 'Critical' ? 'بحرانی' : v.severity === 'High' ? 'شدید' : v.severity === 'Medium' ? 'متوسط' : 'خفیف')
                                  : v.severity
                                }
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono font-black text-red-600 leading-none">{v.score}</td>
                          </tr>
                        ))}
                        {filteredData.violations.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-3 py-6 text-center text-gray-400 font-bold italic">
                              {isFa ? 'هیچ تخلف ثبت شده‌ای برای این دوره یافت نشد.' : 'No compliance violations logged in this period.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Approved Rewards Table */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-800 flex items-center gap-2 border-b border-gray-200 pb-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    {tx.approvedRewards}
                  </h3>

                  <div className="border border-slate-250 rounded-xl overflow-hidden">
                    <table className="w-full text-[10px] text-right">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-250 font-black">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">#</th>
                          <th className="px-3 py-2">{tx.empName}</th>
                          <th className="px-3 py-2 text-center">{tx.personnelId}</th>
                          <th className="px-3 py-2 text-center">{tx.date}</th>
                          <th className="px-3 py-2 text-right">{tx.codeLabel}</th>
                          <th className="px-3 py-2 text-center w-16">{tx.score}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {filteredData.rewards.map((r, index) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 text-center text-slate-400 font-mono">{index + 1}</td>
                            <td className="px-3 py-1.5 font-bold text-slate-900">{r.employeeName}</td>
                            <td className="px-3 py-1.5 text-center font-mono font-bold text-slate-600">{r.personnelId}</td>
                            <td className="px-3 py-1.5 text-center font-mono">{r.date}</td>
                            <td className="px-3 py-1.5 text-slate-700 text-right leading-relaxed font-semibold">
                              <span className="font-mono text-gray-500 font-bold ml-1">[{r.rewardCode}]</span>
                              {r.description}
                            </td>
                            <td className="px-3 py-1.5 text-center font-mono font-black text-emerald-600 leading-none">+{r.score}</td>
                          </tr>
                        ))}
                        {filteredData.rewards.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-3 py-6 text-center text-gray-400 font-bold italic">
                              {isFa ? 'هیچ تشویقی ثبت شده‌ای برای این دوره یافت نشد.' : 'No safety awards logged in this period.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* 5. Official Signatures Footer (Bottom of paper) */}
              <div className="mt-12 pt-6 border-t border-slate-300 relative z-10">
                <div className="grid grid-cols-3 gap-6 text-center text-[9px] font-bold text-slate-700">
                  
                  {/* HSE Column */}
                  <div className="space-y-12">
                    <span className="block border-b border-slate-200 pb-1 text-slate-900 font-black">{tx.hseManager}</span>
                    <span className="block text-slate-400 font-normal italic">{tx.signatureAndStamp}</span>
                  </div>

                  {/* HR / Committee Column */}
                  <div className="space-y-12">
                    <span className="block border-b border-slate-200 pb-1 text-slate-900 font-black">{tx.committeeRepresentative}</span>
                    <span className="block text-slate-400 font-normal italic">{tx.signatureAndStamp}</span>
                  </div>

                  {/* Plant Manager Column */}
                  <div className="space-y-12">
                    <span className="block border-b border-slate-200 pb-1 text-slate-900 font-black">{tx.plantManager}</span>
                    <span className="block text-slate-400 font-normal italic">{tx.signatureAndStamp}</span>
                  </div>

                </div>

                {/* System Watermark */}
                <div className="mt-8 text-center text-[8px] text-gray-450 border-t border-slate-100 pt-3 flex justify-between items-center px-2">
                  <span>{isFa ? 'گزارش سیستمی صادر شده توسط سامانه هوشمند SafeWatch AI - فاقد قلم‌خوردگی معتبر است.' : 'System report generated via SafeWatch AI. Valid without manual corrections.'}</span>
                  <span className="font-mono text-[7px] text-gray-400">PAGE 1 / 1</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

export default PrintReportModal;
