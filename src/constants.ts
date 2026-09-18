import { Violation, Severity, User, AppSettings, Reward, CodeItem, N8nConfig } from './types';

export const DEFAULT_COMPANY_LOGO = '/logo.png';

export const APP_VERSION = "4.15.12";

export const TRANSLATIONS = {
  fa: {
    loginTitle: "سامانه جامع پایش عملکرد پرسنل",
    username: "نام کاربری",
    password: "رمز عبور",
    loginBtn: "ورود به پنل",
    dashboard: "داشبورد جامع",
    violations: "تخلفات و اخطارها",
    rewards: "تشویقات و امتیازات",
    approvals: "کارتابل تایید",
    committee: "کمیته انضباطی",
    reporters: "عملکرد واحدها",
    settings: "تنظیمات",
    logout: "خروج",
    search: "جستجوی پرسنل...",
    newViolation: "ثبت مورد جدید (منفی)",
    newReward: "ثبت مورد جدید (مثبت)",
    users: "مدیریت کاربران",
    codingSystem: "مدیریت کدها",
    appearance: "ظاهر و زبان",
    companyInfo: "اطلاعات سازمانی",
    save: "ذخیره تغییرات",
    theme: "تم رنگی",
    language: "زبان",
    uploadLogo: "آپلود لوگو",
    addUser: "افزودن کاربر",
    role: "نقش سازمانی",
    actions: "عملیات",
    welcome: "خوش آمدید",
    totalViolations: "کل اخطارها",
    highRisk: "موارد بحرانی",
    personnel: "پرسنل",
    totalRewards: "کل امتیازات",
    exemplaryPersonnel: "پرسنل برتر",
    honoredPersonnel: "پرسنل تقدیر شده",
    pending: "در انتظار بررسی",
    approved: "تایید شده",
    rejected: "رد شده",
    archives: "بایگانی",
    selectWorkerOfMonth: "انتخاب پرسنل نمونه (هوش مصنوعی)",
    reasoningTitle: "تحلیل هوش مصنوعی",
    dataManagement: "مدیریت داده‌ها",
    backupDesc: "پشتیبان‌گیری کامل برای انتقال اطلاعات.",
    downloadBackup: "دانلود فایل (خروجی)",
    restoreDesc: "آیا می‌خواهید اطلاعات جایگزین شود یا ادغام گردد؟",
    uploadBackup: "بارگذاری فایل (ورودی)",
    restoreSuccess: "عملیات با موفقیت انجام شد.",
    restoreError: "خطا در بازیابی.",
    exportData: "خروجی اکسل",
    sync: "همگام‌سازی",
    syncing: "در حال ارسال...",
    synced: "بروزرسانی شد",
    offline: "آفلاین",
    online: "آنلاین",
    lastSync: "آخرین بروزرسانی",
    codeLegend: "راهنمای کدهای انضباطی",
    violationCode: "کد خطا",
    rewardCode: "کد امتیاز",
    viewProfile: "مشاهده پرونده کامل",
    currentScore: "امتیاز فعلی رفتار",
    scoreHistory: "تاریخچه امتیازات",
    dept_HSE: "ایمنی (HSE)",
    dept_SECURITY: "انتظامات",
    dept_TRAINING: "آموزش",
    dept_ADMIN: "اداری",
    scoreLabel: "امتیاز:",
    personnelDatabase: "پایگاه داده پرسنل",
    importPersonnel: "آپلود لیست پرسنل (Excel)",
    importDesc: "فایل اکسل شامل ستون‌های PersonnelID, FullName, Department را بارگذاری کنید.",
    importSuccess: "تعداد {count} پرسنل با موفقیت وارد شدند.",
    downloadTemplate: "دانلود نمونه فایل",
    // Merge/Sync
    mergeData: "ادغام هوشمند (Merge)",
    replaceData: "جایگزینی کامل (Replace)",
    mergeDesc: "استفاده از ادغام برای تجمیع اطلاعات واحدهای مختلف در سیستم مدیریت.",
    
    // User Management
    resetPassword: "ریست رمز",
    resetConfirm: "رمز عبور به 'Pass123' تغییر یابد؟",
    developerTools: "ابزار توسعه‌دهنده",
    resetAllPasswords: "ریست تمام رمزها",
    factoryReset: "بازگشت به کارخانه",
    managedDepartment: "نام واحد تحت مدیریت",
    addCode: "افزودن کد جدید",
    codeTitle: "عنوان",
    codeScore: "امتیاز",
    codeDept: "واحد مربوطه",
    
    // Profile Labels
    profileTitle: "پرونده الکترونیک پرسنل",
    totalScore: "مجموع امتیاز عملکرد",
    riskStatus: "وضعیت ریسک",
    status_Excellent: "عالی (نمونه)",
    status_Good: "خوب",
    status_Warning: "هشدار",
    status_Danger: "خطر (کمیته انضباطی)",
    status_Critical: "بحرانی (تعلیق/اخراج)",
    
    // AI Settings
    aiSettings: "تنظیمات هوش مصنوعی",
    apiKeyLabel: "کلید API (Gemini)",
    apiKeyPlaceholder: "کلید API را وارد کنید (شروع با AIza...)",
    apiKeyDesc: "در صورت خالی بودن، از کلید پیش‌فرض سیستم استفاده می‌شود.",

    // Form Labels
    reporterInfo: "اطلاعات ثبت کننده",
    personnelId: "کد پرسنلی",
    fullName: "نام و نام خانوادگی",
    department: "واحد سازمانی پرسنل",
    sourceDept: "واحد گزارش دهنده",
    date: "تاریخ",
    severity: "سطح اهمیت",
    violationType: "نوع مورد",
    other: "سایر",
    description: "توضیحات تکمیلی",
    evidence: "مستندات",
    uploadImage: "تصویر/سند",
    cancel: "لغو",
    submit: "ثبت نهایی",
    submitReward: "ثبت امتیاز",
    warningStage: "تکرار مورد",
    historyAlert: "این پرسنل سوابق قبلی دارد.",
    requiredFields: "فیلدهای ستاره‌دار الزامی است.",
    selectOne: "انتخاب کنید.",
    shortDesc: "شرح کوتاه...",
    penaltyActions: "اقدامات پیشنهادی",
    rewardActions: "پاداش پیشنهادی",
    rewardReason: "دلیل امتیاز",
    positiveAction: "شرح عملکرد",
    // Values
    severity_Low: "کم اهمیت",
    severity_Medium: "متوسط",
    severity_High: "مهم",
    severity_Critical: "بحرانی",
    status_Pending: "در انتظار",
    status_Paid: "اعمال شده",
    status_Appealed: "اعتراض شده",
    status_Approved: "تایید شده",
    // Roles
    role_developer: "مدیر سیستم (توسعه‌دهنده)",
    role_hse_manager: "مدیر ایمنی و بهداشت HSE",
    role_hse_officer: "افسر ایمنی",
    role_security_manager: "مسئول واحد انتظامات",
    role_security_guard: "نگهبان یا نیروی انتظامات",
    role_training_manager: "مسئول واحد آموزش",
    role_admin_staff: "کارشناس / مسئول اداری",
    role_hr_manager: "مدیر منابع انسانی",
    role_plant_manager: "مدیر کارخانه",
    role_department_manager: "مدیر واحد (سفارشی)",
    // Modes
    mode_violation: "ثبت تخلفات (منفی)",
    mode_reward: "ثبت امتیازات (مثبت)",
    // Reward Types
    type_SafetyPrinciples: "رعایت اصول ایمنی",
    type_PPEUsage: "استفاده از PPE",
    type_SafeMethod: "روش کار ایمن",
    type_Innovation: "نوآوری",
    type_CrisisManagement: "مدیریت بحران",
    type_SecurityAlertness: "هوشیاری امنیتی",
    type_TrainingExcellence: "نمره برتر آموزش",
    type_AdminDiscipline: "نظم اداری",
    
    penaltyList: [
      "تذکر شفاهی",
      "توبیخ کتبی",
      "کسر کارانه",
      "تعلیق موقت",
      "ارجاع به کمیته انضباطی",
      "اخراج"
    ],
    rewardList: [
      "پاداش نقدی",
      "تشویقی ساعتی",
      "لوح تقدیر",
      "معرفی به عنوان نمونه"
    ]
  },
  en: {
    loginTitle: "Comprehensive Personnel Monitoring",
    username: "Username",
    password: "Password",
    loginBtn: "Login",
    dashboard: "Dashboard",
    violations: "Violations",
    rewards: "Rewards",
    approvals: "Approvals",
    committee: "Committee",
    reporters: "Reporters",
    settings: "Settings",
    logout: "Logout",
    search: "Search personnel...",
    newViolation: "New Violation",
    newReward: "New Reward",
    users: "Users",
    codingSystem: "Codes Management",
    appearance: "Appearance",
    companyInfo: "Company Info",
    save: "Save",
    theme: "Theme",
    language: "Language",
    uploadLogo: "Upload Logo",
    addUser: "Add User",
    role: "Role",
    actions: "Actions",
    welcome: "Welcome",
    totalViolations: "Total Violations",
    highRisk: "High Risk",
    personnel: "Personnel",
    totalRewards: "Total Rewards",
    exemplaryPersonnel: "Top Personnel",
    honoredPersonnel: "Honored",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    archives: "Archives",
    selectWorkerOfMonth: "AI Worker Selection",
    reasoningTitle: "AI Reasoning",
    dataManagement: "Data Management",
    backupDesc: "Backup all system data.",
    downloadBackup: "Download Backup",
    restoreDesc: "Merge or Replace Data?",
    uploadBackup: "Upload Backup",
    restoreSuccess: "Restored successfully.",
    restoreError: "Restore failed.",
    exportData: "Export CSV",
    sync: "Sync",
    syncing: "Syncing...",
    synced: "Synced",
    offline: "Offline",
    online: "Online",
    lastSync: "Last Sync",
    codeLegend: "Code Legend",
    violationCode: "Code",
    rewardCode: "Code",
    viewProfile: "View Full Profile",
    currentScore: "Current Score",
    scoreHistory: "Score History",
    dept_HSE: "HSE",
    dept_SECURITY: "Security",
    dept_TRAINING: "Training",
    dept_ADMIN: "Admin",
    scoreLabel: "Score:",
    personnelDatabase: "Personnel Database",
    importPersonnel: "Import Personnel (Excel)",
    importDesc: "Upload Excel file with PersonnelID, FullName, Department columns.",
    importSuccess: "Successfully imported {count} employees.",
    downloadTemplate: "Download Template",
    mergeData: "Smart Merge",
    replaceData: "Replace All",
    mergeDesc: "Use Merge to combine data from different units.",
    resetPassword: "Reset Pass",
    resetConfirm: "Reset password to 'Pass123'?",
    developerTools: "Developer Tools",
    resetAllPasswords: "Reset All Passwords",
    factoryReset: "Factory Reset",
    managedDepartment: "Managed Dept Name",
    addCode: "Add New Code",
    codeTitle: "Title",
    codeScore: "Score",
    codeDept: "Related Dept",
    
    aiSettings: "AI Settings",
    apiKeyLabel: "Gemini API Key",
    apiKeyPlaceholder: "Enter API Key (starts with AIza...)",
    apiKeyDesc: "If empty, system default key will be used.",

    profileTitle: "Personnel Electronic Dossier",
    totalScore: "Total Performance Score",
    riskStatus: "Risk Status",
    status_Excellent: "Excellent",
    status_Good: "Good",
    status_Warning: "Warning",
    status_Danger: "Danger",
    status_Critical: "Critical",
    reporterInfo: "Reporter Info",
    personnelId: "ID",
    fullName: "Full Name",
    department: "Department",
    sourceDept: "Reporting Dept",
    date: "Date",
    severity: "Severity",
    violationType: "Type",
    other: "Other",
    description: "Description",
    evidence: "Evidence",
    uploadImage: "Upload",
    cancel: "Cancel",
    submit: "Submit",
    submitReward: "Submit Reward",
    warningStage: "Stage",
    historyAlert: "History exists.",
    requiredFields: "Required fields missing.",
    selectOne: "Select one.",
    shortDesc: "Short desc...",
    penaltyActions: "Penalties",
    rewardActions: "Rewards",
    rewardReason: "Reason",
    positiveAction: "Action",
    severity_Low: "Low",
    severity_Medium: "Medium",
    severity_High: "High",
    severity_Critical: "Critical",
    status_Pending: "Pending",
    status_Paid: "Paid",
    status_Appealed: "Appealed",
    status_Approved: "Approved",
    role_developer: "System Developer",
    role_hse_manager: "HSE Manager",
    role_hse_officer: "HSE Officer",
    role_security_manager: "Security Unit Manager",
    role_security_guard: "Security Guard",
    role_training_manager: "Training Unit Manager",
    role_admin_staff: "Administrative Staff",
    role_hr_manager: "HR Manager",
    role_plant_manager: "Plant Manager",
    role_department_manager: "Unit Manager (Custom)",
    mode_violation: "Violations (Negative)",
    mode_reward: "Rewards (Positive)",
    type_SafetyPrinciples: "Safety Principles",
    type_PPEUsage: "PPE Usage",
    type_SafeMethod: "Safe Method",
    type_Innovation: "Innovation",
    type_CrisisManagement: "Crisis Mgmt",
    type_SecurityAlertness: "Security Alertness",
    type_TrainingExcellence: "Training Excellence",
    type_AdminDiscipline: "Admin Discipline",
    penaltyList: ["Warning", "Written Reprimand", "Bonus Cut", "Suspension", "Committee", "Termination"],
    rewardList: ["Cash", "Time Off", "Certificate", "Top Performer"]
  }
};

