export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export type Role =
  | 'DEVELOPER'
  | 'PLANT_MANAGER'
  | 'HR_MANAGER'
  | 'HSE_MANAGER'
  | 'HSE_OFFICER'
  | 'SECURITY_MANAGER'
  | 'SECURITY_GUARD'
  | 'TRAINING_MANAGER'
  | 'ADMIN_STAFF'
  | 'DEPARTMENT_MANAGER';

export type Department = 'HSE' | 'SECURITY' | 'TRAINING' | 'ADMIN' | string;

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: Role;
  avatar?: string;
  managedDepartment?: string;
  phoneNumber?: string;
  email?: string;
  telegramUsername?: string;
}

export interface Employee {
  id: string;
  personnelId: string;
  fullName: string;
  department: string;
  jobTitle?: string;
  nationalId?: string;
  hireDate?: string;
  phoneNumber?: string;
  avatar?: string;
}

export interface CodeItem {
  id: string;
  code: number;
  label: string;
  score: number;
  department: string;
}

export interface Violation {
  id: string;
  employeeName: string;
  personnelId: string;
  department: string;
  departmentSource: string;
  reporterName: string;
  date: string;
  violationType: string;
  violationCode: number;
  description: string;
  severity: Severity;
  score: number;
  penaltyActions: string[];
  violationStage: number;
  status: string;
  isApproved: boolean;
  isArchived: boolean;
  evidence?: string;
  actionTaken?: string;
  appealReason?: string;
  appealStatus?: string;
  committeeVerdict?: string;
  committeeDate?: string;
}

export interface Reward {
  id: string;
  employeeName: string;
  personnelId: string;
  department: string;
  departmentSource: string;
  reporterName: string;
  date: string;
  rewardType: string;
  rewardCode: number;
  description: string;
  score: number;
  rewardsGiven: string[];
  isApproved: boolean;
  isArchived: boolean;
  evidence?: string;
}

export type RewardType = string;

export type SystemMode = 'VIOLATION' | 'REWARD';

export interface WorkerOfMonthResult {
  winnerId: string;
  winnerName: string;
  reasoning: string;
  period: string;
  score?: number;
  winner?: Employee;
  violationsCount?: number;
  rewardsCount?: number;
  candidates?: any[];
}

export interface N8nConfig {
  isEnabled: boolean;
  baseUrl: string;
  webhookPath: string;
  apiKey: string;
  nodeId: string;
  triggerOnViolation: boolean;
  triggerOnReward: boolean;
  triggerOnEmployee: boolean;
  triggerOnSync: boolean;
  interconnectEnabled: boolean;
  interconnectWebhookUrl: string;
  autoRelayToInterconnectNodes: boolean;
}

export interface SmsConfig {
  provider: string;
  apiKey: string;
  senderNumber: string;
  lineNumber?: string;
  isEnabled: boolean;
  sendOnViolation: boolean;
  sendOnReward: boolean;
  templateId?: string;
}

export interface SmsLog {
  id: string;
  date: string;
  recipient: string;
  message: string;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}

export type ThemeColor = 'blue' | 'purple' | 'green' | 'red' | 'amber' | 'teal' | 'indigo';

export type Language = 'fa' | 'en';

export interface AppSettings {
  language: Language;
  themeColor: ThemeColor;
  companyLogo: string;
  companyName: string;
  customApiKey: string;
  aiProvider: 'GEMINI' | 'OLLAMA' | 'LOCAL_HF';
  ollamaUrl: string;
  ollamaModel: string;
  localHfUrl: string;
  localHfModel: string;
  autoOfflineFailover: boolean;
  defaultLoginDepartment: string;
  n8nConfig?: N8nConfig;
  smsConfig?: SmsConfig;
}

export type DeploymentMode = 'STANDALONE' | 'SERVER' | 'CLIENT';

export interface DatacenterStatus {
  primaryIp: string;
  port: number;
  mode: DeploymentMode;
  activeClientsCount: number;
  networkInterfaces: { name: string; address: string; family: string; internal: boolean }[];
  dbStats?: {
    dbSizeBytes: number;
    backupsCount: number;
    violationsCount?: number;
    rewardsCount?: number;
    employeesCount?: number;
  };
  os?: {
    hostname: string;
    platform: string;
    arch: string;
    freeMemMb: number;
    totalMemMb: number;
    uptimeSeconds: number;
  };
  database?: string;
  isOnline?: boolean;
}
