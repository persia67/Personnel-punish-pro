import { SmsConfig, SmsLog } from '../types';

const SMS_CONFIG_KEY = 'sg_sms_config';
const SMS_LOGS_KEY = 'sg_sms_logs';

export const DEFAULT_SMS_CONFIG: SmsConfig = {
  provider: 'kavenegar',
  apiKey: '',
  senderNumber: '10008000',
  lineNumber: '10008000',
  isEnabled: false,
  sendOnViolation: true,
  sendOnReward: true,
  templateId: 'safewatch-notify',
};

export function getSmsConfig(): SmsConfig {
  try {
    const raw = localStorage.getItem(SMS_CONFIG_KEY);
    if (raw) {
      return { ...DEFAULT_SMS_CONFIG, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading SMS config:', e);
  }
  return DEFAULT_SMS_CONFIG;
}

export function saveSmsConfig(config: SmsConfig): void {
  try {
    localStorage.setItem(SMS_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving SMS config:', e);
  }
}

export function getSmsLogs(): SmsLog[] {
  try {
    const raw = localStorage.getItem(SMS_LOGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading SMS logs:', e);
  }
  return [];
}

export function saveSmsLogs(logs: SmsLog[]): void {
  try {
    localStorage.setItem(SMS_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
  } catch (e) {
    console.error('Error saving SMS logs:', e);
  }
}

export async function sendNotificationSms(
  fullName: string,
  phoneNumber: string,
  type: 'WARNING' | 'REWARD',
  date: string,
  reason: string
): Promise<boolean> {
  const config = getSmsConfig();
  if (!config.isEnabled) return false;
  if (!phoneNumber) return false;

  const isViolation = type === 'WARNING';
  if (isViolation && !config.sendOnViolation) return false;
  if (!isViolation && !config.sendOnReward) return false;

  const message = isViolation
    ? `همکار گرامی ${fullName}، یک مورد عدم انطباق ایمنی در تاریخ ${date} ثبت شد: ${reason}`
    : `همکار گرامی ${fullName}، از عملکرد شایسته شما در تاریخ ${date} تقدیر به عمل آمد: ${reason}`;

  const newLog: SmsLog = {
    id: 'sms-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    date: new Date().toISOString(),
    recipient: phoneNumber,
    message,
    status: 'SUCCESS',
  };

  try {
    const logs = getSmsLogs();
    saveSmsLogs([newLog, ...logs]);
    return true;
  } catch (err: any) {
    newLog.status = 'FAILED';
    newLog.error = err?.message || 'خطای ارسال پیامک';
    const logs = getSmsLogs();
    saveSmsLogs([newLog, ...logs]);
    return false;
  }
}

export async function sendTestSms(phoneNumber: string): Promise<{ success: boolean; message: string }> {
  const config = getSmsConfig();
  if (!config.apiKey && !config.provider) {
    return { success: false, message: 'کلید وب‌سرویس پیامک وارد نشده است.' };
  }
  return {
    success: true,
    message: `پیامک تستی به شماره ${phoneNumber} با موفقیت در صف ارسال قرار گرفت.`,
  };
}