// --- CODING SYSTEM (Scores & Departments) ---
// Base score starts at 100. Violations subtract, Rewards add.
export const INITIAL_VIOLATION_CODES: CodeItem[] = [
  // HSE (10-99)
  { id: 'v1', code: 10, label: "عدم استفاده از کلاه ایمنی", score: -5, department: 'HSE' },
  { id: 'v2', code: 11, label: "عدم استفاده از کفش ایمنی", score: -5, department: 'HSE' },
  { id: 'v3', code: 12, label: "عدم استفاده از لوازم حفاظت فردی متناسب با کار", score: -10, department: 'HSE' },
  { id: 'v4', code: 20, label: "کار در ارتفاع بدون کمربند ایمنی", score: -20, department: 'HSE' }, // High risk
  { id: 'v5', code: 30, label: "استعمال دخانیات در محیط کار", score: -15, department: 'HSE' },
  { id: 'v6', code: 40, label: "سرعت غیر مجاز در محوطه سایت", score: -10, department: 'HSE' },
  { id: 'v7', code: 50, label: "رفتار نا ایمن (شوخی در محیط کار)", score: -10, department: 'HSE' },
  { id: 'v8', code: 60, label: "عدم اخذ پرمیت (Permit)", score: -15, department: 'HSE' },
  { id: 'v9', code: 70, label: "نداشتن مجوز تردد معتبر (پیمانکاران)", score: -10, department: 'HSE' },
  { id: 'v10', code: 13, label: "استفاده از لباس کار یا کفش نامناسب/فرسوده", score: -5, department: 'HSE' },
  { id: 'v20', code: 1, label: "سوار شدن نفرات کنار راننده لیفتراک", score: -10, department: 'HSE' },
  { id: 'v21', code: 9, label: "عدم استفاده از لباس و کفش های قدیمی", score: -5, department: 'HSE' },

  // SECURITY (200-299)
  { id: 'v11', code: 201, label: "خروج غیرمجاز اموال", score: -50, department: 'SECURITY' }, // Critical
  { id: 'v12', code: 202, label: "خوابیدن در شیفت کاری", score: -30, department: 'SECURITY' },
  { id: 'v13', code: 203, label: "عدم ثبت ورود/خروج", score: -10, department: 'SECURITY' },
  { id: 'v14', code: 204, label: "درگیری فیزیکی", score: -40, department: 'SECURITY' },
  // ADMIN (300-399)
  { id: 'v15', code: 301, label: "تاخیر ورود بیش از حد", score: -5, department: 'ADMIN' },
  { id: 'v16', code: 302, label: "غیبت غیرموجه", score: -10, department: 'ADMIN' },
  { id: 'v17', code: 303, label: "عدم رعایت پوشش اداری", score: -5, department: 'ADMIN' },
  // TRAINING (400-499)
  { id: 'v18', code: 401, label: "غیبت در کلاس آموزشی", score: -10, department: 'TRAINING' },
  { id: 'v19', code: 402, label: "نمره مردودی در آزمون", score: -10, department: 'TRAINING' }
];

