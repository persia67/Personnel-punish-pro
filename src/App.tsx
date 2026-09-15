import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MOCK_VIOLATIONS, MOCK_REWARDS, getSeverityColor, getStatusColor, isOlderThanSixMonths, APP_VERSION, DEFAULT_USERS, DEFAULT_SETTINGS, DEFAULT_COMPANY_LOGO, TRANSLATIONS, INITIAL_VIOLATION_CODES, INITIAL_REWARD_CODES } from './constants';
import { Violation, Reward, User, AppSettings, SystemMode, WorkerOfMonthResult, Department, Employee, CodeItem } from './types';
import DashboardStats from './components/DashboardStats';
import ViolationForm from './components/ViolationForm';
import RewardForm from './components/RewardForm';
import GeminiReport from './components/GeminiReport';
import DeleteModal from './components/DeleteModal';
import LoginPage from './components/LoginPage';
import SettingsModal from './components/SettingsModal';
import CodeLegendModal from './components/CodeLegendModal';
import PrintReportModal from './components/PrintReportModal';
import PersonnelProfileModal from './components/PersonnelProfileModal';
import { EditEmployeeModal } from './components/EditEmployeeModal';
import { TransferToBinderModal } from './components/TransferToBinderModal';
import { ManualEmployeeForm, DEPARTMENTS_LIST } from './components/ManualEmployeeForm';
import ChangePasswordModal from './components/ChangePasswordModal';
import OfflineSyncModal from './components/OfflineSyncModal';
import { EditAvatarModal } from './components/EditAvatarModal';
import { WorkerOfMonthModal } from './components/WorkerOfMonthModal';
import ChangelogModal from './components/ChangelogModal';
import CompanyLogo from './components/CompanyLogo';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import HseTrendDashboard from './components/HseTrendDashboard';
import { DatacenterModal } from './components/DatacenterModal';
import { PostgresArchitectureModal } from './components/PostgresArchitectureModal';
import { InitialSetupWizard } from './components/InitialSetupWizard';
import { getServerUrl, fetchCentralData, syncCentralData, subscribeToLiveEvents, LiveDbEvent, getLocalDeploymentMode } from './services/syncService';
import { processEmployeeDepartments, getMasterDepartments, saveMasterDepartments, ensureDepartmentExists } from './services/departmentUtils';
import { sendNotificationSms } from './services/smsService';
import { Shield, Plus, Search, Trophy, Trash2, AlertCircle, FileSpreadsheet, Archive, Gavel, Check, XCircle, LogOut, Settings, Award, Medal, Sparkles, Loader2, RefreshCw, Wifi, WifiOff, Check as CheckIcon, BookOpen, User as UserIcon, ArrowUpDown, ChevronUp, ChevronDown, X, Layers, Key, Printer, ArrowLeftRight, Camera, Share2, Inbox, Users, Edit, ShieldAlert, Briefcase, Keyboard, Command, UserPlus, Radio, Server, Database } from 'lucide-react';
import { getTheme } from './theme';

type Tab = 'VIOLATIONS' | 'APPROVALS' | 'ARCHIVE';