export const INITIAL_REWARD_CODES: CodeItem[] = [
  // HSE
  { id: 'r1', code: 100, label: "استفاده صحیح از PPE (تشویقی)", score: +5, department: 'HSE' },
  { id: 'r2', code: 101, label: "گزارش شبه حادثه (Near Miss)", score: +10, department: 'HSE' },
  { id: 'r3', code: 105, label: "نجات همکار/پیشگیری از حادثه", score: +30, department: 'HSE' },
  // SECURITY
  { id: 'r4', code: 250, label: "کشف سرقت", score: +40, department: 'SECURITY' },
  { id: 'r5', code: 251, label: "هوشیاری بالا در شیفت شب", score: +15, department: 'SECURITY' },
  // TRAINING
  { id: 'r6', code: 450, label: "نمره کامل در آزمون ایمنی", score: +10, department: 'TRAINING' },
  { id: 'r7', code: 451, label: "مربی‌گری داوطلبانه", score: +20, department: 'TRAINING' },
  // ADMIN
  { id: 'r8', code: 350, label: "نظم و انضباط نمونه (یک ماه)", score: +10, department: 'ADMIN' }
];

export const DEFAULT_USERS: User[] = [
  // DEV VIEW
  { id: 'dev1', username: 'Dev123', password: 'Pass123', fullName: 'مدیر سیستم', role: 'DEVELOPER', avatar: '', phoneNumber: '09121111111', email: 'dev@safewatch.ir', telegramUsername: '@Dev123_Support' },

  // GLOBAL VIEW
  { id: 'u0', username: 'Manager123', password: 'Pass123', fullName: 'مدیر کارخانه', role: 'PLANT_MANAGER', avatar: '', phoneNumber: '09122222222', email: 'manager@safewatch.ir', telegramUsername: '@Manager123_Support' },
  { id: 'u1', username: 'HrManager123', password: 'Pass123', fullName: 'مدیر منابع انسانی', role: 'HR_MANAGER', avatar: '', phoneNumber: '09123333333', email: 'hr@safewatch.ir' },
  
  // HSE VIEW
  { id: 'u2', username: 'HseManager123', password: 'Pass123', fullName: 'مدیر ایمنی و بهداشت', role: 'HSE_MANAGER', avatar: '', phoneNumber: '09124444444', email: 'hse@safewatch.ir' },
  { id: 'u3', username: 'HseOfficer123', password: 'Pass123', fullName: 'افسر ایمنی', role: 'HSE_OFFICER', avatar: '', phoneNumber: '09125555555', email: 'officer@safewatch.ir' },
  
  // DEPARTMENT SPECIFIC VIEW
  { id: 'u4', username: 'Security123', password: 'Pass123', fullName: 'مسئول واحد انتظامات', role: 'SECURITY_MANAGER', avatar: '', phoneNumber: '09126666666', email: 'security@safewatch.ir' },
  { id: 'u7', username: 'Guard123', password: 'Pass123', fullName: 'نگهبان انتظامات', role: 'SECURITY_GUARD', avatar: '', phoneNumber: '09129999999', email: 'guard@safewatch.ir' },
  { id: 'u5', username: 'Training123', password: 'Pass123', fullName: 'مسئول واحد آموزش', role: 'TRAINING_MANAGER', avatar: '', phoneNumber: '09127777777', email: 'training@safewatch.ir' },
  { id: 'u6', username: 'Admin123', password: 'Pass123', fullName: 'کارشناس اداری', role: 'ADMIN_STAFF', avatar: '', phoneNumber: '09128888888', email: 'admin@safewatch.ir' },
];

export const DEFAULT_N8N_CONFIG: N8nConfig = {
  isEnabled: false,
  baseUrl: 'http://localhost:5678',
  webhookPath: '/webhook/safewatch-automation',
  apiKey: '',
  nodeId: 'SafeWatch-Node-Main',
  triggerOnViolation: true,
  triggerOnReward: true,
  triggerOnEmployee: true,
  triggerOnSync: true,
  interconnectEnabled: true,
  interconnectWebhookUrl: '',
  autoRelayToInterconnectNodes: false
};

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'fa',
  themeColor: 'blue',
  companyLogo: DEFAULT_COMPANY_LOGO,
  companyName: 'Intelligent monitoring system سامانه جامع پایش',
  customApiKey: '',
  aiProvider: 'GEMINI',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3',
  localHfUrl: 'http://localhost:8000',
  localHfModel: 'Qwen/Qwen2.5-Copilot-3B',
  autoOfflineFailover: true,
  defaultLoginDepartment: 'ALL',
  n8nConfig: DEFAULT_N8N_CONFIG
};

// Initial Mock Data with Departments
export const MOCK_VIOLATIONS: Violation[] = [
  {
    id: 'V-1001',
    employeeName: 'علی محمدی',
    personnelId: '980123',
    department: 'تاسیسات',
    departmentSource: 'HSE',
    reporterName: 'مدیر ایمنی',
    date: '1403/02/10',
    violationType: 'عدم استفاده از کلاه ایمنی',
    violationCode: 10,
    description: 'در سایت بدون کلاه دیده شد.',
    severity: Severity.MEDIUM,
    score: -5,
    penaltyActions: ['تذکر شفاهی'],
    violationStage: 1,
    status: 'Pending',
    isApproved: true,
    isArchived: false
  },
  {
    id: 'V-2001',
    employeeName: 'رضا کریمی',
    personnelId: '990222',
    department: 'انبار',
    departmentSource: 'SECURITY',
    reporterName: 'سرپرست انتظامات',
    date: '1403/02/12',
    violationType: 'خوابیدن در شیفت کاری',
    violationCode: 202,
    description: 'در گشت زنی ساعت 2 بامداد مشاهده شد.',
    severity: Severity.HIGH,
    score: -30,
    penaltyActions: ['توبیخ کتبی'],
    violationStage: 1,
    status: 'Pending',
    isApproved: true,
    isArchived: false
  }
];