export function ensureAllCodes(
  violations: Violation[] = [],
  rewards: Reward[] = [],
  existingVCodes: CodeItem[] = [],
  existingRCodes: CodeItem[] = []
): { violationCodes: CodeItem[]; rewardCodes: CodeItem[] } {
  const vMap = new Map<string, CodeItem>();
  const rMap = new Map<string, CodeItem>();

  // 1. Add INITIAL_VIOLATION_CODES
  INITIAL_VIOLATION_CODES.forEach(item => {
    vMap.set(String(item.code), { ...item });
  });

  // 2. Add existingVCodes
  (existingVCodes || []).forEach(item => {
    if (item && item.code !== undefined && item.code !== null) {
      vMap.set(String(item.code), { ...item });
    }
  });

  // 3. Auto-discover missing codes from violations
  (violations || []).forEach((v, idx) => {
    if (v && v.violationCode !== undefined && v.violationCode !== null) {
      const codeKey = String(v.violationCode).trim();
      if (codeKey !== '' && !vMap.has(codeKey)) {
        vMap.set(codeKey, {
          id: `auto-v-${v.violationCode}-${idx}`,
          code: Number(v.violationCode) || 0,
          label: v.violationType || `کد ${v.violationCode}`,
          score: v.score || -10,
          department: (v.departmentSource as any) || 'HSE'
        });
      }
    }
  });

  // 1. Add INITIAL_REWARD_CODES
  INITIAL_REWARD_CODES.forEach(item => {
    rMap.set(String(item.code), { ...item });
  });

  // 2. Add existingRCodes
  (existingRCodes || []).forEach(item => {
    if (item && item.code !== undefined && item.code !== null) {
      rMap.set(String(item.code), { ...item });
    }
  });

  // 3. Auto-discover missing codes from rewards
  (rewards || []).forEach((r, idx) => {
    if (r && r.rewardCode !== undefined && r.rewardCode !== null) {
      const codeKey = String(r.rewardCode).trim();
      if (codeKey !== '' && !rMap.has(codeKey)) {
        rMap.set(codeKey, {
          id: `auto-r-${r.rewardCode}-${idx}`,
          code: Number(r.rewardCode) || 0,
          label: (r as any).rewardType || `کد ${r.rewardCode}`,
          score: r.score || 10,
          department: (r.departmentSource as any) || 'HSE'
        });
      }
    }
  });

  return {
    violationCodes: Array.from(vMap.values()),
    rewardCodes: Array.from(rMap.values())
  };
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loginError, setLoginError] = useState<string>('');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<'APPEARANCE' | 'USERS' | 'DATA' | 'CODES' | 'SMS' | 'PROFILE'>('APPEARANCE');
  const [currentViewPage, setCurrentViewPage] = useState<'DASHBOARD' | 'PERSONNEL' | 'INBOX'>('DASHBOARD');
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [personnelSearchQuery, setPersonnelSearchQuery] = useState('');
  const [personnelDeptFilter, setPersonnelDeptFilter] = useState('ALL');
  const [personnelGroupCriteria, setPersonnelGroupCriteria] = useState<'DEPARTMENT' | 'SAFETY_STATUS' | 'JOB_TITLE'>('DEPARTMENT');
  const [selectedBinderKey, setSelectedBinderKey] = useState<string | null>(null);
  const [violations, setViolations] = useState<Violation[]>(MOCK_VIOLATIONS);
  const [rewards, setRewards] = useState<Reward[]>(MOCK_REWARDS);
  const [systemMode, setSystemMode] = useState<SystemMode>('VIOLATION');
  const [activeTab, setActiveTab] = useState<Tab>('VIOLATIONS');
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false); 
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isPrintReportOpen, setIsPrintReportOpen] = useState(false);
  const [isOfflineSyncOpen, setIsOfflineSyncOpen] = useState(false);
  const [isDatacenterOpen, setIsDatacenterOpen] = useState(false);
  const [isPostgresModalOpen, setIsPostgresModalOpen] = useState(false);
  const [isInitialWizardOpen, setIsInitialWizardOpen] = useState(() => {
    return localStorage.getItem('sg_initial_setup_completed') !== 'true';
  });
  const [currentDeploymentMode, setCurrentDeploymentMode] = useState(getLocalDeploymentMode());
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isEditAvatarOpen, setIsEditAvatarOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean; id: string | null; type: 'VIOLATION' | 'REWARD'}>({ isOpen: false, id: null, type: 'VIOLATION' });
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearch, setLocalSearch] = useState('');
  const [showMainSearchDropdown, setShowMainSearchDropdown] = useState(false);
  const mainSearchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchTerm === '') {
      setLocalSearch('');
    } else if (localSearch === '' && searchTerm) {
      setLocalSearch(searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mainSearchContainerRef.current && !mainSearchContainerRef.current.contains(event.target as Node)) {
        setShowMainSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const dropdownMatchedEmployees = React.useMemo(() => {
    const query = localSearch.toLowerCase().trim();
    if (!query) return [];
    return employees.filter(emp => {
      return (
        emp.fullName.toLowerCase().includes(query) ||
        emp.personnelId.toLowerCase().includes(query) ||
        (emp.department && emp.department.toLowerCase().includes(query))
      );
    }).slice(0, 8);
  }, [localSearch, employees]);
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'SCORE' | 'DEPARTMENT' | 'LAST_NAME' | 'NONE'>('NONE');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const handleSort = (field: 'SCORE' | 'DEPARTMENT' | 'LAST_NAME') => {
    if (sortField === field) {
      if (sortOrder === 'ASC') {
        setSortOrder('DESC');
      } else {
        setSortField('NONE');
      }
    } else {
      setSortField(field);
      setSortOrder('ASC');
    }
  };

  const handleClearSort = () => {
    setSortField('NONE');
    setSortOrder('ASC');
  };
  
  // Dynamic Code State with auto-ensured code list
  const [violationCodes, setViolationCodes] = useState<CodeItem[]>(() => {
    const saved = localStorage.getItem('sg_violationCodes');
    let parsed: CodeItem[] = [];
    if (saved) { try { parsed = JSON.parse(saved); } catch {} }
    const savedV = localStorage.getItem('sg_violations');
    let parsedV: Violation[] = [];
    if (savedV) { try { parsedV = JSON.parse(savedV); } catch {} }
    return ensureAllCodes(parsedV, [], parsed, []).violationCodes;
  });

  const [rewardCodes, setRewardCodes] = useState<CodeItem[]>(() => {
    const saved = localStorage.getItem('sg_rewardCodes');
    let parsed: CodeItem[] = [];
    if (saved) { try { parsed = JSON.parse(saved); } catch {} }
    const savedR = localStorage.getItem('sg_rewards');
    let parsedR: Reward[] = [];
    if (savedR) { try { parsedR = JSON.parse(savedR); } catch {} }
    return ensureAllCodes([], parsedR, [], parsed).rewardCodes;
  });

  const violationsRef = useRef(violations);
  const rewardsRef = useRef(rewards);
  const employeesRef = useRef(employees);
  const usersRef = useRef(users);
  const violationCodesRef = useRef(violationCodes);
  const rewardCodesRef = useRef(rewardCodes);
  const settingsRef = useRef(settings);

  useEffect(() => { violationsRef.current = violations; }, [violations]);
  useEffect(() => { rewardsRef.current = rewards; }, [rewards]);
  useEffect(() => { employeesRef.current = employees; }, [employees]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { violationCodesRef.current = violationCodes; }, [violationCodes]);
  useEffect(() => { rewardCodesRef.current = rewardCodes; }, [rewardCodes]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Profile Modal State
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);

  // Network & Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [liveSyncStatus, setLiveSyncStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [liveToast, setLiveToast] = useState<{ id: number; message: string; subtext?: string } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [workerOfMonth, setWorkerOfMonth] = useState<WorkerOfMonthResult | null>(null);
  const [selectingWorker, setSelectingWorker] = useState(false);
  const [isWorkerOfMonthOpen, setIsWorkerOfMonthOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  
  // Electron auto-updater states
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState<any>(null);
  const [updateErrorMsg, setUpdateErrorMsg] = useState<string>('');

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    api.onUpdateAvailable((info: any) => {
      setUpdateInfo(info);
      setUpdateStatus('available');
    });

    api.onUpdateNotAvailable(() => {
      setUpdateStatus('idle');
    });

    api.onDownloadProgress((progress: any) => {
      setDownloadProgress(progress);
      setUpdateStatus('downloading');
    });

    api.onUpdateDownloaded((info: any) => {
      setUpdateInfo(info);
      setUpdateStatus('downloaded');
    });

    api.onUpdateError((err: string) => {
      console.error('Update error:', err);
      setUpdateErrorMsg(err);
      setUpdateStatus('idle');
    });

    // Initial check for updates if running in Electron (silent in background)
    setUpdateStatus('idle');
    api.checkForUpdates();
  }, []);
  
  // Network & Sync helpers
  const pushDataToServerState = async (
    vList?: Violation[],
    rList?: Reward[],
    uList?: User[],
    eList?: Employee[],
    vcList?: CodeItem[],
    rcList?: CodeItem[],
    setts?: AppSettings
  ) => {
    try {
      setSyncStatus('syncing');
      const payload = {
        violations: vList !== undefined ? vList : violations,
        rewards: rList !== undefined ? rList : rewards,
        users: uList !== undefined ? uList : users,
        employees: eList !== undefined ? eList : employees,
        violationCodes: vcList !== undefined ? vcList : violationCodes,
        rewardCodes: rcList !== undefined ? rcList : rewardCodes,
        settings: setts !== undefined ? setts : settings
      };
      const res = await syncCentralData(payload);
      if (res.success) {
        setSyncStatus('synced');
        const now = new Date().toLocaleTimeString();
        setLastSyncTime(now);
      } else {
        setSyncStatus('error');
      }
    } catch {
      setSyncStatus('error');
    }
  };

  const pullDataFromServerState = useCallback(async (forceBootstrap = false) => {
    try {
      setSyncStatus('syncing');
      const data = await fetchCentralData();
      if (data) {
        const smartMerge = <T extends { id: string }>(localList: T[], serverList: T[]): T[] => {
          const mergedMap = new Map<string, T>();
          (localList || []).forEach(item => {
            if (item && item.id) mergedMap.set(item.id, item);
          });
          (serverList || []).forEach(item => {
            if (item && item.id) mergedMap.set(item.id, item);
          });
          return Array.from(mergedMap.values());
        };

        const smartMergeEmployees = (local: Employee[], server: Employee[]): Employee[] => {
          const mergedMap = new Map<string, Employee>();
          (local || []).forEach(emp => {
            if (emp && emp.personnelId) mergedMap.set(emp.personnelId, emp);
          });
          (server || []).forEach(emp => {
            if (emp && emp.personnelId) mergedMap.set(emp.personnelId, emp);
          });
          return Array.from(mergedMap.values());
        };

        let localViolations = violationsRef.current;
        let localRewards = rewardsRef.current;
        let localEmployees = employeesRef.current;
        let localUsers = usersRef.current;
        let localViolationCodes = violationCodesRef.current;
        let localRewardCodes = rewardCodesRef.current;
        let localSettings = settingsRef.current;

        if (forceBootstrap) {
          const savedV = localStorage.getItem('sg_violations');
          if (savedV) {
            try { localViolations = JSON.parse(savedV); } catch {}
          }
          const savedR = localStorage.getItem('sg_rewards');
          if (savedR) {
            try { localRewards = JSON.parse(savedR); } catch {}
          }
          const savedE = localStorage.getItem('sg_employees');
          if (savedE) {
            try { localEmployees = JSON.parse(savedE); } catch {}
          }
          const savedU = localStorage.getItem('sg_users');
          if (savedU) {
            try { localUsers = JSON.parse(savedU); } catch {}
          }
          const savedVC = localStorage.getItem('sg_violationCodes');
          if (savedVC) {
            try { localViolationCodes = JSON.parse(savedVC); } catch {}
          }
          const savedRC = localStorage.getItem('sg_rewardCodes');
          if (savedRC) {
            try { localRewardCodes = JSON.parse(savedRC); } catch {}
          }
          const savedS = localStorage.getItem('sg_settings');
          if (savedS) {
            try { localSettings = JSON.parse(savedS); } catch {}
          }
        }

        let mergedViolations = data.violations || [];
        let mergedRewards = data.rewards || [];
        let mergedEmployees = data.employees || [];
        let mergedUsers = data.users || [];
        let mergedViolationCodes = data.violationCodes || [];
        let mergedRewardCodes = data.rewardCodes || [];
        let mergedSettings = data.settings || localSettings;

        // Auto normalize employee departments and sync newly discovered departments
        const currentCustomDepts = mergedSettings?.customDepartments || [];
        const masterDepts = getMasterDepartments(currentCustomDepts);
        const { updatedEmployees, updatedDepartments } = processEmployeeDepartments(mergedEmployees, masterDepts);
        mergedEmployees = updatedEmployees;
        if (updatedDepartments.length > currentCustomDepts.length) {
          mergedSettings = { ...(mergedSettings || DEFAULT_SETTINGS), customDepartments: updatedDepartments };
          saveMasterDepartments(updatedDepartments);
        }

        if (forceBootstrap) {
          // On bootstrap, merge local state (including any edits/changes) with server data,
          // then synchronize the merged results back to the central server so edits are never lost on container reboots.
          mergedViolations = smartMerge(localViolations, data.violations || []);
          mergedRewards = smartMerge(localRewards, data.rewards || []);
          mergedEmployees = smartMergeEmployees(localEmployees, data.employees || []);
          mergedUsers = smartMerge(localUsers, data.users || []);
          mergedViolationCodes = smartMerge(localViolationCodes, data.violationCodes || []);
          mergedRewardCodes = smartMerge(localRewardCodes, data.rewardCodes || []);
          mergedSettings = localSettings || data.settings || DEFAULT_SETTINGS;

          console.log('Synchronizing bootstrapped local & server data...', {
            employeesCount: mergedEmployees.length,
            violationsCount: mergedViolations.length
          });
          
          await syncCentralData({
            violations: mergedViolations,
            rewards: mergedRewards,
            users: mergedUsers,
            employees: mergedEmployees,
            violationCodes: mergedViolationCodes,
            rewardCodes: mergedRewardCodes,
            settings: mergedSettings
          });
        } else {
          // On normal subsequent updates, treat server as the source of truth
          mergedViolations = data.violations || [];
          mergedRewards = data.rewards || [];
          mergedEmployees = data.employees || [];
          mergedUsers = data.users || [];
          mergedViolationCodes = data.violationCodes || [];
          mergedRewardCodes = data.rewardCodes || [];
          mergedSettings = data.settings || localSettings;
        }

        const { violationCodes: finalVC, rewardCodes: finalRC } = ensureAllCodes(
          mergedViolations,
          mergedRewards,
          mergedViolationCodes,
          mergedRewardCodes
        );
        mergedViolationCodes = finalVC;
        mergedRewardCodes = finalRC;

        setSyncStatus('synced');
        
        // Prevent state update and re-renders if the data hasn't actually changed
        setViolations(prev => JSON.stringify(prev) === JSON.stringify(mergedViolations) ? prev : mergedViolations);
        setRewards(prev => JSON.stringify(prev) === JSON.stringify(mergedRewards) ? prev : mergedRewards);
        if (mergedUsers.length > 0) {
          setUsers(prev => JSON.stringify(prev) === JSON.stringify(mergedUsers) ? prev : mergedUsers);
        }
        setEmployees(prev => JSON.stringify(prev) === JSON.stringify(mergedEmployees) ? prev : mergedEmployees);
        setViolationCodes(prev => JSON.stringify(prev) === JSON.stringify(mergedViolationCodes) ? prev : mergedViolationCodes);
        setRewardCodes(prev => JSON.stringify(prev) === JSON.stringify(mergedRewardCodes) ? prev : mergedRewardCodes);
        try {
          localStorage.setItem('sg_violationCodes', JSON.stringify(mergedViolationCodes));
          localStorage.setItem('sg_rewardCodes', JSON.stringify(mergedRewardCodes));
        } catch {}
        if (mergedSettings) {
          if (!mergedSettings.companyLogo || mergedSettings.companyLogo === '/icon.png' || mergedSettings.companyLogo.includes('app_icon') || mergedSettings.companyLogo.startsWith('.')) {
            mergedSettings = { ...mergedSettings, companyLogo: DEFAULT_COMPANY_LOGO };
          }
          setSettings(prev => JSON.stringify(prev) === JSON.stringify(mergedSettings) ? prev : mergedSettings);
        }

        const now = new Date().toLocaleTimeString();
        setLastSyncTime(now);
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error('Error during data pull/merge:', err);
      setSyncStatus('error');
    }
  }, []);

  useEffect(() => {
    // Immediate local cache hydration
    const savedUsers = localStorage.getItem('sg_users');
    if (savedUsers) {
      try {
        const parsed = JSON.parse(savedUsers);
        const hasLegacyUsers = Array.isArray(parsed) && parsed.some(u => u.username === 'dev' || u.password === '123' || u.id === 'u8');
        if (hasLegacyUsers) {
          console.warn('Legacy system users detected. Upgrading local database with new secure default credentials...');
          localStorage.setItem('sg_users', JSON.stringify(DEFAULT_USERS));
          setUsers(DEFAULT_USERS);
        } else {
          setUsers(parsed);
        }
      } catch (err) {
        setUsers(DEFAULT_USERS);
      }
    } else {
      setUsers(DEFAULT_USERS);
    }
    const savedSettings = localStorage.getItem('sg_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (!parsed.companyLogo || parsed.companyLogo === '/icon.png' || parsed.companyLogo.includes('app_icon') || parsed.companyLogo.startsWith('.')) {
        parsed.companyLogo = DEFAULT_COMPANY_LOGO;
      }
      setSettings(parsed);
    }
    const savedEmployees = localStorage.getItem('sg_employees');
    if (savedEmployees) setEmployees(JSON.parse(savedEmployees));
    const savedLastSync = localStorage.getItem('sg_lastSync');
    if (savedLastSync) setLastSyncTime(savedLastSync);
    
    const savedViolations = localStorage.getItem('sg_violations');
    if (savedViolations) setViolations(JSON.parse(savedViolations));
    const savedRewards = localStorage.getItem('sg_rewards');
    if (savedRewards) setRewards(JSON.parse(savedRewards));
    
    const savedVCodes = localStorage.getItem('sg_violationCodes');
    if (savedVCodes) setViolationCodes(JSON.parse(savedVCodes));
    const savedRCodes = localStorage.getItem('sg_rewardCodes');
    if (savedRCodes) setRewardCodes(JSON.parse(savedRCodes));
    
    // Connect to central network server immediately on boot
    pullDataFromServerState(true);

    window.addEventListener('online', () => setIsOnline(true));
    window.addEventListener('offline', () => setIsOnline(false));

    // Listen for storage changes across windows
    const handleStorageChange = () => {
        const u = localStorage.getItem('sg_users');
        if(u) setUsers(JSON.parse(u));
        const v = localStorage.getItem('sg_violations');
        if(v) setViolations(JSON.parse(v));
        const r = localStorage.getItem('sg_rewards');
        if(r) setRewards(JSON.parse(r));
        const e = localStorage.getItem('sg_employees');
        if(e) setEmployees(JSON.parse(e));
        const vc = localStorage.getItem('sg_violationCodes');
        if(vc) setViolationCodes(JSON.parse(vc));
        const rc = localStorage.getItem('sg_rewardCodes');
        if(rc) setRewardCodes(JSON.parse(rc));
        const s = localStorage.getItem('sg_settings');
        if(s) {
            const parsed = JSON.parse(s);
            if (!parsed.companyLogo || parsed.companyLogo === '/icon.png' || parsed.companyLogo.includes('app_icon') || parsed.companyLogo.startsWith('.')) {
                parsed.companyLogo = DEFAULT_COMPANY_LOGO;
            }
            setSettings(parsed);
        }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [pullDataFromServerState]);

  // -------------------------------------------------------------
  // Real-time Event Stream (SSE): Instant network synchronization
  // When any workstation (HSE, HR, Guard, Admin) registers a record,
  // the server broadcasts it immediately and all other nodes see it instantly.
  // -------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = subscribeToLiveEvents(
      (event: LiveDbEvent) => {
        if (event.type === 'DB_UPDATE' && event.data) {
          const incoming = event.data;
          console.log('[Live Network Update]', event.summary);

          if (incoming.violations) {
            setViolations(prev => JSON.stringify(prev) === JSON.stringify(incoming.violations) ? prev : incoming.violations);
            try { localStorage.setItem('sg_violations', JSON.stringify(incoming.violations)); } catch {}
          }
          if (incoming.rewards) {
            setRewards(prev => JSON.stringify(prev) === JSON.stringify(incoming.rewards) ? prev : incoming.rewards);
            try { localStorage.setItem('sg_rewards', JSON.stringify(incoming.rewards)); } catch {}
          }
          if (incoming.employees) {
            setEmployees(prev => JSON.stringify(prev) === JSON.stringify(incoming.employees) ? prev : incoming.employees);
            try { localStorage.setItem('sg_employees', JSON.stringify(incoming.employees)); } catch {}
          }
          if (incoming.users && incoming.users.length > 0) {
            setUsers(prev => JSON.stringify(prev) === JSON.stringify(incoming.users) ? prev : incoming.users);
            try { localStorage.setItem('sg_users', JSON.stringify(incoming.users)); } catch {}
          }
          if (incoming.violationCodes) {
            setViolationCodes(prev => JSON.stringify(prev) === JSON.stringify(incoming.violationCodes) ? prev : incoming.violationCodes);
            try { localStorage.setItem('sg_violationCodes', JSON.stringify(incoming.violationCodes)); } catch {}
          }
          if (incoming.rewardCodes) {
            setRewardCodes(prev => JSON.stringify(prev) === JSON.stringify(incoming.rewardCodes) ? prev : incoming.rewardCodes);
            try { localStorage.setItem('sg_rewardCodes', JSON.stringify(incoming.rewardCodes)); } catch {}
          }
          if (incoming.settings) {
            setSettings(prev => JSON.stringify(prev) === JSON.stringify(incoming.settings) ? prev : incoming.settings);
            try { localStorage.setItem('sg_settings', JSON.stringify(incoming.settings)); } catch {}
          }

          setSyncStatus('synced');
          setIsOnline(true);
          const now = new Date().toLocaleTimeString();
          setLastSyncTime(now);

          // Trigger live notification toast
          setLiveToast({
            id: Date.now(),
            message: event.summary || 'بروزرسانی جدید در شبکه سازمانی دریافت شد',
            subtext: `دریافت در لحظه: ${now}`
          });
        }
      },
      (status) => {
        setLiveSyncStatus(status);
        if (status === 'connected') {
          setIsOnline(true);
          setSyncStatus('synced');
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-dismiss live toast after 5 seconds
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => {
      setLiveToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [liveToast]);

  // Periodic polling fallback (every 5 seconds) to ensure 100% data consistency even if SSE reconnections occur
  useEffect(() => {
    const interval = setInterval(() => {
      pullDataFromServerState(false);
    }, 5000);
    return () => clearInterval(interval);
  }, [pullDataFromServerState]);

  // Synchronize immediately on login, logout, or switching roles to avoid stale cache or delayed visibility
  useEffect(() => {
    pullDataFromServerState(false);
  }, [user, pullDataFromServerState]);

  // Sync to local storage
  useEffect(() => { localStorage.setItem('sg_violations', JSON.stringify(violations)); }, [violations]);
  useEffect(() => { localStorage.setItem('sg_rewards', JSON.stringify(rewards)); }, [rewards]);
  useEffect(() => { localStorage.setItem('sg_employees', JSON.stringify(employees)); }, [employees]);
  useEffect(() => { localStorage.setItem('sg_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('sg_violationCodes', JSON.stringify(violationCodes)); }, [violationCodes]);
  useEffect(() => { localStorage.setItem('sg_rewardCodes', JSON.stringify(rewardCodes)); }, [rewardCodes]);
  useEffect(() => { localStorage.setItem('sg_settings', JSON.stringify(settings)); }, [settings]);

  // Automated snapshot local backup helper
  const triggerAutoBackup = useCallback((
    v: Violation[],
    r: Reward[],
    u: User[],
    e: Employee[],
    vc: CodeItem[],
    rc: CodeItem[],
    s: AppSettings
  ) => {
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        violations: v,
        rewards: r,
        users: u,
        employees: e,
        violationCodes: vc,
        rewardCodes: rc,
        settings: s
      };

      const raw = localStorage.getItem('sg_auto_backups');
      let backups: any[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            backups = parsed;
          }
        } catch {}
      }

      // Prepend so index 0 is always newest
      backups.unshift(snapshot);

      // Keep maximum 10 auto-saved snapshot copies
      if (backups.length > 10) {
        backups = backups.slice(0, 10);
      }

      localStorage.setItem('sg_auto_backups', JSON.stringify(backups));
    } catch (err) {
      console.error('[AutoBackup] Failed to save automatic snapshot:', err);
    }
  }, []);

  // Debounced auto backup on central database state changes
  useEffect(() => {
    // Avoid backing up completely empty state on initial boot
    if (violations.length === 0 && rewards.length === 0 && employees.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      console.log('[AutoBackup] State changes stabilized. Creating database snapshot...');
      triggerAutoBackup(violations, rewards, users, employees, violationCodes, rewardCodes, settings);
    }, 3000); // 3 seconds stability debounce
    return () => clearTimeout(timer);
  }, [violations, rewards, users, employees, violationCodes, rewardCodes, settings, triggerAutoBackup]);

  const handleRestoreFullBackup = (bak: any) => {
    if (bak.violations) {
      setViolations(bak.violations);
      localStorage.setItem('sg_violations', JSON.stringify(bak.violations));
    }
    if (bak.rewards) {
      setRewards(bak.rewards);
      localStorage.setItem('sg_rewards', JSON.stringify(bak.rewards));
    }
    if (bak.users) {
      setUsers(bak.users);
      localStorage.setItem('sg_users', JSON.stringify(bak.users));
      if (user) {
        const matching = bak.users.find((u: any) => u.username === user.username);
        if (matching) setUser(matching);
      }
    }
    if (bak.employees) {
      setEmployees(bak.employees);
      localStorage.setItem('sg_employees', JSON.stringify(bak.employees));
    }
    if (bak.violationCodes) {
      setViolationCodes(bak.violationCodes);
      localStorage.setItem('sg_violationCodes', JSON.stringify(bak.violationCodes));
    }
    if (bak.rewardCodes) {
      setRewardCodes(bak.rewardCodes);
      localStorage.setItem('sg_rewardCodes', JSON.stringify(bak.rewardCodes));
    }
    if (bak.settings) {
      setSettings(bak.settings);
      localStorage.setItem('sg_settings', JSON.stringify(bak.settings));
    }
    // Update live central database to synchronize network nodes
    pushDataToServerState(
      bak.violations,
      bak.rewards,
      bak.users,
      bak.employees,
      bak.violationCodes,
      bak.rewardCodes,
      bak.settings
    );
  };

  const handleOfflineMergeSuccess = (
    mergedViolations: Violation[], 
    mergedRewards: Reward[], 
    mergedEmployees: Employee[],
    mergedUsers?: User[],
    mergedViolationCodes?: CodeItem[],
    mergedRewardCodes?: CodeItem[],
    mergedSettings?: AppSettings
  ) => {
    setViolations(mergedViolations);
    setRewards(mergedRewards);
    setEmployees(mergedEmployees);
    if (mergedUsers && mergedUsers.length > 0) {
      setUsers(mergedUsers);
      localStorage.setItem('sg_users', JSON.stringify(mergedUsers));
    }
    if (mergedViolationCodes && mergedViolationCodes.length > 0) {
      setViolationCodes(mergedViolationCodes);
      localStorage.setItem('sg_violationCodes', JSON.stringify(mergedViolationCodes));
    }
    if (mergedRewardCodes && mergedRewardCodes.length > 0) {
      setRewardCodes(mergedRewardCodes);
      localStorage.setItem('sg_rewardCodes', JSON.stringify(mergedRewardCodes));
    }
    if (mergedSettings) {
      setSettings(mergedSettings);
      localStorage.setItem('sg_settings', JSON.stringify(mergedSettings));
    }
    pushDataToServerState(
      mergedViolations,
      mergedRewards,
      mergedUsers || users,
      mergedEmployees,
      mergedViolationCodes || violationCodes,
      mergedRewardCodes || rewardCodes,
      mergedSettings || settings
    );
  };

  const handleUpdatePassword = (newPass: string) => {
    if (!user) return;
    const updatedLoggedInUser = { ...user, password: newPass };
    setUser(updatedLoggedInUser);

    const updatedUsersList = users.map(u => u.username === user.username ? { ...u, password: newPass } : u);
    setUsers(updatedUsersList);
    localStorage.setItem('sg_users', JSON.stringify(updatedUsersList));

    pushDataToServerState(violations, rewards, updatedUsersList, employees, violationCodes, rewardCodes, settings);
  };

  const handleLogin = async (u: string, p: string) => {
    const cleanU = u.trim().toLowerCase();
    let currentUsers = users;
    let foundUser = currentUsers.find(user => user.username.trim().toLowerCase() === cleanU && user.password === p);

    // If not found in current memory state, perform live server fetch
    if (!foundUser) {
      try {
        const freshData = await fetchCentralData();
        const serverUsers: User[] = freshData?.users || [];

        if (serverUsers.length > 0) {
          currentUsers = serverUsers;
          setUsers(currentUsers);
          localStorage.setItem('sg_users', JSON.stringify(currentUsers));
          foundUser = currentUsers.find(user => user.username.trim().toLowerCase() === cleanU && user.password === p);
        }
      } catch (err) {
        console.warn('[Login] Live server sync attempt error:', err);
      }
    }

    if (foundUser) {
      setUser(foundUser);
      setLoginError('');
    } else {
      setLoginError(settings.language === 'fa' ? 'نام کاربری یا رمز عبور اشتباه است.' : 'Invalid username or password');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('VIOLATIONS');
    setSystemMode('VIOLATION');
  };

  const handleUpdateAvatar = (newAvatar: string) => {
    if (!user) return;
    const updatedUser = { ...user, avatar: newAvatar };
    setUser(updatedUser);
    const updatedUsersList = users.map(u => u.username === user.username ? updatedUser : u);
    setUsers(updatedUsersList);
    localStorage.setItem('sg_users', JSON.stringify(updatedUsersList));
    pushDataToServerState(violations, rewards, updatedUsersList, employees, violationCodes, rewardCodes, settings);
  };

  const updateEmployees = (newEmployees: Employee[]) => {
      setEmployees(newEmployees);
      localStorage.setItem('sg_employees', JSON.stringify(newEmployees));
      pushDataToServerState(violations, rewards, users, newEmployees, violationCodes, rewardCodes, settings);
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    // 1. Update employees list
    const updatedEmployeesList = employees.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp);
    updateEmployees(updatedEmployeesList);

    // 2. Cascade changes to violations and rewards
    const oldEmp = employees.find(emp => emp.id === updatedEmp.id);
    if (oldEmp) {
      let violationsChanged = false;
      let rewardsChanged = false;
      
      const oldPersonnelId = oldEmp.personnelId;
      const newPersonnelId = updatedEmp.personnelId;
      const newFullName = updatedEmp.fullName;
      const newDepartment = updatedEmp.department;

      const updatedViolations = violations.map(v => {
        if (v.personnelId === oldPersonnelId) {
          violationsChanged = true;
          return {
            ...v,
            personnelId: newPersonnelId,
            employeeName: newFullName,
            department: newDepartment
          };
        }
        return v;
      });

      const updatedRewards = rewards.map(r => {
        if (r.personnelId === oldPersonnelId) {
          rewardsChanged = true;
          return {
            ...r,
            personnelId: newPersonnelId,
            employeeName: newFullName,
            department: newDepartment
          };
        }
        return r;
      });

      if (violationsChanged) {
        setViolations(updatedViolations);
        localStorage.setItem('sg_violations', JSON.stringify(updatedViolations));
      }
      if (rewardsChanged) {
        setRewards(updatedRewards);
        localStorage.setItem('sg_rewards', JSON.stringify(updatedRewards));
      }

      // Sync with central database if any items changed
      if (violationsChanged || rewardsChanged) {
        pushDataToServerState(
          updatedViolations,
          updatedRewards,
          users,
          updatedEmployeesList,
          violationCodes,
          rewardCodes,
          settings
        );
      }
    }
  };

  const handleTransferPersonnel = (employeeIds: string[], targetBinderKey: string) => {
    if (!employeeIds || employeeIds.length === 0) return;

    let customDeptsChanged = false;
    let newCustomDepts = settings.customDepartments || [];

    if (personnelGroupCriteria === 'DEPARTMENT' || personnelGroupCriteria === 'SAFETY_STATUS') {
      const { updatedCustomDepts, isNew } = ensureDepartmentExists(targetBinderKey, newCustomDepts);
      if (isNew) {
        newCustomDepts = updatedCustomDepts;
        customDeptsChanged = true;
      }
    }

    const updatedEmployeesList = employees.map(emp => {
      if (employeeIds.includes(emp.id)) {
        if (personnelGroupCriteria === 'DEPARTMENT') {
          return { ...emp, department: targetBinderKey };
        } else if (personnelGroupCriteria === 'JOB_TITLE') {
          return { ...emp, jobTitle: targetBinderKey };
        } else {
          return { ...emp, department: targetBinderKey };
        }
      }
      return emp;
    });

    let currentSettings = settings;
    if (customDeptsChanged) {
      currentSettings = { ...settings, customDepartments: newCustomDepts };
      setSettings(currentSettings);
      localStorage.setItem('sg_app_settings', JSON.stringify(currentSettings));
    }

    updateEmployees(updatedEmployeesList);

    const affectedPersonnelIds = updatedEmployeesList
      .filter(emp => employeeIds.includes(emp.id))
      .map(emp => emp.personnelId);

    let violationsChanged = false;
    let rewardsChanged = false;

    const updatedViolations = violations.map(v => {
      if (affectedPersonnelIds.includes(v.personnelId)) {
        violationsChanged = true;
        return { ...v, department: targetBinderKey };
      }
      return v;
    });

    const updatedRewards = rewards.map(r => {
      if (affectedPersonnelIds.includes(r.personnelId)) {
        rewardsChanged = true;
        return { ...r, department: targetBinderKey };
      }
      return r;
    });

    if (violationsChanged) {
      setViolations(updatedViolations);
      localStorage.setItem('sg_violations', JSON.stringify(updatedViolations));
    }
    if (rewardsChanged) {
      setRewards(updatedRewards);
      localStorage.setItem('sg_rewards', JSON.stringify(updatedRewards));
    }

    if (violationsChanged || rewardsChanged) {
      pushDataToServerState(
        updatedViolations,
        updatedRewards,
        users,
        updatedEmployeesList,
        violationCodes,
        rewardCodes,
        currentSettings
      );
    }

    alert(
      settings.language === 'fa'
        ? `تعداد ${employeeIds.length} نفر با موفقیت به زونکن «${targetBinderKey}» منتقل شدند.`
        : `${employeeIds.length} personnel successfully transferred to binder "${targetBinderKey}".`
    );
  };

  const handleUpdateSettings = (s: AppSettings) => {
    setSettings(s);
    pushDataToServerState(violations, rewards, users, employees, violationCodes, rewardCodes, s);
  };
  const handleUpdateUsers = (u: User[]) => {
    setUsers(u);
    pushDataToServerState(violations, rewards, u, employees, violationCodes, rewardCodes, settings);
  };
  const handleUpdateViolationCodes = (vc: CodeItem[]) => {
    setViolationCodes(vc);
    pushDataToServerState(violations, rewards, users, employees, vc, rewardCodes, settings);
  };
  const handleUpdateRewardCodes = (rc: CodeItem[]) => {
    setRewardCodes(rc);
    pushDataToServerState(violations, rewards, users, employees, violationCodes, rc, settings);
  };

  const t = TRANSLATIONS[settings.language];

  // --- PERMISSION & DEPARTMENT LOGIC ---
  const getUserDepartment = (): Department | 'ALL' => {
    if (!user) return 'HSE'; // Default fallback
    // Plant Manager, HR Manager, Developer, and Administrative Staff (ADMIN_STAFF) have full organization-wide visibility
    if (['PLANT_MANAGER', 'HR_MANAGER', 'DEVELOPER', 'ADMIN_STAFF'].includes(user.role)) return 'ALL';
    if (user.role === 'HSE_MANAGER' || user.role === 'HSE_OFFICER') return 'HSE';
    if (user.role === 'SECURITY_MANAGER' || user.role === 'SECURITY_GUARD') return 'SECURITY';
    if (user.role === 'TRAINING_MANAGER') return 'TRAINING';
    if (user.role === 'DEPARTMENT_MANAGER' && user.managedDepartment) return user.managedDepartment;
    return 'HSE';
  };

  const userDept = getUserDepartment();
  const canViewAll = userDept === 'ALL';
  const canApprove = [
    'HSE_MANAGER', 
    'PLANT_MANAGER', 
    'HR_MANAGER', 
    'DEVELOPER', 
    'ADMIN_STAFF', 
    'SECURITY_MANAGER', 
    'TRAINING_MANAGER'
  ].includes(user?.role || '');

  // Global Keyboard Shortcuts Event Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          (activeElement as HTMLElement).isContentEditable);

      // Escape key closes open modals
      if (e.key === 'Escape') {
        if (isShortcutsOpen) setIsShortcutsOpen(false);
        if (isModalOpen) setIsModalOpen(false);
        if (isRewardModalOpen) setIsRewardModalOpen(false);
        if (isLegendOpen) setIsLegendOpen(false);
        if (showMainSearchDropdown) setShowMainSearchDropdown(false);
        return;
      }

      // Ctrl + K or Cmd + K or Alt + S or '/' (when not typing in an input) -> Focus Search Input
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') ||
        (e.altKey && e.key.toLowerCase() === 's') ||
        (!isInputFocused && e.key === '/')
      ) {
        e.preventDefault();
        setCurrentViewPage('DASHBOARD');
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
            setShowMainSearchDropdown(true);
          }
        }, 50);
        return;
      }

      // Alt + V or Ctrl + Shift + V -> Open New Violation Modal
      if (
        (e.altKey && e.key.toLowerCase() === 'v') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'v')
      ) {
        e.preventDefault();
        setSystemMode('VIOLATION');
        setIsModalOpen(true);
        return;
      }

      // Alt + R or Ctrl + Shift + R -> Open New Reward Modal
      if (
        (e.altKey && e.key.toLowerCase() === 'r') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'r')
      ) {
        e.preventDefault();
        setSystemMode('REWARD');
        setIsRewardModalOpen(true);
        return;
      }

      // Alt + M -> Toggle system mode between VIOLATION and REWARD
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setSystemMode((prev) => (prev === 'VIOLATION' ? 'REWARD' : 'VIOLATION'));
        return;
      }

      // Alt + L -> Open Code Legend
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsLegendOpen(true);
        return;
      }

      // Alt + D or Ctrl + 1 -> Switch to Dashboard view
      if (
        (e.altKey && e.key.toLowerCase() === 'd') ||
        ((e.ctrlKey || e.metaKey) && e.key === '1')
      ) {
        e.preventDefault();
        setCurrentViewPage('DASHBOARD');
        return;
      }

      // Alt + P or Ctrl + 2 -> Switch to Personnel Directory
      if (
        (e.altKey && e.key.toLowerCase() === 'p') ||
        ((e.ctrlKey || e.metaKey) && e.key === '2')
      ) {
        e.preventDefault();
        setCurrentViewPage('PERSONNEL');
        return;
      }

      // Alt + I or Ctrl + 3 -> Switch to Manager Inbox
      if (
        (e.altKey && e.key.toLowerCase() === 'i') ||
        ((e.ctrlKey || e.metaKey) && e.key === '3')
      ) {
        if (canApprove) {
          e.preventDefault();
          setCurrentViewPage('INBOX');
        }
        return;
      }

      // Shift + ? or Alt + K -> Toggle Keyboard Shortcuts Modal
      if ((e.shiftKey && e.key === '?') || (e.altKey && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isShortcutsOpen,
    isModalOpen,
    isRewardModalOpen,
    isLegendOpen,
    showMainSearchDropdown,
    canApprove,
  ]);

  const getCanApproveItem = React.useCallback((item: Violation | Reward) => {
    if (!user) return false;
    const role = user.role;
    // Plant Manager, Developer and HR Manager have high-level organization-wide visibility and approval jurisdiction
    if (['PLANT_MANAGER', 'DEVELOPER', 'HR_MANAGER'].includes(role)) return true;
    
    if (item.departmentSource === 'HSE') {
      return role === 'HSE_MANAGER';
    }
    if (['ADMIN', 'HR'].includes(item.departmentSource)) {
      return role === 'HR_MANAGER' || role === 'ADMIN_STAFF';
    }
    if (item.departmentSource === 'SECURITY') {
      return role === 'SECURITY_MANAGER' || role === 'HR_MANAGER';
    }
    if (item.departmentSource === 'TRAINING') {
      return role === 'TRAINING_MANAGER' || role === 'HSE_MANAGER' || role === 'HR_MANAGER' || role === 'ADMIN_STAFF';
    }
    if (role === 'DEPARTMENT_MANAGER' && user.managedDepartment === item.departmentSource) {
      return true;
    }
    return false;
  }, [user]);

  const getCanDeleteItem = (item: Violation | Reward) => {
    if (!user) return false;
    const role = user.role;
    // Plant manager and developer can delete everything
    if (['PLANT_MANAGER', 'DEVELOPER'].includes(role)) return true;
    
    // HSE Manager can delete HSE and Training items
    if (role === 'HSE_MANAGER' && ['HSE', 'TRAINING'].includes(item.departmentSource)) return true;
    
    // HR Manager can delete admin, HR, security items
    if (role === 'HR_MANAGER' && ['ADMIN', 'HR', 'SECURITY'].includes(item.departmentSource)) return true;

    // Security Manager can delete security items
    if (role === 'SECURITY_MANAGER' && item.departmentSource === 'SECURITY') return true;

    // Training Manager can delete training items
    if (role === 'TRAINING_MANAGER' && item.departmentSource === 'TRAINING') return true;
    
    // Custom Department Manager can delete their own department's items
    if (role === 'DEPARTMENT_MANAGER' && user.managedDepartment === item.departmentSource) return true;

    return false;
  };

  // Filter Data based on Role/Department
  const filterData = React.useCallback(<T extends Violation | Reward>(data: T[]) => {
    return data.filter(item => {
      // 1. Department Source Role Filter
      const isMyDept = canViewAll || item.departmentSource === userDept;
      if (!isMyDept) return false;

      // 2. Department Dropdown Filter (Selected on main page)
      if (selectedDeptFilter !== 'ALL') {
        const itemDept = (item.department || '').trim();
        if (itemDept !== selectedDeptFilter) return false;
      }

      // 3. Case-insensitive Search Filter (Checks Name, ID, and Department)
      const term = searchTerm.toLowerCase().trim();
      if (term) {
        const matchesSearch = 
          item.employeeName.toLowerCase().includes(term) || 
          item.personnelId.toLowerCase().includes(term) ||
          (item.department && item.department.toLowerCase().includes(term));
        if (!matchesSearch) return false;
      }

      // 4. Status/Tab Filter
      if (activeTab === 'ARCHIVE') {
        if (!item.isArchived) return false;
      } else {
        if (item.isArchived) return false;
      }

      if (approvalStatusFilter === 'PENDING') {
        if (item.isApproved) return false;
        return getCanApproveItem(item) || (!!user && (item.reporterName === user.fullName || item.reporterName === user.username));
      }
      if (approvalStatusFilter === 'APPROVED') return !!item.isApproved;

      // Default (approvalStatusFilter === 'ALL'):
      // HR_MANAGER, PLANT_MANAGER, DEVELOPER, and ADMIN_STAFF have full instant visibility of all newly recorded items across all departments
      if (!item.isApproved) {
        const isAuthor = user && (item.reporterName === user.fullName || item.reporterName === user.username);
        const isManagerApprover = getCanApproveItem(item);
        const isSeniorManagement = ['HR_MANAGER', 'PLANT_MANAGER', 'DEVELOPER', 'ADMIN_STAFF'].includes(user?.role || '');
        if (!isAuthor && !isManagerApprover && !isSeniorManagement) {
          return false;
        }
      }

      return true;
    });
  }, [canViewAll, userDept, selectedDeptFilter, searchTerm, activeTab, approvalStatusFilter, user, getCanApproveItem]);

  // Memoized matched employees for main page search to allow opening empty profiles
  const matchedEmployeesForMainSearch = React.useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term && selectedDeptFilter === 'ALL') return [];

    return employees.filter(emp => {
      const matchesSearch = !term ||
        emp.fullName.toLowerCase().includes(term) ||
        emp.personnelId.toLowerCase().includes(term) ||
        emp.department.toLowerCase().includes(term);

      const matchesDept = selectedDeptFilter === 'ALL' || emp.department === selectedDeptFilter;

      return matchesSearch && matchesDept;
    });
  }, [searchTerm, selectedDeptFilter, employees]);

  const filteredViolations = React.useMemo(() => filterData(violations), [violations, filterData]);
  const filteredRewards = React.useMemo(() => filterData(rewards), [rewards, filterData]);

  const accessibleViolations = React.useMemo(() => {
    if (canViewAll) return violations;
    return violations.filter(v => v.departmentSource === userDept || v.department === userDept);
  }, [canViewAll, violations, userDept]);

  const accessibleRewards = React.useMemo(() => {
    if (canViewAll) return rewards;
    return rewards.filter(r => r.departmentSource === userDept || r.department === userDept);
  }, [canViewAll, rewards, userDept]);

  const itemsToDisplay = systemMode === 'VIOLATION' ? filteredViolations : filteredRewards;

  const sortedItems = [...itemsToDisplay].sort((a, b) => {
    if (sortField === 'NONE') return 0;
    
    if (sortField === 'SCORE') {
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return sortOrder === 'ASC' ? scoreA - scoreB : scoreB - scoreA;
    }
    
    if (sortField === 'DEPARTMENT') {
      const deptA = (a.department || '').toLowerCase();
      const deptB = (b.department || '').toLowerCase();
      return sortOrder === 'ASC' 
        ? deptA.localeCompare(deptB, settings.language === 'fa' ? 'fa' : 'en') 
        : deptB.localeCompare(deptA, settings.language === 'fa' ? 'fa' : 'en');
    }
    
    if (sortField === 'LAST_NAME') {
      const getLastName = (name: string) => {
        const parts = name.trim().split(/\s+/);
        return parts.length > 1 ? parts[parts.length - 1] : name;
      };
      const nameA = getLastName(a.employeeName).toLowerCase();
      const nameB = getLastName(b.employeeName).toLowerCase();
      return sortOrder === 'ASC' 
        ? nameA.localeCompare(nameB, settings.language === 'fa' ? 'fa' : 'en') 
        : nameB.localeCompare(nameA, settings.language === 'fa' ? 'fa' : 'en');
    }
    
    return 0;
  });

  const themeStyles = getTheme(settings.themeColor);

  const handleSync = async () => {
    await pullDataFromServerState(false);
  };

  const recordOfflineEntry = (dept: string) => {
    if (!dept) return;
    try {
      const saved = localStorage.getItem('sg_last_offline_import_dates');
      const dates = saved ? JSON.parse(saved) : {};
      dates[dept] = new Date().toISOString();
      localStorage.setItem('sg_last_offline_import_dates', JSON.stringify(dates));
    } catch (e) {
      console.error('Error recording offline entry date:', e);
    }
  };

  const handleAddViolation = (v: Violation) => {
    const updated = [v, ...violations];
    setViolations(updated);
    setIsModalOpen(false);
    pushDataToServerState(updated, rewards, users, employees, violationCodes, rewardCodes, settings);

    if (v.departmentSource) {
      recordOfflineEntry(v.departmentSource);
    }

    // Auto dispatch SMS notification to employee if auto-approved on creation
    if (v.isApproved) {
      const emp = employees.find(e => e.personnelId === v.personnelId);
      if (emp && emp.phoneNumber) {
        sendNotificationSms(emp.fullName, emp.phoneNumber, 'WARNING', v.date, v.reason)
          .catch(err => console.error('[SMS] Fail auto warning notification dispatch:', err));
      }
    }
  };
  const handleAddReward = (r: Reward) => {
    const updated = [r, ...rewards];
    setRewards(updated);
    setIsRewardModalOpen(false);
    pushDataToServerState(violations, updated, users, employees, violationCodes, rewardCodes, settings);

    if (r.departmentSource) {
      recordOfflineEntry(r.departmentSource);
    }

    // Auto dispatch SMS notification to employee if auto-approved on creation
    if (r.isApproved) {
      const emp = employees.find(e => e.personnelId === r.personnelId);
      if (emp && emp.phoneNumber) {
        sendNotificationSms(emp.fullName, emp.phoneNumber, 'REWARD', r.date, r.reason)
          .catch(err => console.error('[SMS] Fail auto reward notification dispatch:', err));
      }
    }
  };
  const handleDelete = () => {
      if (deleteModal.id) {
          const targetId = deleteModal.id;
          const item = deleteModal.type === 'VIOLATION'
               ? violations.find(v => v.id === targetId)
               : rewards.find(r => r.id === targetId);

          if (!item || !getCanDeleteItem(item)) {
              alert(settings.language === 'fa' 
                  ? 'خطای امنیتی: شما دسترسی لازم برای حذف این مورد ثبت شده را ندارید!' 
                  : 'Security Error: You do not have permission to delete this logged item.');
              return;
          }

          let updatedV = violations;
          let updatedR = rewards;
          if (deleteModal.type === 'VIOLATION') {
              updatedV = violations.filter(v => v.id !== targetId);
              setViolations(updatedV);
          } else {
              updatedR = rewards.filter(r => r.id !== targetId);
              setRewards(updatedR);
          }
          setDeleteModal({ isOpen: false, id: null, type: 'VIOLATION' });
          pushDataToServerState(updatedV, updatedR, users, employees, violationCodes, rewardCodes, settings);
      }
  };
  const handleApprove = (id: string, type: 'VIOLATION' | 'REWARD') => {
      let updatedV = violations;
      let updatedR = rewards;
      if (type === 'VIOLATION') {
          const item = violations.find(v => v.id === id);
          if (!item || !getCanApproveItem(item)) {
              alert(settings.language === 'fa' 
                  ? 'خطای امنیتی: شما دسترسی لازم برای تایید این مورد را ندارید!' 
                  : 'Security Error: You are not authorized to approve this item.');
              return;
          }
          updatedV = violations.map(v => v.id === id ? { ...v, isApproved: true } : v);
          setViolations(updatedV);

          // SMS dispatch on final approval
          const emp = employees.find(e => e.personnelId === item.personnelId);
          if (emp && emp.phoneNumber) {
              sendNotificationSms(emp.fullName, emp.phoneNumber, 'WARNING', item.date, item.reason)
                .catch(err => console.error('[SMS] Fail auto warning notification dispatch:', err));
          }
      } else {
          const item = rewards.find(r => r.id === id);
          if (!item || !getCanApproveItem(item)) {
              alert(settings.language === 'fa' 
                  ? 'خطای امنیتی: شما دسترسی لازم برای تایید این مورد را ندارید!' 
                  : 'Security Error: You are not authorized to approve this item.');
              return;
          }
          updatedR = rewards.map(r => r.id === id ? { ...r, isApproved: true } : r);
          setRewards(updatedR);

          // SMS dispatch on final approval
          const emp = employees.find(e => e.personnelId === item.personnelId);
          if (emp && emp.phoneNumber) {
              sendNotificationSms(emp.fullName, emp.phoneNumber, 'REWARD', item.date, item.reason)
                .catch(err => console.error('[SMS] Fail auto reward notification dispatch:', err));
          }
      }
      pushDataToServerState(updatedV, updatedR, users, employees, violationCodes, rewardCodes, settings);
  };
  const handlePickWorkerOfMonth = () => {
    setIsWorkerOfMonthOpen(true);
  };

  const handleExportCSV = () => {
    try {
      const dataToExport = systemMode === 'VIOLATION' ? violations : rewards;
      if (dataToExport.length === 0) {
        alert(settings.language === 'fa' ? "داده‌ای برای خروجی وجود ندارد" : "No records to export");
        return;
      }
      
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM
      if (systemMode === 'VIOLATION') {
        csvContent += "ID,Employee Name,Personnel ID,Department,Severity,Score,Date,Status,Approved\n";
        dataToExport.forEach((item: any) => {
          csvContent += `"${item.id}","${item.employeeName}","${item.personnelId}","${item.department}","${item.severity}",${item.score},"${item.date}","${item.status}",${item.isApproved || false}\n`;
        });
      } else {
        csvContent += "ID,Employee Name,Personnel ID,Department,Type,Score,Date,Approved\n";
        dataToExport.forEach((item: any) => {
          csvContent += `"${item.id}","${item.employeeName}","${item.personnelId}","${item.department}","${item.rewardType}",${item.score},"${item.date}",${item.isApproved || false}\n`;
        });
      }
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `HSE_${systemMode}_Export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("CSV export error", e);
    }
  };

  // Helper to map text to code label
  const getDisplayLabel = (code: number | string, type: 'VIOLATION' | 'REWARD', fallbackTitle?: string) => {
      const list = type === 'VIOLATION' ? violationCodes : rewardCodes;
      if (code !== undefined && code !== null) {
          const numCode = Number(code);
          const strCode = String(code).trim();
          let found = list.find(c => Number(c.code) === numCode || String(c.code).trim() === strCode);
          if (found) return found.label;
      }
      if (fallbackTitle && fallbackTitle.trim()) {
          const found = list.find(c => c.label.trim().toLowerCase() === fallbackTitle.trim().toLowerCase());
          if (found) return found.label;
          return fallbackTitle.trim();
      }
      if (code !== undefined && code !== null && String(code).trim() !== '') {
          return settings.language === 'fa' ? `کد ${code}` : `Code ${code}`;
      }
      return settings.language === 'fa' ? 'کد ناشناخته' : 'Unknown Code';
  };

  if (!user) return (
    <>
      <LoginPage 
        onLogin={handleLogin} 
        settings={settings} 
        error={loginError} 
        users={users}
        onUpdateUsers={handleUpdateUsers}
        onOpenDatacenter={() => setIsDatacenterOpen(true)}
        onOpenPostgres={() => setIsPostgresModalOpen(true)}
      />
      <PostgresArchitectureModal
        isOpen={isPostgresModalOpen}
        onClose={() => setIsPostgresModalOpen(false)}
      />
      <DatacenterModal
        isOpen={isDatacenterOpen}
        onClose={() => setIsDatacenterOpen(false)}
        isFa={settings.language === 'fa'}
        onOpenWizard={() => setIsInitialWizardOpen(true)}
      />
      <InitialSetupWizard
        isOpen={isInitialWizardOpen}
        onClose={() => setIsInitialWizardOpen(false)}
        isFa={settings.language === 'fa'}
        onComplete={() => {
          setCurrentDeploymentMode(getLocalDeploymentMode());
        }}
      />
    </>
  );

  return (
    <div className="min-h-screen pb-safe bg-gray-50 flex flex-col font-sans transition-all duration-300" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
           <div className="flex items-center gap-2 md:gap-3">
             <CompanyLogo 
               src={settings.companyLogo} 
               alt={settings.companyName}
               className="w-12 h-12 md:w-16 md:h-16 rounded-xl object-contain shadow-md hover:scale-105 transition-transform bg-white border border-gray-200/60 p-0.5" 
             />
             <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm md:text-lg font-black text-gray-800 leading-tight">{settings.companyName}</h1>
                  <button
                    onClick={() => setIsChangelogOpen(true)}
                    className="px-1.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-[9px] md:text-[10px] text-indigo-700 font-mono font-bold cursor-pointer transition-all active:scale-95 shrink-0"
                    title={settings.language === 'fa' ? 'نمایش آخرین تغییرات آپدیت' : 'Show latest update changelog'}
                  >
                    v{APP_VERSION}
                  </button>
                </div>
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider">{userDept === 'ALL' ? 'General Management' : `${userDept} Department`}</p>
             </div>
           </div>
           
           <div className="flex items-center gap-2 md:gap-3">

             <button 
                type="button"
                onClick={() => setIsShortcutsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95 shrink-0 cursor-pointer"
                title={settings.language === 'fa' ? 'راهنمای کلیدهای میانبر (Shift + ?)' : 'Keyboard Shortcuts Guide (Shift + ?)'}
              >
                <Keyboard className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">
                  {settings.language === 'fa' ? 'میانبرها' : 'Shortcuts'}
                </span>
                <kbd className="hidden lg:inline-block px-1.5 py-0.2 text-[9px] font-mono bg-white border border-slate-300 rounded text-slate-600">
                  Shift + ?
                </kbd>
              </button>

              <button 
                type="button"
                onClick={() => setIsDatacenterOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-linear-to-r from-slate-900 to-indigo-950 border border-indigo-500/40 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:border-indigo-400 active:scale-95 shrink-0 cursor-pointer"
                title={settings.language === 'fa' ? 'مدیریت مرکز داده، پورت شبکه فایروال و تفکیک سرور/کلاینت' : 'Datacenter, Network Firewall & Server/Client Setup'}
              >
                <Server className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span className="hidden sm:inline">
                  {settings.language === 'fa' ? 'مرکز داده' : 'Datacenter'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </button>

              <button 
                type="button"
                onClick={() => setIsPostgresModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-linear-to-r from-blue-900 to-indigo-900 border border-blue-400/40 text-white text-xs font-bold transition-all shadow-xs hover:shadow-md hover:border-blue-300 active:scale-95 shrink-0 cursor-pointer"
                title={settings.language === 'fa' ? 'مدیریت سرور مجزا، کلاینت و پایگاه داده PostgreSQL' : 'Server, Client & PostgreSQL Database Management'}
              >
                <Database className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
                <span className="hidden sm:inline">
                  {settings.language === 'fa' ? 'پایگاه داده PostgreSQL' : 'PostgreSQL DB'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </button>

             <button 
                type="button"
                onClick={() => setIsOfflineSyncOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 text-xs font-black transition-all shadow-xs active:scale-95 shrink-0"
                title={settings.language === 'fa' ? 'تبادل آفلاین داده‌ها (فلش/ایمیل)' : 'Offline Exchange (USB/Email)'}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 animate-pulse text-indigo-600" />
                <span className="hidden md:inline">
                  {settings.language === 'fa' ? 'تبادل آفلاین داده‌ها' : 'Offline Exchange'}
                </span>
              </button>

             <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-full border border-gray-200">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${themeStyles.bg}`}>{user.username.charAt(0).toUpperCase()}</div>
                <button onClick={() => setIsChangePasswordOpen(true)} className="p-1.5 rounded-full hover:bg-white text-amber-600 transition-colors" title={settings.language === 'fa' ? 'تغییر رمز عبور کاربر' : 'Change Password'}><Key className="w-4 h-4" /></button>
                 <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded-full hover:bg-white text-gray-500 transition-colors"><Settings className="w-4 h-4" /></button>
                <button onClick={handleLogout} className="p-1.5 rounded-full hover:bg-white text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
             </div>
           </div>
        </div>
      </header>

       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 flex-grow w-full space-y-6 font-sans print:hidden">
         {/* Welcome & Session Profile Banner */}
         {user && (
           <div className="bg-gradient-to-r from-indigo-900 to-slate-800 text-white rounded-3xl p-5 md:p-6 shadow-md border border-indigo-950 flex flex-col md:flex-row items-center justify-between gap-5 transition-all relative overflow-hidden" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
             {/* Abstract background graphics */}
             <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500 rounded-full opacity-10 blur-xl"></div>
             <div className="absolute -left-10 -top-10 w-32 h-32 bg-sky-500 rounded-full opacity-10 blur-xl"></div>
             
             <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 w-full md:w-auto text-center sm:text-right">
               {/* Clickable Profile Photo */}
               <div className="relative group shrink-0">
                 <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-indigo-950/80 border-2 border-indigo-400/50 p-1 shadow-inner flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-indigo-300">
                   {user.avatar ? (
                     <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                   ) : (
                     <div className="w-full h-full bg-linear-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center rounded-xl font-bold text-2xl md:text-3xl shadow-sm">
                       {user.fullName.charAt(0)}
                     </div>
                   )}
                 </div>
                 <button 
                   onClick={() => setIsEditAvatarOpen(true)}
                   className="absolute -bottom-1.5 -right-1.5 bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded-lg border border-indigo-700/50 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] font-bold flex items-center justify-center"
                   title={settings.language === 'fa' ? 'تغییر عکس پروفایل' : 'Change Profile Photo'}
                 >
                   <Camera className="w-3.5 h-3.5" />
                 </button>
               </div>
               
               <div className="space-y-1.5">
                 <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                   <h2 className="text-lg md:text-2xl font-black tracking-tight">{settings.language === 'fa' ? 'خوش آمدید،' : 'Welcome,'} {user.fullName}</h2>
                   <span className="bg-indigo-500/35 border border-indigo-400/30 text-[10px] md:text-xs font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                     <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                     {settings.language === 'fa' ? 'فعال در سامانه' : 'Active Session'}
                   </span>
                 </div>
                 
                 <p className="text-xs md:text-sm text-indigo-200 font-medium leading-relaxed flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1">
                   <span>
                     <strong className="text-white">{settings.language === 'fa' ? 'سمت سازمانی:' : 'Job Title:'}</strong>{' '}
                     {(TRANSLATIONS as any)[settings.language][`role_${user.role.toLowerCase()}`] || user.role}
                   </span>
                   <span className="text-indigo-400 hidden sm:inline">•</span>
                   <span>
                     <strong className="text-white">{settings.language === 'fa' ? 'سطح دسترسی:' : 'Access Level:'}</strong>{' '}
                     {user.role === 'DEVELOPER' ? (settings.language === 'fa' ? 'مدیریت کل سیستم (دولوپر)' : 'Full System Control (Developer)') : 
                      user.role === 'PLANT_MANAGER' ? (settings.language === 'fa' ? 'مدیریت ارشد کارخانه' : 'Plant Senior Management') : 
                      user.role === 'HR_MANAGER' ? (settings.language === 'fa' ? 'مدیریت منابع انسانی' : 'HR Management') : 
                      (settings.language === 'fa' ? `پایش و ثبت اختصاصی واحد ${userDept}` : `Departmental Node: ${userDept}`)}
                   </span>
                 </p>
               </div>
             </div>
             
             {/* Quick Actions inside Profile Banner */}
             <div className="flex flex-wrap items-center justify-center gap-2.5 w-full md:w-auto relative z-10 border-t border-indigo-800/50 pt-3 md:pt-0 md:border-0">
               <button
                 onClick={() => setIsEditAvatarOpen(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800/40 hover:bg-indigo-800/60 text-indigo-100 hover:text-white border border-indigo-700/40 text-xs font-bold transition-all active:scale-95"
               >
                 <Camera className="w-3.5 h-3.5" />
                 <span>{settings.language === 'fa' ? 'تغییر عکس' : 'Change Avatar'}</span>
               </button>
               <button
                 onClick={() => setIsChangePasswordOpen(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800/40 hover:bg-indigo-800/60 text-indigo-100 hover:text-white border border-indigo-700/40 text-xs font-bold transition-all active:scale-95"
               >
                 <Key className="w-3.5 h-3.5" />
                 <span>{settings.language === 'fa' ? 'تغییر رمز عبور' : 'Change Password'}</span>
               </button>
               <button
                 onClick={handleLogout}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-red-100 border border-red-500/30 text-xs font-bold transition-all active:scale-95"
               >
                 <LogOut className="w-3.5 h-3.5" />
                 <span>{settings.language === 'fa' ? 'خروج' : 'Logout'}</span>
               </button>
               <button
                 onClick={() => setIsSettingsOpen(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-800/40 hover:bg-indigo-800/60 text-indigo-100 hover:text-white border border-indigo-700/40 text-xs font-bold transition-all active:scale-95"
                 title={settings.language === 'fa' ? 'تنظیمات سیستم' : 'System Settings'}
               >
                 <Settings className="w-3.5 h-3.5" />
                 <span>{settings.language === 'fa' ? 'تنظیمات' : 'Settings'}</span>
               </button>
             </div>
           </div>
         )}

         {/* Main App Page Navigation Tabs */}
          <div className="flex border-b border-gray-200 gap-1.5 md:gap-4 mb-2 print:hidden overflow-x-auto no-scrollbar pb-1" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
            <button
              onClick={() => setCurrentViewPage('DASHBOARD')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs md:text-sm transition-all whitespace-nowrap active:scale-95 ${
                currentViewPage === 'DASHBOARD'
                  ? 'border-indigo-600 text-indigo-700 font-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{settings.language === 'fa' ? 'پیشخوان تخلفات و تشویق‌ها' : 'Compliance Dashboard'}</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 border border-gray-200 text-gray-500 rounded font-normal">
                Alt+D
              </kbd>
            </button>

            <button
              onClick={() => setCurrentViewPage('PERSONNEL')}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs md:text-sm transition-all whitespace-nowrap active:scale-95 ${
                currentViewPage === 'PERSONNEL'
                  ? 'border-indigo-600 text-indigo-700 font-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>{settings.language === 'fa' ? 'پایگاه پرونده‌های پرسنلی' : 'Personnel Directory'}</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 border border-gray-200 text-gray-500 rounded font-normal">
                Alt+P
              </kbd>
            </button>

            {canApprove && (
              <button
                onClick={() => setCurrentViewPage('INBOX')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold text-xs md:text-sm transition-all whitespace-nowrap relative active:scale-95 ${
                  currentViewPage === 'INBOX'
                    ? 'border-indigo-600 text-indigo-700 font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Inbox className="w-4 h-4" />
                <span>{settings.language === 'fa' ? 'صندوق ورودی مدیریت' : 'Manager Inbox'}</span>
                <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-gray-100 border border-gray-200 text-gray-500 rounded font-normal">
                  Alt+I
                </kbd>
                {/* Show badge for total pending approval cases that the current user can approve */}
                {(() => {
                  const pendingViolations = violations.filter(v => !v.isApproved && getCanApproveItem(v));
                  const pendingRewards = rewards.filter(r => !r.isApproved && getCanApproveItem(r));
                  const totalPendingCount = pendingViolations.length + pendingRewards.length;
                  if (totalPendingCount > 0) {
                    return (
                      <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold leading-none text-white bg-red-600 rounded-full animate-bounce mr-1.5 ml-1.5">
                        {totalPendingCount}
                      </span>
                    );
                  }
                  return null;
                })()}
              </button>
            )}
          </div>

          {currentViewPage === 'DASHBOARD' && (
            <>
              {/* Dynamic Mode Segment Directory - Fresh, Premium & Distinctive */}
        <div className="p-1.5 rounded-2xl bg-white border border-gray-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
          {/* Card 1 Switch: Safety Violations Portal */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setSystemMode('VIOLATION')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSystemMode('VIOLATION');
              }
            }}
            className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 outline-none cursor-pointer ${
              systemMode === 'VIOLATION' 
                ? 'bg-red-50/70 text-red-605 border border-red-200/50 shadow-xs ring-2 ring-red-500/10' 
                : 'hover:bg-gray-50 text-gray-500 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg transition-all ${
                systemMode === 'VIOLATION' ? 'bg-red-600 text-white shadow-sm scale-105' : 'bg-gray-100/80 text-gray-400'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="block font-black text-xs md:text-sm text-gray-800">
                  {settings.language === 'fa' ? 'سامانه ثبت و گزارش تخلفات' : 'Violations Center'}
                </span>
                <span className="block text-[10px] md:text-xs text-gray-500 font-medium">
                  {violations.filter(v => !v.isArchived).length}{' '}
                  {settings.language === 'fa' ? 'مورد فعال در سیستم' : 'Active cases logged'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {systemMode === 'VIOLATION' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-red-600 text-white shadow-xs animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  {settings.language === 'fa' ? 'در حال پایش' : 'Active View'}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold bg-gray-100 text-gray-400">
                  {settings.language === 'fa' ? 'انتخاب جهت پایش' : 'View'}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors flex items-center justify-center shadow-xs active:scale-95"
                title={settings.language === 'fa' ? 'ثبت سریع تخلف جدید' : 'Quick Register Violation'}
              >
                <Plus className="w-3.5 h-3.5 font-bold" />
              </button>
            </div>
          </div>

          {/* Card 2 Switch: HSE Positive Rewards Portal */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => setSystemMode('REWARD')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSystemMode('REWARD');
              }
            }}
            className={`flex items-center justify-between p-3.5 rounded-xl transition-all duration-300 outline-none cursor-pointer ${
              systemMode === 'REWARD' 
                ? `${themeStyles.accentBg} text-gray-800 border ${themeStyles.borderLight} shadow-xs ring-2 ${themeStyles.ring}/10` 
                : 'hover:bg-gray-50 text-gray-500 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg transition-all ${
                systemMode === 'REWARD' ? `${themeStyles.bg} text-white shadow-sm scale-105` : 'bg-gray-100/80 text-gray-400'
              }`}>
                <Medal className="w-5 h-5" />
              </div>
              <div className="text-right">
                <span className="block font-black text-xs md:text-sm text-gray-800">
                  {settings.language === 'fa' ? 'سامانه تشویقی و امتیازهای مثبت پرسنل' : 'Personnel Rewards & Points'}
                </span>
                <span className="block text-[10px] md:text-xs text-gray-500 font-medium">
                  {rewards.filter(r => !r.isArchived).length}{' '}
                  {settings.language === 'fa' ? 'مورد تشویقی ثبت شده' : 'Active rewards logged'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {systemMode === 'REWARD' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-white border border-gray-200 text-gray-700 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {settings.language === 'fa' ? 'در حال پایش' : 'Active View'}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold bg-gray-100 text-gray-400">
                  {settings.language === 'fa' ? 'انتخاب جهت پایش' : 'View'}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRewardModalOpen(true);
                }}
                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 transition-colors flex items-center justify-center shadow-xs active:scale-95"
                title={settings.language === 'fa' ? 'ثبت سریع تشویق جدید' : 'Quick Register Reward'}
              >
                <Plus className="w-3.5 h-3.5 font-bold" />
              </button>
            </div>
          </div>
        </div>

        {/* Console banner card with dynamic styling based on active mode & theme */}
        <div className={`relative overflow-hidden rounded-2xl border mb-6 ${
          systemMode === 'VIOLATION'
            ? 'border-red-200 bg-gradient-to-br from-red-50/50 via-white to-red-50/10 shadow-xs'
            : `${themeStyles.borderLight} bg-gradient-to-br ${themeStyles.gradientBg} shadow-xs`
        } p-5 md:p-6 transition-all duration-500`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            {/* Left Desk: Context and counts */}
            <div className="space-y-1.5">
              <div className="flex items-center flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                  systemMode === 'VIOLATION' 
                    ? 'bg-red-655 bg-red-600 text-white shadow-xs' 
                    : `${themeStyles.bg} text-white shadow-xs`
                }`}>
                  {systemMode === 'VIOLATION' ? <Shield className="w-3.5 h-3.5" /> : <Medal className="w-3.5 h-3.5" />}
                  {systemMode === 'VIOLATION' ? t.mode_violation : t.mode_reward}
                </span>
                {/* Server Status Indicators */}
                <>
                  {liveSyncStatus === 'connected' ? (
                    <span 
                      title={`اتصال زنده شبکه داخلی برقرار است. تمام سیستم‌های سازمان با سرور مرکزی همگام می‌باشند. آخرین بروزرسانی: ${lastSyncTime || 'هم‌اکنون'}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white border border-emerald-200 text-emerald-700 shadow-xs cursor-default"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                      {settings.language === 'fa' ? 'شبکه داخلی فعال (بلادرنگ)' : 'Intranet Live'}
                    </span>
                  ) : (syncStatus === 'synced' && isOnline) ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white border border-emerald-100 text-emerald-600 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {settings.language === 'fa' ? 'سرور متصل' : 'Intranet Connected'}
                    </span>
                  ) : syncStatus === 'syncing' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white border border-blue-100 text-blue-600 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                      {settings.language === 'fa' ? 'در حال همگام‌سازی...' : 'Syncing...'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white border border-amber-200 text-amber-700 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      {settings.language === 'fa' ? 'آفلاین (نسخه محلی و امن)' : 'Offline (Local Replica)'}
                    </span>
                  )}
                </>
              </div>
              
              <h2 className="text-base md:text-lg font-black text-gray-900 leading-tight">
                {systemMode === 'VIOLATION' 
                  ? (settings.language === 'fa' ? 'پیشخوان جامع کنترل و ثبت تخلفات سازمانی' : 'Organizational Compliance & Violations Desk')
                  : (settings.language === 'fa' ? 'پیشخوان انگیزش و تخصیص امتیازات مثبت پرسنلی' : 'Personnel Motivation & Performance Desk')}
              </h2>
              <p className="text-xs text-gray-650 leading-relaxed max-w-3xl">
                {systemMode === 'VIOLATION'
                  ? (settings.language === 'fa' 
                      ? 'در این بخش می‌توانید نسبت به ثبت عدم انطباق‌ها، آرشیو مجازات کدهای انضباطی سازمان و کسر امتیازهای متناسب اقدام به پایش نمایید.' 
                      : 'Log and monitor personnel non-compliances, warnings, disciplinary codes, and performance point deductions.')
                  : (settings.language === 'fa' 
                      ? 'در این بخش امتیازات مثبت تشویقی بابت رفتارهای ایمن، ابتکارها و آراستگی پرسنل ثبت و تایید نهایی می‌گردد.' 
                      : 'Log awards, safety improvements, and positive behavior points to empower high-performing crews.')}
              </p>
            </div>

            {/* Right Desk: Core primary actions (No duplicates, elegant animations) */}
            <div className="flex flex-wrap lg:flex-nowrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsLegendOpen(true)}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
              >
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span>{t.codeLegend}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPrintReportOpen(true)}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
              >
                <Printer className="w-4 h-4 text-indigo-600 animate-pulse" />
                <span>{settings.language === 'fa' ? 'گزارش چاپی واحدها' : 'Print Dept Report'}</span>
              </button>

              {canViewAll && (
                systemMode === 'VIOLATION' ? (
                  <button
                    type="button"
                    onClick={handlePickWorkerOfMonth}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
                    <span>{settings.language === 'fa' ? 'شناسایی پرسنل پرخطر (بیشترین امتیاز منفی)' : 'Identify High-Risk Personnel (Highest Negative Score)'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePickWorkerOfMonth}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
                  >
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>{settings.language === 'fa' ? 'محاسبه کارمند نمونه (سیستم امتیازی)' : 'Worker of the Month (Scoring)'}</span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => systemMode === 'VIOLATION' ? setIsModalOpen(true) : setIsRewardModalOpen(true)}
                className={`text-white font-black py-2.5 px-4.5 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs shadow-sm hover:shadow-md ${
                  systemMode === 'VIOLATION' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : `${themeStyles.bg} ${themeStyles.hoverBg}`
                }`}
                title={systemMode === 'VIOLATION' ? 'Alt + V' : 'Alt + R'}
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5 animate-pulse" />
                <span>{systemMode === 'VIOLATION' ? t.newViolation : t.newReward}</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/20 text-white rounded">
                  {systemMode === 'VIOLATION' ? 'Alt+V' : 'Alt+R'}
                </kbd>
              </button>
            </div>
          </div>
        </div>

        {/* Only show Stats if Plant Manager or HR */}
        {canViewAll && (
          <>
            <DashboardStats violations={filteredViolations} rewards={filteredRewards} mode={systemMode} language={settings.language} />
            <HseTrendDashboard violations={accessibleViolations} rewards={accessibleRewards} settings={settings} />
          </>
        )}

        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 mb-4">
             <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
                 <div ref={mainSearchContainerRef} className="relative flex-grow">
                    <Search className={`absolute ${settings.language === 'fa' ? 'right-3' : 'left-3'} top-3.5 h-4 w-4 text-gray-400`} />
                    <input 
                        type="text" 
                        placeholder={t.search} 
                        className={`w-full py-2.5 ${settings.language === 'fa' ? 'pr-9 pl-10' : 'pl-9 pr-10'} text-base md:text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 ${themeStyles.ring} bg-white shadow-sm`} 
                        value={localSearch} 
                        onChange={(e) => {
                            const val = e.target.value;
                            setLocalSearch(val);
                            setShowMainSearchDropdown(true);
                            if (val.trim() === '') {
                                setSearchTerm('');
                            }
                        }}
                        onFocus={() => setShowMainSearchDropdown(true)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                setSearchTerm(localSearch);
                                setShowMainSearchDropdown(false);
                            }
                        }}
                    />
                    {localSearch && (
                        <button
                            type="button"
                            onClick={() => {
                                setLocalSearch('');
                                setSearchTerm('');
                                setShowMainSearchDropdown(false);
                            }}
                            className={`absolute ${settings.language === 'fa' ? 'left-3' : 'right-3'} top-3 p-0.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}

                    {/* Autocomplete Dropdown List */}
                    {showMainSearchDropdown && localSearch.trim() !== '' && (
                        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150">
                            {dropdownMatchedEmployees.length === 0 ? (
                                <div className="p-3 text-xs text-gray-500 text-center">
                                    {settings.language === 'fa' 
                                        ? 'هیچ پرسنلی با این مشخصات یافت نشد (Enter برای جستجوی آزاد)' 
                                        : 'No personnel found (Press Enter for open search)'}
                                </div>
                            ) : (
                                <div className="p-1.5 space-y-0.5">
                                    <div className={`px-2.5 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider ${settings.language === 'fa' ? 'text-right' : 'text-left'}`}>
                                        {settings.language === 'fa' ? 'پرسنل انطباقی یافت شده' : 'Matching Employees'}
                                    </div>
                                    {dropdownMatchedEmployees.map(emp => (
                                        <button
                                            type="button"
                                            key={emp.id}
                                            onClick={() => {
                                                setLocalSearch(`${emp.fullName} (${emp.personnelId})`);
                                                setSearchTerm(emp.personnelId);
                                                setShowMainSearchDropdown(false);
                                            }}
                                            className={`w-full px-2.5 py-2 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between text-xs md:text-sm group ${settings.language === 'fa' ? 'flex-row' : 'flex-row-reverse'}`}
                                        >
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold shrink-0">
                                                {emp.department}
                                            </span>
                                            <div className={`flex flex-col gap-0.5 ${settings.language === 'fa' ? 'items-end' : 'items-start'}`}>
                                                <span className="font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    {emp.fullName}
                                                 </span>
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {settings.language === 'fa' ? 'کد پرسنلی:' : 'ID:'} {emp.personnelId}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                 </div>
                  {/* Department Dropdown Filter */}
                  <div className="relative shrink-0">
                     <select
                       value={selectedDeptFilter}
                       onChange={(e) => setSelectedDeptFilter(e.target.value)}
                       className={`w-full sm:w-48 py-2.5 px-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 ${themeStyles.ring} text-[13px] md:text-sm font-semibold shadow-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors`}
                     >
                       <option value="ALL">{settings.language === 'fa' ? 'همه واحدهای کاری' : 'All Departments'}</option>
                       {DEPARTMENTS_LIST.map(dept => (
                         <option key={dept} value={dept}>{dept}</option>
                       ))}
                     </select>
                  </div>

                  {/* Status Dropdown Filter */}
                 <div className="relative shrink-0">
                    <select
                      value={approvalStatusFilter}
                      onChange={(e) => setApprovalStatusFilter(e.target.value as any)}
                      className={`w-full sm:w-44 py-2.5 px-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 ${themeStyles.ring} text-[13px] md:text-sm font-semibold shadow-sm text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors`}
                    >
                      <option value="ALL">{settings.language === 'fa' ? 'همه وضعیت‌ها' : 'All Statuses'}</option>
                      <option value="PENDING">{settings.language === 'fa' ? 'در انتظار تایید' : 'Pending Approval'}</option>
                      <option value="APPROVED">{settings.language === 'fa' ? 'تایید شده' : 'Approved'}</option>
                    </select>
                 </div>
             </div>
             <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                 <button onClick={() => setIsLegendOpen(true)} className="bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 flex gap-2 items-center whitespace-nowrap shadow-sm"><BookOpen className="w-4 h-4" /> <span className="hidden sm:inline">{t.codeLegend}</span></button>
                 {activeTab !== 'ARCHIVE' && (
                    <button onClick={() => systemMode === 'VIOLATION' ? setIsModalOpen(true) : setIsRewardModalOpen(true)} className={`text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-lg flex gap-2 items-center whitespace-nowrap active:scale-95 transition-transform ${themeStyles.bg}`}><Plus className="w-4 h-4" /> {systemMode === 'VIOLATION' ? t.newViolation : t.newReward}</button>
                 )}
             </div>
        </div>

        {/* Sorting controls */}
        <div className="flex flex-wrap items-center bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 gap-2.5 mb-4 text-xs md:text-sm shadow-xs">
          <span className="text-gray-500 font-bold flex items-center gap-1.5 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            {settings.language === 'fa' ? 'مرتب‌سازی بر اساس:' : 'Sort by:'}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSort('SCORE')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.97] ${
                sortField === 'SCORE'
                  ? `${themeStyles.bg} text-white border-transparent`
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>{settings.language === 'fa' ? 'امتیاز عملکرد' : 'Score'}</span>
              {sortField === 'SCORE' && (
                sortOrder === 'ASC' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => handleSort('DEPARTMENT')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.97] ${
                sortField === 'DEPARTMENT'
                  ? `${themeStyles.bg} text-white border-transparent`
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>{settings.language === 'fa' ? 'دپارتمان دفتری' : 'Department'}</span>
              {sortField === 'DEPARTMENT' && (
                sortOrder === 'ASC' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => handleSort('LAST_NAME')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.97] ${
                sortField === 'LAST_NAME'
                  ? `${themeStyles.bg} text-white border-transparent`
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>{settings.language === 'fa' ? 'نام خانوادگی' : 'Last Name (Personnel Name)'}</span>
              {sortField === 'LAST_NAME' && (
                sortOrder === 'ASC' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {sortField !== 'NONE' && (
              <button
                onClick={handleClearSort}
                className="text-red-500 hover:text-red-650 bg-red-50 hover:bg-red-100/80 p-1.5 rounded-xl transition-colors border border-transparent hover:border-red-200"
                title={settings.language === 'fa' ? 'حذف فیلتر مرتب‌سازی' : 'Clear sorting'}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Matched Personnel Panel */}
        {(searchTerm.trim() || selectedDeptFilter !== 'ALL') && matchedEmployeesForMainSearch.length > 0 && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs md:text-sm font-black text-gray-700 flex items-center gap-1.5">
                <UserIcon className="w-4.5 h-4.5 text-indigo-500" />
                {settings.language === 'fa' 
                  ? `پرونده‌های پرسنلی یافت شده (${matchedEmployeesForMainSearch.length} نفر):` 
                  : `Matched Personnel Profiles (${matchedEmployeesForMainSearch.length}):`}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                {settings.language === 'fa' ? 'جهت مشاهده سوابق و جزئیات پرونده کلیک کنید.' : 'Click to view complete file & history.'}
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {matchedEmployeesForMainSearch.map(emp => {
                const empViolations = violations.filter(v => v.personnelId === emp.personnelId && v.isApproved);
                const empRewards = rewards.filter(r => r.personnelId === emp.personnelId && r.isApproved);
                const isProfileIncomplete = 
                  !emp.department || emp.department.trim() === '' || 
                  !emp.nationalId || !emp.phoneNumber || !emp.jobTitle || !emp.hireDate;

                return (
                  <button
                    type="button"
                    key={emp.id}
                    onClick={() => setSelectedPersonnelId(emp.personnelId)}
                    className="text-right p-3 bg-white hover:bg-indigo-50/50 border border-gray-150 hover:border-indigo-300 rounded-xl transition-all shadow-xs flex flex-col justify-between hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer"
                  >
                    <div className="flex items-start justify-between w-full mb-1">
                      <div>
                        <span className="font-extrabold text-xs md:text-sm text-gray-900 group-hover:text-indigo-600 transition-colors block">
                          {emp.fullName}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold block mt-0.5">
                          {emp.jobTitle || (settings.language === 'fa' ? 'بدون سمت مشخص' : 'No custom title')}
                        </span>
                      </div>
                      <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-lg font-mono font-bold shrink-0">
                        {emp.personnelId}
                      </span>
                    </div>

                    <div className="flex items-center justify-between w-full mt-2.5 pt-2 border-t border-gray-100 text-[10px]">
                      <span className="bg-indigo-50 text-indigo-750 px-1.5 py-0.5 rounded-md font-bold max-w-[120px] truncate" title={emp.department}>
                        {emp.department || '—'}
                      </span>
                      <div className="flex items-center gap-1 font-bold">
                        <span className="text-red-500">🚫 {empViolations.length}</span>
                        <span className="text-emerald-500">🏆 {empRewards.length}</span>
                        {isProfileIncomplete && (
                          <span className="text-amber-500 font-black ml-1" title={settings.language === 'fa' ? 'پرونده دارای نقص اطلاعات است' : 'Profile has incomplete information'}>
                            ⚠
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Table / Cards Container */}
        <div className="space-y-4">
          {/* Desktop Version (hidden on mobile) */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-5 py-4 text-xs font-bold text-gray-500 text-right whitespace-nowrap">{t.personnel}</th>
                          {canViewAll && <th className="px-4 py-4 text-xs font-bold text-gray-500 text-center whitespace-nowrap">{t.sourceDept}</th>}
                          <th className="px-4 py-4 text-xs font-bold text-gray-500 text-center w-24 whitespace-nowrap">{systemMode === 'VIOLATION' ? t.violationCode : t.rewardCode}</th>
                          <th className="px-4 py-4 text-xs font-bold text-gray-500 text-center whitespace-nowrap">{t.scoreLabel}</th>
                          <th className="px-5 py-4 text-xs font-bold text-gray-500 text-center uppercase whitespace-nowrap">{t.actions}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {sortedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                              <td className="px-5 py-4 whitespace-nowrap cursor-pointer" onClick={() => setSelectedPersonnelId(item.personnelId)}>
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110 ${themeStyles.lightBg} ${themeStyles.lightText}`}>
                                          {item.employeeName.charAt(0)}
                                      </div>
                                      <div>
                                          <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                                              {item.employeeName}
                                              <UserIcon className="w-3 h-3 text-gray-400" />
                                              {item.isApproved ? (
                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                                  {settings.language === 'fa' ? 'درج در پرونده' : 'Logged'}
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block"></span>
                                                  {settings.language === 'fa' ? 'ثبت اولیه' : 'Preliminary'}
                                                </span>
                                              )}
                                          </div>
                                          <div className="text-xs text-gray-500 font-mono">{item.personnelId} | {item.department}</div>
                                      </div>
                                  </div>
                              </td>
                              {canViewAll && (
                                  <td className="px-4 py-4 text-center whitespace-nowrap">
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.departmentSource === 'SECURITY' ? 'bg-slate-200 text-slate-800' : item.departmentSource === 'HSE' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                          {(t as any)[`dept_${item.departmentSource}`] || item.departmentSource}
                                      </span>
                                  </td>
                              )}
                              <td className="px-4 py-4 text-center whitespace-nowrap">
                                  <div className="flex flex-col items-center">
                                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-mono font-bold text-gray-700">
                                          {systemMode === 'VIOLATION' ? (item as Violation).violationCode : (item as Reward).rewardCode}
                                      </span>
                                      <span className="text-[10px] text-gray-400 mt-1 max-w-[120px] truncate block">
                                          {getDisplayLabel(systemMode === 'VIOLATION' ? (item as Violation).violationCode : (item as Reward).rewardCode, systemMode)}
                                      </span>
                                  </div>
                              </td>
                              <td className="px-4 py-4 text-center whitespace-nowrap">
                                  <span className={`font-bold font-mono text-sm ${systemMode === 'VIOLATION' ? 'text-red-600' : 'text-emerald-600'}`} dir="ltr">
                                      {systemMode === 'VIOLATION' ? (item as Violation).score : `+${(item as Reward).score}`}
                                  </span>
                              </td>
                              <td className="px-5 py-4 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => setSelectedPersonnelId(item.personnelId)} className="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                                          {t.viewProfile}
                                      </button>
                                      {!item.isApproved && getCanApproveItem(item) && (
                                          <button onClick={() => handleApprove(item.id, systemMode)} className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors" title={settings.language === 'fa' ? 'تایید نهایی' : 'Approve'}>
                                              <Check className="w-3.5 h-3.5 text-emerald-600 font-bold" />
                                              <span>{settings.language === 'fa' ? 'تایید نهایی' : 'Approve'}</span>
                                          </button>
                                      )}
                                      {getCanDeleteItem(item) && (
                                          <button onClick={() => setDeleteModal({ isOpen: true, id: item.id, type: systemMode })} className="text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors hover:text-red-850" title={settings.language === 'fa' ? 'حذف مورد ثبت شده' : 'Delete Log'}>
                                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                              <span>{settings.language === 'fa' ? 'حذف' : 'Delete'}</span>
                                          </button>
                                      )}
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              {sortedItems.length === 0 && (
                <div className="text-center py-12 text-gray-400 bg-white">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserIcon className="w-8 h-8 text-gray-300" />
                    <span className="text-sm font-medium">
                      {settings.language === 'fa' ? 'هیچ موردی برای نمایش یافت نشد.' : 'No cases found to display.'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Cards View (shown on screens smaller than md breakpoint) */}
          <div className="md:hidden space-y-3.5">
              {sortedItems.map((item) => {
                  const code = systemMode === 'VIOLATION' ? (item as Violation).violationCode : (item as Reward).rewardCode;
                  const score = systemMode === 'VIOLATION' ? (item as Violation).score : (item as Reward).score;
                  return (
                      <div key={item.id} className="bg-white rounded-2xl p-4 border border-gray-150 shadow-sm flex flex-col gap-3.5 hover:shadow-md transition-shadow">
                          {/* Personnel Profile Header & Score / Department Source Badge */}
                          <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedPersonnelId(item.personnelId)}>
                                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${themeStyles.lightBg} ${themeStyles.lightText}`}>
                                      {item.employeeName.charAt(0)}
                                  </div>
                                  <div className="space-y-1">
                                      <div className="text-sm font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                                          {item.employeeName}
                                          <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                                      </div>
                                      <div className="flex gap-2 items-center flex-wrap">
                                          <span className="text-[11px] text-gray-500 font-mono">
                                              {item.personnelId} | {item.department}
                                          </span>
                                          {item.isApproved ? (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-205">
                                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                                              {settings.language === 'fa' ? 'درج پرونده' : 'Logged'}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block"></span>
                                              {settings.language === 'fa' ? 'ثبت اولیه' : 'Prelim'}
                                            </span>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 font-mono">
                                  <span className={`font-black text-base leading-none ${systemMode === 'VIOLATION' ? 'text-red-650' : 'text-emerald-650'}`} dir="ltr">
                                      {systemMode === 'VIOLATION' ? score : `+${score}`}
                                  </span>
                                  {canViewAll && (
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${item.departmentSource === 'SECURITY' ? 'bg-slate-200 text-slate-800' : item.departmentSource === 'HSE' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                                          {(t as any)[`dept_${item.departmentSource}`] || item.departmentSource}
                                      </span>
                                  )}
                              </div>
                          </div>

                          {/* Code and Action Description Details */}
                          <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-3">
                              <div className="flex flex-col min-w-0">
                                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                      {systemMode === 'VIOLATION' ? t.violationCode : t.rewardCode}
                                  </span>
                                  <span className="text-xs font-bold text-gray-700 truncate mt-0.5 leading-tight">
                                      {getDisplayLabel(code, systemMode)}
                                  </span>
                              </div>
                              <span className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-700 shrink-0 shadow-xs">
                                  {code}
                              </span>
                          </div>

                          {/* Action Button Segment */}
                          <div className="flex gap-2">
                              <button 
                                  onClick={() => setSelectedPersonnelId(item.personnelId)} 
                                  className="flex-grow text-center text-indigo-600 bg-indigo-50 active:bg-indigo-100/80 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-indigo-100/40"
                              >
                                  <UserIcon className="w-4 h-4" />
                                  {t.viewProfile}
                              </button>
                              {!item.isApproved && getCanApproveItem(item) && (
                                  <button 
                                      onClick={() => handleApprove(item.id, systemMode)} 
                                      className="px-4 py-2.5 text-emerald-700 bg-emerald-50 active:bg-emerald-110/80 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center justify-center gap-1.5 shrink-0"
                                      title={settings.language === 'fa' ? 'تایید نهایی و ثبت پرونده' : 'Approve'}
                                  >
                                      <Check className="w-4 h-4 font-bold text-emerald-600" />
                                      <span className="text-xs font-bold">{settings.language === 'fa' ? 'تایید نهایی' : 'Approve'}</span>
                                  </button>
                              )}
                              {getCanDeleteItem(item) && (
                                  <button 
                                      onClick={() => setDeleteModal({ isOpen: true, id: item.id, type: systemMode })} 
                                      className="px-4 py-2.5 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
                                      title={settings.language === 'fa' ? 'حذف مورد ثبت شده' : 'Delete Log'}
                                  >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                      <span className="text-xs font-bold">{settings.language === 'fa' ? 'حذف' : 'Delete'}</span>
                                  </button>
                              )}
                          </div>
                      </div>
                  );
              })}
              {sortedItems.length === 0 && (
                <div className="text-center py-10 bg-white rounded-2xl border border-gray-200 text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserIcon className="w-7 h-7 text-gray-300" />
                    <span className="text-xs font-medium">
                      {settings.language === 'fa' ? 'هیچ موردی برای نمایش یافت نشد.' : 'No cases found to display.'}
                    </span>
                  </div>
                </div>
              )}
          </div>
        </div>
            </>
          )}

          {/* PERSONNEL DIRECTORY PAGE */}
          {currentViewPage === 'PERSONNEL' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-xs">
                <div>
                  <h2 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
                    <Users className="w-5.5 h-5.5 text-indigo-600" />
                    <span>{settings.language === 'fa' ? 'بانک جامع پرونده‌های الکترونیکی پرسنلی' : 'Personnel Electronic Database'}</span>
                  </h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-1.5 leading-relaxed">
                    {settings.language === 'fa' 
                      ? 'سوابق کامل، ارزیابی هوشمند امتیازات رفتار ایمنی (HSE)، وضعیت ریسک و کلیه اخطارها و تقدیرهای صادر شده پرسنل کارخانه.'
                      : 'Access complete employee compliance folders, point history, and HSE hazard levels in a unified directory.'}
                  </p>
                </div>
                {/* Add Employee Button for Admins */}
                {['PLANT_MANAGER', 'HR_MANAGER', 'DEVELOPER', 'HSE_MANAGER', 'ADMIN_STAFF'].includes(user?.role || '') && (
                  <button
                    onClick={() => setIsAddEmployeeOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 whitespace-nowrap cursor-pointer animate-in fade-in"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{settings.language === 'fa' ? 'ثبت پرسنل جدید' : 'Add New Employee'}</span>
                  </button>
                )}
              </div>

              {/* Search, Filter & Binder Selection Bar */}
              <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className={`absolute ${settings.language === 'fa' ? 'right-3' : 'left-3'} top-3 h-4 w-4 text-gray-400`} />
                    <input 
                      type="text" 
                      placeholder={settings.language === 'fa' ? 'جستجوی نام یا کد پرسنلی...' : 'Search name or personnel ID...'} 
                      className={`w-full py-2 ${settings.language === 'fa' ? 'pr-9 pl-4' : 'pl-9 pr-4'} text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 ${themeStyles.ring} bg-white shadow-inner`} 
                      value={personnelSearchQuery} 
                      onChange={(e) => {
                        setPersonnelSearchQuery(e.target.value);
                        if (e.target.value) {
                          setSelectedBinderKey(null);
                        }
                      }}
                    />
                  </div>
                  <div className="relative w-full sm:w-48">
                    <select
                      value={personnelDeptFilter}
                      onChange={(e) => {
                        setPersonnelDeptFilter(e.target.value);
                        if (e.target.value !== 'ALL') {
                          setSelectedBinderKey(null);
                        }
                      }}
                      className={`w-full py-2 px-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 ${themeStyles.ring} text-xs md:text-sm font-semibold shadow-sm text-gray-700 cursor-pointer`}
                    >
                      <option value="ALL">{settings.language === 'fa' ? 'همه واحدها' : 'All Departments'}</option>
                      {DEPARTMENTS_LIST.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Binder Grouping controls */}
                <div className="border-t border-gray-100 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-600">
                      {settings.language === 'fa' ? 'دسته‌بندی زونکن‌ها بر اساس:' : 'Organize Binders by:'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                    <button
                      onClick={() => { setPersonnelGroupCriteria('DEPARTMENT'); setSelectedBinderKey(null); }}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${personnelGroupCriteria === 'DEPARTMENT' ? 'bg-indigo-650 text-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                    >
                      {settings.language === 'fa' ? 'واحد سازمانی (دپارتمان)' : 'Department'}
                    </button>
                    <button
                      onClick={() => { setPersonnelGroupCriteria('SAFETY_STATUS'); setSelectedBinderKey(null); }}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${personnelGroupCriteria === 'SAFETY_STATUS' ? 'bg-indigo-650 text-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                    >
                      {settings.language === 'fa' ? 'رتبه و امتیاز ایمنی (HSE)' : 'HSE Score'}
                    </button>
                    <button
                      onClick={() => { setPersonnelGroupCriteria('JOB_TITLE'); setSelectedBinderKey(null); }}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${personnelGroupCriteria === 'JOB_TITLE' ? 'bg-indigo-650 text-white shadow-sm' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                    >
                      {settings.language === 'fa' ? 'پست و عنوان شغلی' : 'Job Title'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Binders Shelf or Opened Binder view */}
              {(() => {
                const filteredEmployees = employees.filter(emp => {
                  const query = personnelSearchQuery.toLowerCase().trim();
                  const matchesSearch = !query ||
                    emp.fullName.toLowerCase().includes(query) ||
                    emp.personnelId.toLowerCase().includes(query) ||
                    (emp.department && emp.department.toLowerCase().includes(query));
                  const matchesDept = personnelDeptFilter === 'ALL' || emp.department === personnelDeptFilter;
                  return matchesSearch && matchesDept;
                });

                if (filteredEmployees.length === 0) {
                  return (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-xs">
                      <UserIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-gray-700">
                        {settings.language === 'fa' ? 'پرونده‌ای با این مشخصات یافت نشد' : 'No personnel records match selection'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {settings.language === 'fa' ? 'می‌توانید فیلترها را ریست کرده یا پرسنل جدید ثبت کنید.' : 'Adjust search filters or add new employees.'}
                      </p>
                    </div>
                  );
                }

                // Group them into binders (زونکن ها)
                const binders: { [key: string]: Employee[] } = {};
                filteredEmployees.forEach(emp => {
                  let groupKey = '';
                  if (personnelGroupCriteria === 'DEPARTMENT') {
                    groupKey = emp.department || (settings.language === 'fa' ? 'ثبت نشده' : 'Not Specified');
                  } else if (personnelGroupCriteria === 'SAFETY_STATUS') {
                    const empViolations = violations.filter(v => v.personnelId === emp.personnelId && v.isApproved && !v.isArchived);
                    const empRewards = rewards.filter(r => r.personnelId === emp.personnelId && r.isApproved && !r.isArchived);
                    const totalDeductions = empViolations.reduce((sum, v) => sum + (v.score || 0), 0);
                    const totalAdditions = empRewards.reduce((sum, r) => sum + (r.score || 0), 0);
                    const totalScore = Math.max(0, 100 + totalDeductions + totalAdditions);
                    
                    if (totalScore >= 100) {
                      groupKey = settings.language === 'fa' ? 'زونکن طلایی (عالی و نمونه - امتیاز ۱۰۰+)' : 'Golden Binder (Excellent - 100+)';
                    } else if (totalScore >= 80) {
                      groupKey = settings.language === 'fa' ? 'زونکن سبز (ایمن و خوب - امتیاز ۸۰ تا ۹۹)' : 'Green Binder (Safe - 80-99)';
                    } else if (totalScore >= 60) {
                      groupKey = settings.language === 'fa' ? 'زونکن نارنجی (هشدار و احتیاط - امتیاز ۶۰ تا ۷۹)' : 'Orange Binder (Warning - 60-79)';
                    } else {
                      groupKey = settings.language === 'fa' ? 'زونکن قرمز (بحرانی و پرخطر - امتیاز زیر ۶۰)' : 'Red Binder (Critical - <60)';
                    }
                  } else {
                    groupKey = emp.jobTitle || (settings.language === 'fa' ? 'پست متفرقه' : 'Other Roles');
                  }

                  if (!binders[groupKey]) {
                    binders[groupKey] = [];
                  }
                  binders[groupKey].push(emp);
                });

                const getBinderColor = (key: string) => {
                  if (personnelGroupCriteria === 'SAFETY_STATUS') {
                    if (key.includes('طلایی') || key.includes('Golden') || key.includes('عالی')) {
                      return {
                        border: 'border-amber-300',
                        bg: 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-700',
                        hoverBg: 'hover:from-amber-500 hover:to-amber-800',
                        text: 'text-amber-800',
                        lightBg: 'bg-amber-50/60',
                        badge: 'bg-amber-100 text-amber-900 border-amber-200',
                        tabColor: 'bg-amber-500',
                        label: settings.language === 'fa' ? 'رتبه طلایی' : 'HSE: Gold'
                      };
                    }
                    if (key.includes('سبز') || key.includes('Green') || key.includes('ایمن')) {
                      return {
                        border: 'border-emerald-300',
                        bg: 'bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-800',
                        hoverBg: 'hover:from-emerald-600 hover:to-emerald-900',
                        text: 'text-emerald-800',
                        lightBg: 'bg-emerald-50/60',
                        badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
                        tabColor: 'bg-emerald-600',
                        label: settings.language === 'fa' ? 'رتبه سبز' : 'HSE: Green'
                      };
                    }
                    if (key.includes('نارنجی') || key.includes('Orange') || key.includes('هشدار')) {
                      return {
                        border: 'border-orange-300',
                        bg: 'bg-gradient-to-b from-orange-400 via-orange-500 to-orange-700',
                        hoverBg: 'hover:from-orange-500 hover:to-orange-800',
                        text: 'text-orange-800',
                        lightBg: 'bg-orange-50/60',
                        badge: 'bg-orange-100 text-orange-900 border-orange-200',
                        tabColor: 'bg-orange-600',
                        label: settings.language === 'fa' ? 'رتبه نارنجی' : 'HSE: Orange'
                      };
                    }
                    if (key.includes('قرمز') || key.includes('Red') || key.includes('بحرانی')) {
                      return {
                        border: 'border-red-300',
                        bg: 'bg-gradient-to-b from-red-500 via-red-600 to-red-800',
                        hoverBg: 'hover:from-red-600 hover:to-red-900',
                        text: 'text-red-800',
                        lightBg: 'bg-red-50/60',
                        badge: 'bg-red-100 text-red-900 border-red-200',
                        tabColor: 'bg-red-600',
                        label: settings.language === 'fa' ? 'رتبه قرمز' : 'HSE: Red'
                      };
                    }
                  }

                  const VIBRANT_PALETTE = [
                    { border: 'border-teal-300', bg: 'bg-gradient-to-b from-teal-500 to-teal-700', hoverBg: 'hover:from-teal-600 hover:to-teal-800', text: 'text-teal-900', lightBg: 'bg-teal-50/40', badge: 'bg-teal-100 text-teal-900 border-teal-200', tabColor: 'bg-teal-600', label: 'واحد' },
                    { border: 'border-indigo-300', bg: 'bg-gradient-to-b from-indigo-500 to-indigo-700', hoverBg: 'hover:from-indigo-600 hover:to-indigo-800', text: 'text-indigo-900', lightBg: 'bg-indigo-50/40', badge: 'bg-indigo-100 text-indigo-900 border-indigo-200', tabColor: 'bg-indigo-600', label: 'واحد' },
                    { border: 'border-cyan-300', bg: 'bg-gradient-to-b from-cyan-500 to-cyan-700', hoverBg: 'hover:from-cyan-600 hover:to-cyan-800', text: 'text-cyan-900', lightBg: 'bg-cyan-50/40', badge: 'bg-cyan-100 text-cyan-900 border-cyan-200', tabColor: 'bg-cyan-600', label: 'واحد' },
                    { border: 'border-rose-300', bg: 'bg-gradient-to-b from-rose-500 to-rose-700', hoverBg: 'hover:from-rose-600 hover:to-rose-800', text: 'text-rose-900', lightBg: 'bg-rose-50/40', badge: 'bg-rose-100 text-rose-900 border-rose-200', tabColor: 'bg-rose-600', label: 'واحد' },
                    { border: 'border-amber-300', bg: 'bg-gradient-to-b from-amber-500 to-amber-700', hoverBg: 'hover:from-amber-600 hover:to-amber-800', text: 'text-amber-900', lightBg: 'bg-amber-50/40', badge: 'bg-amber-100 text-amber-900 border-amber-200', tabColor: 'bg-amber-600', label: 'واحد' },
                    { border: 'border-violet-300', bg: 'bg-gradient-to-b from-violet-500 to-violet-700', hoverBg: 'hover:from-violet-600 hover:to-violet-800', text: 'text-violet-900', lightBg: 'bg-violet-50/40', badge: 'bg-violet-100 text-violet-900 border-violet-200', tabColor: 'bg-violet-600', label: 'واحد' },
                    { border: 'border-fuchsia-300', bg: 'bg-gradient-to-b from-fuchsia-500 to-fuchsia-700', hoverBg: 'hover:from-fuchsia-600 hover:to-fuchsia-800', text: 'text-fuchsia-900', lightBg: 'bg-fuchsia-50/40', badge: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200', tabColor: 'bg-fuchsia-600', label: 'واحد' },
                    { border: 'border-emerald-300', bg: 'bg-gradient-to-b from-emerald-500 to-emerald-700', hoverBg: 'hover:from-emerald-600 hover:to-emerald-800', text: 'text-emerald-900', lightBg: 'bg-emerald-50/40', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200', tabColor: 'bg-emerald-600', label: 'واحد' },
                    { border: 'border-lime-400', bg: 'bg-gradient-to-b from-lime-600 to-lime-800', hoverBg: 'hover:from-lime-700 hover:to-lime-900', text: 'text-lime-900', lightBg: 'bg-lime-50/40', badge: 'bg-lime-100 text-lime-900 border-lime-200', tabColor: 'bg-lime-600', label: 'واحد' },
                    { border: 'border-sky-300', bg: 'bg-gradient-to-b from-sky-500 to-sky-700', hoverBg: 'hover:from-sky-600 hover:to-sky-800', text: 'text-sky-900', lightBg: 'bg-sky-50/40', badge: 'bg-sky-100 text-sky-900 border-sky-200', tabColor: 'bg-sky-600', label: 'واحد' },
                    { border: 'border-orange-300', bg: 'bg-gradient-to-b from-orange-500 to-orange-700', hoverBg: 'hover:from-orange-600 hover:to-orange-800', text: 'text-orange-900', lightBg: 'bg-orange-50/40', badge: 'bg-orange-100 text-orange-900 border-orange-200', tabColor: 'bg-orange-600', label: 'واحد' },
                    { border: 'border-purple-300', bg: 'bg-gradient-to-b from-purple-500 to-purple-700', hoverBg: 'hover:from-purple-600 hover:to-purple-800', text: 'text-purple-900', lightBg: 'bg-purple-50/40', badge: 'bg-purple-100 text-purple-900 border-purple-200', tabColor: 'bg-purple-600', label: 'واحد' },
                    { border: 'border-blue-300', bg: 'bg-gradient-to-b from-blue-500 to-blue-700', hoverBg: 'hover:from-blue-600 hover:to-blue-800', text: 'text-blue-900', lightBg: 'bg-blue-50/40', badge: 'bg-blue-100 text-blue-900 border-blue-200', tabColor: 'bg-blue-600', label: 'واحد' },
                    { border: 'border-pink-300', bg: 'bg-gradient-to-b from-pink-500 to-pink-700', hoverBg: 'hover:from-pink-600 hover:to-pink-800', text: 'text-pink-900', lightBg: 'bg-pink-50/40', badge: 'bg-pink-100 text-pink-900 border-pink-200', tabColor: 'bg-pink-600', label: 'واحد' },
                    { border: 'border-stone-400', bg: 'bg-gradient-to-b from-stone-600 to-stone-800', hoverBg: 'hover:from-stone-700 hover:to-stone-900', text: 'text-stone-900', lightBg: 'bg-stone-50/40', badge: 'bg-stone-100 text-stone-900 border-stone-200', tabColor: 'bg-stone-700', label: 'واحد' },
                    { border: 'border-red-300', bg: 'bg-gradient-to-b from-red-550 to-red-750', hoverBg: 'hover:from-red-650 hover:to-red-850', text: 'text-red-900', lightBg: 'bg-red-50/40', badge: 'bg-red-100 text-red-900 border-red-200', tabColor: 'bg-red-600', label: 'واحد' },
                    { border: 'border-yellow-400', bg: 'bg-gradient-to-b from-yellow-500 to-yellow-700', hoverBg: 'hover:from-yellow-600 hover:to-yellow-800', text: 'text-yellow-900', lightBg: 'bg-yellow-50/40', badge: 'bg-yellow-100 text-yellow-900 border-yellow-200', tabColor: 'bg-yellow-600', label: 'واحد' },
                    { border: 'border-slate-400', bg: 'bg-gradient-to-b from-slate-600 to-slate-800', hoverBg: 'hover:from-slate-700 hover:to-slate-900', text: 'text-slate-900', lightBg: 'bg-slate-50/40', badge: 'bg-slate-100 text-slate-900 border-slate-200', tabColor: 'bg-slate-700', label: 'واحد' },
                    { border: 'border-teal-400', bg: 'bg-gradient-to-b from-teal-600 to-cyan-800', hoverBg: 'hover:from-teal-700 hover:to-cyan-900', text: 'text-teal-900', lightBg: 'bg-teal-50/40', badge: 'bg-teal-100 text-teal-900 border-teal-200', tabColor: 'bg-teal-700', label: 'واحد' },
                    { border: 'border-indigo-400', bg: 'bg-gradient-to-b from-indigo-600 to-violet-800', hoverBg: 'hover:from-indigo-700 hover:to-violet-900', text: 'text-indigo-900', lightBg: 'bg-indigo-50/40', badge: 'bg-indigo-100 text-indigo-900 border-indigo-200', tabColor: 'bg-indigo-700', label: 'واحد' },
                    { border: 'border-rose-400', bg: 'bg-gradient-to-b from-rose-600 to-fuchsia-800', hoverBg: 'hover:from-rose-700 hover:to-fuchsia-900', text: 'text-rose-900', lightBg: 'bg-rose-50/40', badge: 'bg-rose-100 text-rose-900 border-rose-200', tabColor: 'bg-rose-700', label: 'واحد' },
                    { border: 'border-emerald-400', bg: 'bg-gradient-to-b from-emerald-600 to-lime-800', hoverBg: 'hover:from-emerald-700 hover:to-lime-900', text: 'text-emerald-900', lightBg: 'bg-emerald-50/40', badge: 'bg-emerald-100 text-emerald-900 border-emerald-200', tabColor: 'bg-emerald-700', label: 'واحد' },
                    { border: 'border-amber-400', bg: 'bg-gradient-to-b from-amber-600 to-orange-800', hoverBg: 'hover:from-amber-700 hover:to-orange-900', text: 'text-amber-900', lightBg: 'bg-amber-50/40', badge: 'bg-amber-100 text-amber-900 border-amber-200', tabColor: 'bg-amber-700', label: 'واحد' },
                    { border: 'border-zinc-400', bg: 'bg-gradient-to-b from-zinc-600 to-zinc-800', hoverBg: 'hover:from-zinc-700 hover:to-zinc-900', text: 'text-zinc-900', lightBg: 'bg-zinc-50/40', badge: 'bg-zinc-100 text-zinc-900 border-zinc-200', tabColor: 'bg-zinc-700', label: 'واحد' },
                  ];

                  if (personnelGroupCriteria === 'DEPARTMENT') {
                    const d = key.toLowerCase();
                    if (d.includes('هیدرولیک')) return { ...VIBRANT_PALETTE[2], label: 'فنی: هیدرولیک' };
                    if (d.includes('جوشکاری')) return { ...VIBRANT_PALETTE[10], label: 'فنی: جوشکاری' };
                    if (d.includes('نقاشی')) return { ...VIBRANT_PALETTE[13], label: 'فنی: نقاشی' };
                    if (d.includes('ماشین سازی') || d.includes('ماشینسازی')) return { ...VIBRANT_PALETTE[1], label: 'فنی: ماشین‌سازی' };
                    if (d.includes('cnc') || d.includes('سی ان سی')) return { ...VIBRANT_PALETTE[5], label: 'فنی: CNC' };
                    if (d.includes('تعمیرات')) return { ...VIBRANT_PALETTE[8], label: 'فنی: تعمیرات' };
                    if (d.includes('اسیدشویی') || d.includes('اسید شویی')) return { ...VIBRANT_PALETTE[0], label: 'تولید: اسیدشویی' };
                    if (d.includes('نورد')) return { ...VIBRANT_PALETTE[3], label: 'تولید: نورد سرد' };
                    if (d.includes('گالوانیزه')) return { ...VIBRANT_PALETTE[9], label: 'تولید: گالوانیزه' };
                    if (d.includes('شیت')) return { ...VIBRANT_PALETTE[4], label: 'تولید: شیت‌کن' };
                    if (d.includes('رنگی') || d.includes('رنگ')) return { ...VIBRANT_PALETTE[10], label: 'تولید: خط رنگی' };
                    if (d.includes('برق')) return { ...VIBRANT_PALETTE[16], label: 'واحد برق' };
                    if (d.includes('الکترونیک')) return { ...VIBRANT_PALETTE[11], label: 'الکترونیک' };
                    if (d.includes('انفورماتیک') || d.includes('it') || d.includes('شبکه')) return { ...VIBRANT_PALETTE[12], label: 'انفورماتیک' };
                    if (d.includes('انبار')) return { ...VIBRANT_PALETTE[14], label: 'واحد انبار' };
                    if (d.includes('مالی') || d.includes('حسابداری')) return { ...VIBRANT_PALETTE[7], label: 'امور مالی' };
                    if (d.includes('فروش')) return { ...VIBRANT_PALETTE[6], label: 'واحد فروش' };
                    if (d.includes('تاسیسات') || d.includes('تأسیسات')) return { ...VIBRANT_PALETTE[18], label: 'تاسیسات' };
                    if (d.includes('لیفتراک')) return { ...VIBRANT_PALETTE[22], label: 'ناوگان لیفتراک' };
                    if (d.includes('کالیبراسیون')) return { ...VIBRANT_PALETTE[19], label: 'کالیبراسیون' };
                    if (d.includes('بازرسی') || d.includes('کیفیت')) return { ...VIBRANT_PALETTE[20], label: 'بازرسی کیفیت' };
                    if (d.includes('آموزش')) return { ...VIBRANT_PALETTE[21], label: 'واحد آموزش' };
                    if (d.includes('اداری') || d.includes('منابع')) return { ...VIBRANT_PALETTE[12], label: 'اداری و منابع' };
                    if (d.includes('حراست') || d.includes('انتظامات')) return { ...VIBRANT_PALETTE[17], label: 'انتظامات' };
                    if (d.includes('ایمنی') || d.includes('بهداشت') || d.includes('hse')) return { ...VIBRANT_PALETTE[7], label: 'ایمنی و بهداشت' };
                    if (d.includes('تولید')) return { ...VIBRANT_PALETTE[0], label: 'تولید عمومی' };
                    if (d.includes('فنی')) return { ...VIBRANT_PALETTE[1], label: 'فنی مهندسی' };
                  }

                  // JOB_TITLE Mode
                  const roleStr = key.toLowerCase();
                  if (roleStr.includes('سرپرست') || roleStr.includes('supervisor') || roleStr.includes('مدیر') || roleStr.includes('manager')) {
                    return {
                      border: 'border-fuchsia-300',
                      bg: 'bg-gradient-to-b from-fuchsia-500 to-fuchsia-700',
                      hoverBg: 'hover:from-fuchsia-600 hover:to-fuchsia-800',
                      text: 'text-fuchsia-850',
                      lightBg: 'bg-fuchsia-50/40',
                      badge: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200',
                      tabColor: 'bg-fuchsia-600',
                      label: settings.language === 'fa' ? 'مدیر / سرپرست' : 'ROLE: Lead'
                    };
                  }
                  if (roleStr.includes('کارشناس') || roleStr.includes('expert') || roleStr.includes('مهندس') || roleStr.includes('engineer')) {
                    return {
                      border: 'border-purple-300',
                      bg: 'bg-gradient-to-b from-purple-500 to-purple-700',
                      hoverBg: 'hover:from-purple-600 hover:to-purple-800',
                      text: 'text-purple-850',
                      lightBg: 'bg-purple-50/40',
                      badge: 'bg-purple-100 text-purple-900 border-purple-200',
                      tabColor: 'bg-purple-600',
                      label: settings.language === 'fa' ? 'کارشناس / مهندس' : 'ROLE: Expert'
                    };
                  }
                  if (roleStr.includes('تکنسین') || roleStr.includes('technician') || roleStr.includes('اپراتور') || roleStr.includes('operator')) {
                    return {
                      border: 'border-violet-300',
                      bg: 'bg-gradient-to-b from-violet-500 to-violet-700',
                      hoverBg: 'hover:from-violet-600 hover:to-violet-800',
                      text: 'text-violet-850',
                      lightBg: 'bg-violet-50/40',
                      badge: 'bg-violet-100 text-violet-900 border-violet-200',
                      tabColor: 'bg-violet-600',
                      label: settings.language === 'fa' ? 'تکنسین / اپراتور' : 'ROLE: Tech'
                    };
                  }
                  if (roleStr.includes('کارگر') || roleStr.includes('worker') || roleStr.includes('خدمات') || roleStr.includes('کارورز')) {
                    return {
                      border: 'border-pink-300',
                      bg: 'bg-gradient-to-b from-pink-500 to-pink-700',
                      hoverBg: 'hover:from-pink-600 hover:to-pink-800',
                      text: 'text-pink-850',
                      lightBg: 'bg-pink-50/40',
                      badge: 'bg-pink-100 text-pink-900 border-pink-200',
                      tabColor: 'bg-pink-600',
                      label: settings.language === 'fa' ? 'پرسنل اجرایی' : 'ROLE: Worker'
                    };
                  }

                  let sum = 0;
                  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
                  const themeIndex = sum % VIBRANT_PALETTE.length;
                  const chosenTheme = VIBRANT_PALETTE[themeIndex];
                  
                  const customLabel = personnelGroupCriteria === 'DEPARTMENT'
                    ? (settings.language === 'fa' ? `واحد: ${key}` : `DEPT: ${key}`)
                    : (settings.language === 'fa' ? `پست: ${key}` : `ROLE: ${key}`);

                  return {
                    ...chosenTheme,
                    label: customLabel
                  };
                };

                const getCriteriaLabel = (crit: string) => {
                  if (crit === 'DEPARTMENT') return settings.language === 'fa' ? 'واحد سازمانی' : 'Department';
                  if (crit === 'SAFETY_STATUS') return settings.language === 'fa' ? 'وضعیت ایمنی' : 'HSE Status';
                  return settings.language === 'fa' ? 'پست شغلی' : 'Job Title';
                };

                if (selectedBinderKey && binders[selectedBinderKey]) {
                  const employeesInBinder = binders[selectedBinderKey];
                  return (
                    <div className="space-y-4 animate-in fade-in duration-350">
                      {/* Folder Title bar */}
                      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedBinderKey(null)}
                            className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <span>{settings.language === 'fa' ? '← بازگشت به زونکن‌ها' : '← Back to Binders'}</span>
                          </button>
                          <div className="h-6 w-px bg-gray-200 hidden sm:block" />
                          <div>
                            <h3 className="text-sm md:text-base font-black text-gray-800 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                              <span>{settings.language === 'fa' ? `درحال مشاهده زونکن: ${selectedBinderKey}` : `Viewing Folder: ${selectedBinderKey}`}</span>
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                              {settings.language === 'fa' ? `شامل ${employeesInBinder.length} پرونده پرسنلی` : `Contains ${employeesInBinder.length} personnel records`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsTransferModalOpen(true)}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>{settings.language === 'fa' ? 'افزودن / انتقال نفرات به این زونکن' : 'Add/Move Personnel to Binder'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Employees in active binder */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {employeesInBinder.map(emp => {
                          const empViolations = violations.filter(v => v.personnelId === emp.personnelId && v.isApproved && !v.isArchived);
                          const empRewards = rewards.filter(r => r.personnelId === emp.personnelId && r.isApproved && !r.isArchived);
                          const totalDeductions = empViolations.reduce((sum, v) => sum + (v.score || 0), 0);
                          const totalAdditions = empRewards.reduce((sum, r) => sum + (r.score || 0), 0);
                          const totalScore = Math.max(0, 100 + totalDeductions + totalAdditions);

                          let scoreColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          let scoreStatus = settings.language === 'fa' ? 'عالی (نمونه)' : 'Excellent';
                          
                          if (totalScore < 60) {
                            scoreColor = 'bg-red-50 text-red-700 border-red-200';
                            scoreStatus = settings.language === 'fa' ? 'بحرانی (تعلیق/اخراج)' : 'Critical';
                          } else if (totalScore < 80) {
                            scoreColor = 'bg-orange-50 text-orange-700 border-orange-200';
                            scoreStatus = settings.language === 'fa' ? 'خطر (کمیته انضباطی)' : 'Danger';
                          } else if (totalScore < 100) {
                            scoreColor = 'bg-amber-50 text-amber-700 border-amber-200';
                            scoreStatus = settings.language === 'fa' ? 'هشدار' : 'Warning';
                          } else if (totalScore <= 110) {
                            scoreColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                            scoreStatus = settings.language === 'fa' ? 'خوب' : 'Good';
                          }

                          return (
                            <div
                              key={emp.id}
                              className="bg-white border border-gray-200 hover:border-indigo-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between group relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                            >
                              <div className={`absolute top-0 right-0 left-0 h-1.5 ${
                                totalScore >= 100 ? 'bg-emerald-500' : totalScore >= 80 ? 'bg-amber-500' : 'bg-red-500'
                              }`} />

                              <div className="space-y-4 pt-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-11 h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-transform group-hover:scale-105 ${themeStyles.lightBg} ${themeStyles.lightText}`}>
                                      {emp.fullName.charAt(0)}
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-sm text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">
                                        {emp.fullName}
                                      </h4>
                                      <span className="text-[10px] text-gray-400 font-bold block mt-1">
                                        {emp.jobTitle || (settings.language === 'fa' ? 'پست سازمانی ثبت نشده' : 'No custom title')}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="bg-gray-100 border border-gray-200 text-gray-600 text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-bold shrink-0">
                                    {emp.personnelId}
                                  </span>
                                </div>

                                <div className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold ${scoreColor}`}>
                                  <span>{settings.language === 'fa' ? 'امتیاز رفتار ایمنی:' : 'Safety Point Score:'}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-black font-mono">{totalScore}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 bg-white rounded-md border border-inherit font-semibold">{scoreStatus}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-center text-[10px] border-t border-b border-gray-100 py-3">
                                  <div className="border-l border-gray-100 last:border-0 px-1">
                                    <span className="block text-gray-400 font-bold">{settings.language === 'fa' ? 'دپارتمان' : 'Department'}</span>
                                    <span className="block font-black text-gray-700 truncate mt-1 text-xs" title={emp.department}>
                                      {emp.department || '—'}
                                    </span>
                                  </div>
                                  <div className="px-1">
                                    <span className="block text-gray-400 font-bold">{settings.language === 'fa' ? 'خلاصه پرونده' : 'Dossier Log'}</span>
                                    <span className="block font-black text-xs mt-1 space-x-1 whitespace-nowrap">
                                      <span className="text-red-500 font-bold">🚫 {empViolations.length} {settings.language === 'fa' ? 'تخلف' : 'Non-comp'}</span>
                                      <span className="text-gray-300">|</span>
                                      <span className="text-emerald-500 font-bold">🏆 {empRewards.length} {settings.language === 'fa' ? 'امتیاز' : 'Reward'}</span>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-2 mt-4">
                                <button
                                  onClick={() => setSelectedPersonnelId(emp.personnelId)}
                                  className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 cursor-pointer active:scale-95"
                                >
                                  <BookOpen className="w-4 h-4" />
                                  <span>{settings.language === 'fa' ? 'مشاهده پرونده' : 'View Dossier'}</span>
                                </button>
                                {['PLANT_MANAGER', 'HR_MANAGER', 'DEVELOPER', 'HSE_MANAGER', 'ADMIN_STAFF'].includes(user?.role || '') && (
                                  <button
                                    onClick={() => setEditingEmployee(emp)}
                                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-250 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                                    title={settings.language === 'fa' ? 'ویرایش مشخصات پرسنلی' : 'Edit Personnel'}
                                  >
                                    <Edit className="w-4 h-4 text-slate-500" />
                                    <span>{settings.language === 'fa' ? 'ویرایش' : 'Edit'}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // Default: Render the shelf of Binders
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 animate-in fade-in duration-300">
                    {Object.keys(binders).sort().map(binderName => {
                      const binderStyles = getBinderColor(binderName);
                      return (
                        <div 
                          key={binderName}
                          onClick={() => setSelectedBinderKey(binderName)}
                          className="bg-white border border-gray-200 hover:border-indigo-400 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex h-36 relative overflow-hidden group active:scale-98"
                        >
                          {/* Binder Spine */}
                          <div className={`w-11 md:w-12 ${binderStyles.bg} flex flex-col items-center justify-between py-3 text-white relative shrink-0 border-r border-black/10 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.25)]`}>
                            {/* Binder Ring / Pull Hole */}
                            <div className="w-5 h-5 rounded-full bg-white/15 border border-white/20 shadow-inner flex items-center justify-center relative">
                              <div className="w-3 h-3 rounded-full bg-black/35 border border-white/10" />
                            </div>

                            {/* Spine Insert Paper Label */}
                            <div className="w-7 md:w-8 bg-amber-50/95 border border-black/15 shadow-xs rounded-md py-2 px-1 flex flex-col items-center gap-1.5 my-1.5 select-none">
                              {/* Group Mode Strip */}
                              <div className="flex flex-col gap-0.5 w-full items-center">
                                <div className={`w-full h-1 rounded-xs ${binderStyles.tabColor}`} />
                                <div className="w-full h-[1px] bg-gray-200" />
                                <div className="w-full h-[1px] bg-gray-200" />
                              </div>

                              {/* Spine Label Icon */}
                              <div className="p-0.5 rounded-full bg-white shadow-2xs border border-gray-100 flex items-center justify-center">
                                {personnelGroupCriteria === 'DEPARTMENT' && (
                                  <Users className="w-3 h-3 text-indigo-650" />
                                )}
                                {personnelGroupCriteria === 'SAFETY_STATUS' && (
                                  <Shield className="w-3 h-3 text-emerald-600 animate-pulse" />
                                )}
                                {personnelGroupCriteria === 'JOB_TITLE' && (
                                  <Briefcase className="w-3 h-3 text-purple-600" />
                                )}
                              </div>

                              {/* Tiny vertical grouping indicator code */}
                              <span className="text-[7.5px] font-black text-gray-700 tracking-tighter uppercase whitespace-nowrap overflow-hidden text-center block w-full scale-90">
                                {personnelGroupCriteria === 'DEPARTMENT' && 'DEPT'}
                                {personnelGroupCriteria === 'SAFETY_STATUS' && 'HSE'}
                                {personnelGroupCriteria === 'JOB_TITLE' && 'ROLE'}
                              </span>
                            </div>

                            {/* Spine clip accent */}
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[7px] font-mono tracking-widest text-white/50 block leading-none font-black scale-90">
                                {settings.language === 'fa' ? 'HSE' : 'SAFE'}
                              </span>
                              <div className="w-4 h-0.5 bg-white/25 rounded-full" />
                            </div>
                          </div>

                          {/* Binder Contents info */}
                          <div className="flex-1 p-4 flex flex-col justify-between overflow-hidden relative">
                            {/* Color Tag Tab indicator at the top corner */}
                            <div className={`absolute top-0 ${settings.language === 'fa' ? 'left-0 rounded-br-xl' : 'right-0 rounded-bl-xl'} px-2.5 py-1 text-[8px] font-extrabold tracking-wider text-white ${binderStyles.tabColor} flex items-center gap-1 shadow-sm`}>
                              {personnelGroupCriteria === 'DEPARTMENT' && <Users className="w-2.5 h-2.5" />}
                              {personnelGroupCriteria === 'SAFETY_STATUS' && <Shield className="w-2.5 h-2.5" />}
                              {personnelGroupCriteria === 'JOB_TITLE' && <Briefcase className="w-2.5 h-2.5" />}
                              <span>{binderStyles.label}</span>
                            </div>

                            {/* Binder Name text */}
                            <div className="text-right pt-2">
                              <h4 className="font-extrabold text-sm md:text-base text-gray-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors" title={binderName}>
                                {binderName}
                              </h4>
                              <p className="text-[10px] md:text-xs text-gray-400 font-bold mt-1.5">
                                {settings.language === 'fa' ? `دسته‌بندی: ${getCriteriaLabel(personnelGroupCriteria)}` : `Category: ${getCriteriaLabel(personnelGroupCriteria)}`}
                              </p>
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-gray-100 pt-2 flex-row-reverse">
                              <span className="text-xs font-black text-indigo-700 bg-indigo-50/85 border border-indigo-100 px-2.5 py-1 rounded-lg">
                                {binders[binderName].length} {settings.language === 'fa' ? 'پرونده' : 'Files'}
                              </span>
                              <span className="text-[10px] font-extrabold text-gray-400 group-hover:text-indigo-500 transition-colors flex items-center gap-1 select-none">
                                {settings.language === 'fa' ? '← باز کردن زونکن' : 'Open Folder →'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* MANAGER APPROVAL INBOX PAGE */}
          {currentViewPage === 'INBOX' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-xs">
                <div>
                  <h2 className="text-lg md:text-xl font-black text-gray-900 flex items-center gap-2">
                    <Inbox className="w-5.5 h-5.5 text-indigo-600 animate-pulse" />
                    <span>{settings.language === 'fa' ? 'کارتابل تأیید و صندوق ورودی مدیریت' : 'Manager Approval Inbox'}</span>
                  </h2>
                  <p className="text-xs md:text-sm text-gray-500 mt-1.5 leading-relaxed">
                    {settings.language === 'fa' 
                      ? 'بررسی، تأیید و اعمال نهایی عدم انطباق‌ها و پاداش‌های ثبت شده توسط ناظران HSE، انتظامات و آموزش بر روی پرونده‌های پرسنل.'
                      : 'Review, approve, and apply pending safety infractions and incentive rewards submitted by site inspectors.'}
                  </p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 font-bold text-xs text-indigo-800 flex items-center gap-1.5 shadow-inner">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                  <span>
                    {settings.language === 'fa' 
                      ? `نقش شما: ${(TRANSLATIONS as any)[settings.language][`role_${user.role.toLowerCase()}`] || user.role}` 
                      : `Active Role: ${user.role}`}
                  </span>
                </div>
              </div>

              {/* Pending Items List */}
              {(() => {
                const pendingViolations = violations.filter(v => !v.isApproved && getCanApproveItem(v)).map(v => ({ ...v, itemType: 'VIOLATION' as const }));
                const pendingRewards = rewards.filter(r => !r.isApproved && getCanApproveItem(r)).map(r => ({ ...r, itemType: 'REWARD' as const }));
                const allPending = [...pendingViolations, ...pendingRewards].sort((a, b) => {
                  return new Date(b.date).getTime() - new Date(a.date).getTime();
                });

                if (allPending.length === 0) {
                  return (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-xs animate-in fade-in">
                      <CheckIcon className="w-12 h-12 text-emerald-500 mx-auto mb-3 p-2 bg-emerald-50 rounded-full" />
                      <h3 className="text-sm font-bold text-gray-700">
                        {settings.language === 'fa' ? 'صندوق ورودی شما خالی است!' : 'Your inbox is clear!'}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {settings.language === 'fa' ? 'هیچ مورد نیازمند تایید در کارتابل شما وجود ندارد.' : 'All logged infractions and rewards have been processed.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {allPending.map(item => {
                      const isViolation = item.itemType === 'VIOLATION';
                      const code = isViolation ? (item as any).violationCode : (item as any).rewardCode;
                      const score = item.score;
                      
                      return (
                        <div 
                          key={item.id}
                          className={`bg-white border rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center gap-5 ${
                            isViolation ? 'border-red-150 hover:border-red-300' : 'border-emerald-150 hover:border-emerald-300'
                          }`}
                        >
                          {/* Visual marker */}
                          <div className={`absolute top-0 right-0 bottom-0 w-1.5 ${
                            isViolation ? 'bg-red-500' : 'bg-emerald-500'
                          }`} />

                          {/* Core Info Details */}
                          <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isViolation ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {isViolation ? '🚫 اخطار تخلف' : '🏆 امتیاز تشویقی'}
                              </span>
                              <span className="text-[10px] text-gray-400 font-mono font-semibold">
                                {settings.language === 'fa' ? 'شناسه مورد:' : 'Log ID:'} {item.id}
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="text-[10px] text-gray-500 font-bold">
                                {settings.language === 'fa' ? 'گزارش‌دهنده:' : 'Submitted by:'} {item.reporterName} ({item.departmentSource})
                              </span>
                              <span className="text-gray-300">•</span>
                              <span className="text-[10px] text-gray-500 font-mono font-bold">
                                {item.date}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${themeStyles.lightBg} ${themeStyles.lightText}`}>
                                {item.employeeName.charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-gray-900 leading-tight">
                                  {item.employeeName}
                                  <span className="text-xs text-gray-400 font-bold mr-2">
                                    ({settings.language === 'fa' ? 'کد پرسنلی:' : 'ID:'} {item.personnelId})
                                  </span>
                                </h4>
                                <p className="text-[11px] text-gray-500 font-semibold mt-1">
                                  {settings.language === 'fa' ? 'دپارتمان کاری:' : 'Working Unit:'} {item.department}
                                </p>
                              </div>
                            </div>

                            <div className="bg-gray-50/70 border border-gray-150 rounded-xl p-3 text-xs text-gray-600 leading-relaxed space-y-1.5">
                              <div>
                                <strong className="text-gray-700">{settings.language === 'fa' ? 'شرح موضوع:' : 'Description:'}</strong>{' '}
                                {getDisplayLabel(code, isViolation ? 'VIOLATION' : 'REWARD')} ({code})
                              </div>
                              {item.description && (
                                <p className="text-gray-500 italic">
                                  {item.description}
                                </p>
                              )}
                              {isViolation && (item as any).penaltyActions && (item as any).penaltyActions.length > 0 && (
                                <div className="text-[11px] text-red-600">
                                  <strong>{settings.language === 'fa' ? 'اقدامات تنبیهی پیشنهادی:' : 'Proposed Penalty:'}</strong>{' '}
                                  {(item as any).penaltyActions.join('، ')}
                                </div>
                              )}
                              {!isViolation && (item as any).rewardsGiven && (item as any).rewardsGiven.length > 0 && (
                                <div className="text-[11px] text-emerald-700">
                                  <strong>{settings.language === 'fa' ? 'پاداش تشویقی پیشنهادی:' : 'Proposed Reward:'}</strong>{' '}
                                  {(item as any).rewardsGiven.join('، ')}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Score badge & Actions desk */}
                          <div className="flex flex-col sm:flex-row md:flex-col items-stretch md:items-end justify-between md:justify-center gap-3 shrink-0 md:border-l md:border-gray-100 md:pl-5">
                            <div className="text-center md:text-right">
                              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                                {settings.language === 'fa' ? 'تاثیر امتیاز' : 'Score Change'}
                              </span>
                              <span className={`text-lg font-black font-mono ${
                                isViolation ? 'text-red-650' : 'text-emerald-650'
                              }`} dir="ltr">
                                {isViolation ? score : `+${score}`}
                              </span>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto">
                              {/* View Dossier */}
                              <button 
                                onClick={() => setSelectedPersonnelId(item.personnelId)}
                                className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                title={settings.language === 'fa' ? 'مشاهده کامل پرونده' : 'View File'}
                              >
                                {settings.language === 'fa' ? 'سوابق' : 'Dossier'}
                              </button>

                              {/* Reject Submission */}
                              {getCanDeleteItem(item) && (
                                  <button 
                                    onClick={() => setDeleteModal({ isOpen: true, id: item.id, type: isViolation ? 'VIOLATION' : 'REWARD' })}
                                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-150 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer"
                                    title={settings.language === 'fa' ? 'رد گزارش و حذف' : 'Reject'}
                                  >
                                    {settings.language === 'fa' ? 'رد کردن' : 'Reject'}
                                  </button>
                              )}

                              {/* Approve Submission */}
                              <button 
                                onClick={() => handleApprove(item.id, isViolation ? 'VIOLATION' : 'REWARD')}
                                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                                title={settings.language === 'fa' ? 'تایید و اعمال نهایی در پرونده پرسنل' : 'Approve'}
                              >
                                <Check className="w-4 h-4 font-bold" />
                                <span>{settings.language === 'fa' ? 'تایید نهایی' : 'Approve'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500" dir={settings.language === 'fa' ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700">HSE Safewatch & Reward AI</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono font-bold">
              v{APP_VERSION}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsChangelogOpen(true)}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{settings.language === 'fa' ? '✨ آخرین تغییرات نسخه جدید' : '✨ Latest Update Changelog'}</span>
            </button>
            <span className="hidden sm:inline">|</span>
            <span dir="ltr">© 2026 HSE Safewatch</span>
          </div>
        </div>
      </footer>

      {/* Manual Add Employee Overlay Modal */}
      {isAddEmployeeOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-200 max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>{settings.language === 'fa' ? 'افزودن پرسنل جدید به سیستم' : 'Register New Employee'}</span>
              </h3>
              <button 
                onClick={() => setIsAddEmployeeOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ManualEmployeeForm 
              settings={settings}
              employees={employees}
              onAddEmployee={(newEmp) => {
                updateEmployees([...employees, newEmp]);
                setIsAddEmployeeOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && <ViolationForm currentUser={user} existingViolations={violations} employees={employees} onClose={() => setIsModalOpen(false)} onSubmit={handleAddViolation} codes={violationCodes} />}
      {isRewardModalOpen && <RewardForm currentUser={user} employees={employees} onClose={() => setIsRewardModalOpen(false)} onSubmit={handleAddReward} codes={rewardCodes} />}
      
      {/* NEW PROFILE MODAL */}
      <PersonnelProfileModal 
        isOpen={!!selectedPersonnelId} 
        onClose={() => setSelectedPersonnelId(null)} 
        personnelId={selectedPersonnelId || ''} 
        violations={violations}
        rewards={rewards}
        settings={settings}
        employees={employees}
      />
      
      <EditEmployeeModal
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        employee={editingEmployee}
        employees={employees}
        settings={settings}
        onUpdateEmployee={handleUpdateEmployee}
      />

      <TransferToBinderModal
        isOpen={isTransferModalOpen && !!selectedBinderKey}
        onClose={() => setIsTransferModalOpen(false)}
        binderKey={selectedBinderKey || ''}
        groupCriteria={personnelGroupCriteria}
        employees={employees}
        settings={settings}
        onTransferPersonnel={handleTransferPersonnel}
      />
      
      <DeleteModal isOpen={deleteModal.isOpen} onClose={() => setDeleteModal({ isOpen: false, id: null, type: 'VIOLATION' })} onConfirm={handleDelete} />
      <CodeLegendModal isOpen={isLegendOpen} onClose={() => setIsLegendOpen(false)} settings={settings} mode={systemMode} violationCodes={violationCodes} rewardCodes={rewardCodes} />
      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} settings={settings} />
      <PrintReportModal 
        isOpen={isPrintReportOpen} 
        onClose={() => setIsPrintReportOpen(false)} 
        settings={settings} 
        violations={violations} 
        rewards={rewards} 
        employees={employees} 
      />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings} 
        onUpdateSettings={handleUpdateSettings} 
        users={users} 
        onUpdateUsers={handleUpdateUsers} 
        employees={employees}
        onUpdateEmployees={updateEmployees}
        currentUser={user}
        violationCodes={violationCodes}
        onUpdateViolationCodes={handleUpdateViolationCodes}
        rewardCodes={rewardCodes}
        onUpdateRewardCodes={handleUpdateRewardCodes}
        onRestoreFullBackup={handleRestoreFullBackup}
        onOpenDatacenter={() => setIsDatacenterOpen(true)}
      />

      <DatacenterModal
        isOpen={isDatacenterOpen}
        onClose={() => setIsDatacenterOpen(false)}
        isFa={settings.language === 'fa'}
        onOpenWizard={() => setIsInitialWizardOpen(true)}
      />

      <PostgresArchitectureModal
        isOpen={isPostgresModalOpen}
        onClose={() => setIsPostgresModalOpen(false)}
      />

      <InitialSetupWizard
        isOpen={isInitialWizardOpen}
        onClose={() => setIsInitialWizardOpen(false)}
        isFa={settings.language === 'fa'}
        onComplete={() => {
          setCurrentDeploymentMode(getLocalDeploymentMode());
        }}
      />

      <OfflineSyncModal
        isOpen={isOfflineSyncOpen}
        onClose={() => setIsOfflineSyncOpen(false)}
        settings={settings}
        violations={violations}
        rewards={rewards}
        employees={employees}
        users={users}
        violationCodes={violationCodes}
        rewardCodes={rewardCodes}
        onMergeSuccess={handleOfflineMergeSuccess}
      />

      <WorkerOfMonthModal
        isOpen={isWorkerOfMonthOpen}
        onClose={() => setIsWorkerOfMonthOpen(false)}
        settings={settings}
        violations={violations}
        rewards={rewards}
        employees={employees}
        mode={systemMode}
      />

      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
        settings={settings}
      />

      {user && (
        <ChangePasswordModal 
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          currentUser={user}
          settings={settings}
          onUpdatePassword={handleUpdatePassword}
        />
      )}

      {user && (
        <EditAvatarModal
          isOpen={isEditAvatarOpen}
          onClose={() => setIsEditAvatarOpen(false)}
          currentUser={user}
          onUpdateAvatar={handleUpdateAvatar}
          settings={settings}
        />
      )}

      {/* Electron Auto-Updater Banner */}
      {updateStatus !== 'idle' && (window as any).electronAPI && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-2xl shadow-2xl p-4 text-white text-xs animate-in slide-in-from-bottom duration-300">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <RefreshCw className={`w-4 h-4 ${updateStatus === 'downloading' || updateStatus === 'checking' ? 'animate-spin' : ''}`} />
              </div>
              <div className="text-right" dir="rtl">
                <h4 className="font-bold text-xs text-gray-100">
                  {settings.language === 'fa' ? 'به‌روزرسانی نرم‌افزار' : 'Software Update'}
                </h4>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {updateStatus === 'checking' && (settings.language === 'fa' ? 'در حال بررسی نسخه‌های جدید...' : 'Checking for updates...')}
                  {updateStatus === 'available' && (settings.language === 'fa' ? `نسخه جدید ${updateInfo?.version || ''} در دسترس است` : `New version ${updateInfo?.version || ''} available`)}
                  {updateStatus === 'downloading' && (settings.language === 'fa' ? `در حال دانلود... (${Math.round(downloadProgress?.percent || 0)}%)` : `Downloading... (${Math.round(downloadProgress?.percent || 0)}%)`)}
                  {updateStatus === 'downloaded' && (settings.language === 'fa' ? 'دانلود کامل شد. آماده نصب است.' : 'Download complete. Ready to install.')}
                  {updateStatus === 'error' && (settings.language === 'fa' ? 'خطا در فرآیند به‌روزرسانی' : 'Error during update process')}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setUpdateStatus('idle')} 
              className="text-white/40 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {updateStatus === 'downloading' && (
            <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 mb-3 overflow-hidden">
              <div 
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${downloadProgress?.percent || 0}%` }}
              />
            </div>
          )}

          {updateStatus === 'available' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setUpdateStatus('downloading');
                  (window as any).electronAPI.startDownload();
                }}
                className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors text-center text-[11px]"
              >
                {settings.language === 'fa' ? 'به‌روزرسانی و دانلود نسخه جدید' : 'Download Update'}
              </button>
            </div>
          )}

          {updateStatus === 'downloaded' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  (window as any).electronAPI.quitAndInstall();
                }}
                className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors text-center text-[11px] flex items-center justify-center gap-1.5"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                <span>{settings.language === 'fa' ? 'راه‌اندازی مجدد و نصب' : 'Restart & Install'}</span>
              </button>
            </div>
          )}

          {updateStatus === 'error' && (
            <p className="text-[9px] text-red-400 mt-2 line-clamp-1 truncate text-left" title={updateErrorMsg}>
              {updateErrorMsg}
            </p>
          )}
        </div>
      )}

      {/* Real-time Network Broadcast Toast Notification */}
      {liveToast && (
        <div className="fixed top-5 left-5 z-50 max-w-sm w-auto bg-slate-900/95 text-white backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-2xl p-3.5 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto" dir="rtl">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-emerald-400 tracking-wider">
                همگام‌سازی بلادرنگ شبکه
              </span>
              <button 
                onClick={() => setLiveToast(null)}
                className="text-gray-400 hover:text-white p-0.5"
                title="بستن"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs font-semibold text-gray-100 truncate mt-0.5">
              {liveToast.message}
            </p>
            {liveToast.subtext && (
              <p className="text-[10px] text-gray-400 mt-0.5">
                {liveToast.subtext}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;