export const MOCK_REWARDS: Reward[] = [
  {
    id: 'R-1001',
    employeeName: 'حسین جلالی',
    personnelId: '990111',
    department: 'تولید',
    departmentSource: 'HSE',
    reporterName: 'مدیر ایمنی',
    date: '1403/02/15',
    rewardType: 'PPEUsage',
    rewardCode: 100,
    description: 'رعایت عالی اصول',
    score: 5,
    rewardsGiven: ['تشویقی ساعتی'],
    isApproved: true,
    isArchived: false
  }
];

export const getSeverityColor = (severity: Severity): string => {
  switch (severity) {
    case Severity.LOW: return 'bg-blue-100 text-blue-800 border-blue-200';
    case Severity.MEDIUM: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case Severity.HIGH: return 'bg-orange-100 text-orange-800 border-orange-200';
    case Severity.CRITICAL: return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Paid': return 'bg-green-100 text-green-700';
    case 'Pending': return 'bg-red-50 text-red-600';
    case 'Appealed': return 'bg-gray-100 text-gray-600';
    default: return 'bg-gray-100';
  }
};

export const isOlderThanSixMonths = (dateStr: string): boolean => {
    try {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return false;
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const fileDateVal = year * 12 + month;
        const currentYear = 1403;
        const currentMonth = 2; 
        const currentDateVal = currentYear * 12 + currentMonth;
        return (currentDateVal - fileDateVal) >= 6;
    } catch (e) {
        return false;
    }
};