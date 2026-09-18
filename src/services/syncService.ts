import { DeploymentMode, DatacenterStatus } from '../types';

export interface LiveDbEvent {
  type: string;
  action?: string;
  version?: number;
  timestamp?: number;
  summary?: string;
  data?: any;
}

export interface ServerBackupItem {
  fileName: string;
  filename?: string;
  size: number;
  sizeBytes?: number;
  modifiedAt?: string;
  createdAt?: string;
  note?: string;
}

export function isDesktopOrNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname || '';
  const proto = window.location.protocol || '';
  return (
    host.includes('tauri') ||
    proto === 'tauri:' ||
    proto === 'capacitor:' ||
    proto === 'file:' ||
    Boolean((window as any).__TAURI__) ||
    Boolean((window as any).Capacitor)
  );
}

export async function safeParseJson(res: Response): Promise<{ ok: boolean; data: any; error?: string }> {
  try {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    if (!text || !text.trim()) {
      return { ok: false, data: null, error: 'پاسخ خالی از سرور دریافت شد.' };
    }
    const trimmed = text.trim();
    if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE') || contentType.includes('text/html')) {
      return {
        ok: false,
        data: null,
        error: 'آدرس وارد شده به وب‌سرور یا صفحه HTML هدایت می‌شود و سرویس API سرور روی آن فعال نیست. لطفا از اجرای سرور مرکزی و صحت آدرس IP و پورت (3000) اطمینان حاصل فرمایید.'
      };
    }
    const data = JSON.parse(text);
    return { ok: true, data };
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      error: `پاسخ دریافت شده معتبر نیست: ${err?.message || 'خطای تبدیل JSON'}`
    };
  }
}

const STORAGE_KEY_MODE = 'sg_deployment_mode';
const STORAGE_KEY_SERVER_URL = 'sg_serverUrl';
const STORAGE_KEY_SERVER_URL_ALT = 'sg_server_url';

export function getLocalDeploymentMode(): DeploymentMode {
  if (typeof window === 'undefined') return 'SERVER';
  try {
    const val = localStorage.getItem(STORAGE_KEY_MODE);
    if (val === 'CLIENT' || val === 'SERVER' || val === 'STANDALONE') {
      return val;
    }
  } catch {}
  return 'SERVER';
}

export function setLocalDeploymentMode(mode: DeploymentMode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  } catch {}
}

export function getServerUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const custom = localStorage.getItem(STORAGE_KEY_SERVER_URL) || localStorage.getItem(STORAGE_KEY_SERVER_URL_ALT);
    if (custom && custom.trim()) {
      let trimmed = custom.trim().replace(/\/$/, '');
      if (!/^https?:\/\//i.test(trimmed)) {
        trimmed = 'http://' + trimmed;
      }
      // If current protocol is https and custom is http (mixed content), only use if same host or explicit
      if (window.location.protocol === 'https:' && trimmed.startsWith('http://') && !trimmed.includes('localhost')) {
        return window.location.origin;
      }
      return trimmed;
    }

    // When running inside Tauri Desktop or Capacitor mobile, window.location.origin is tauri.localhost or capacitor://localhost
    // Fall back to default localhost:3000 for local central server
    if (isDesktopOrNativeApp()) {
      return 'http://localhost:3000';
    }

    return window.location.origin;
  } catch {
    return isDesktopOrNativeApp() ? 'http://localhost:3000' : '';
  }
}

export async function fetchCentralData(): Promise<any> {
  const base = getServerUrl();
  try {
    const targetUrl = base ? `${base}/api/db` : '/api/db';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Sync] Central server returned status ${res.status}`);
      return null;
    }
    const parsed = await safeParseJson(res);
    if (parsed.ok) {
      return parsed.data;
    }
    return null;
  } catch (err: any) {
    console.warn('[Sync] Central server not reachable, using local storage cache:', err?.message || err);
    return null;
  }
}

export async function syncCentralData(data: any): Promise<any> {
  const base = getServerUrl();
  try {
    const targetUrl = base ? `${base}/api/db` : '/api/db';
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(data),
    });
    const parsed = await safeParseJson(res);
    if (!res.ok || !parsed.ok) {
      let errorMsg = parsed.error || res.statusText;
      if (parsed.data && (parsed.data.error || parsed.data.message)) {
        errorMsg = parsed.data.error || parsed.data.message;
      }
      throw new Error(`خطا در همگام‌سازی اطلاعات: ${errorMsg || `HTTP ${res.status}`}`);
    }
    return parsed.data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function subscribeToLiveEvents(onEvent: (event: LiveDbEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  try {
    const base = getServerUrl();
    const targetUrl = base ? `${base}/api/events` : '/api/events';
    const eventSource = new EventSource(targetUrl);

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        console.error('[SSE] Failed to parse event', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('[SSE] EventSource connection issue:', err);
    };

    return () => {
      eventSource.close();
    };
  } catch (e) {
    console.error('[SSE] Failed to subscribe', e);
    return () => {};
  }
}

export async function fetchDatacenterStatus(): Promise<{ success: boolean; data?: DatacenterStatus; message?: string }> {
  try {
    const base = getServerUrl();
    const targetUrl = base ? `${base}/api/datacenter/status` : '/api/datacenter/status';
    const res = await fetch(targetUrl, { headers: { 'Accept': 'application/json' } });
    const parsed = await safeParseJson(res);
    if (!res.ok || !parsed.ok) {
      return { success: false, message: parsed.error || `HTTP ${res.status}` };
    }
    return { success: true, data: parsed.data };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function configureDatacenterMode(
  mode: DeploymentMode,
  serverUrl?: string
): Promise<{ success: boolean }> {
  setLocalDeploymentMode(mode);
  if (typeof window !== 'undefined') {
    if (serverUrl && serverUrl.trim()) {
      const cleanUrl = serverUrl.trim();
      localStorage.setItem(STORAGE_KEY_SERVER_URL, cleanUrl);
      localStorage.setItem(STORAGE_KEY_SERVER_URL_ALT, cleanUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY_SERVER_URL);
      localStorage.removeItem(STORAGE_KEY_SERVER_URL_ALT);
    }
  }
  return { success: true };
}

export function getFirewallScriptDownloadUrl(): string {
  const scriptContent = `@echo off
echo ===================================================
echo [SafeWatch HSE] Opening Port 3000 in Windows Firewall
echo ===================================================
netsh advfirewall firewall add rule name="SafeWatch HSE Server Port 3000" dir=in action=allow protocol=TCP localport=3000
echo Port 3000 is now accessible for workstations across LAN.
pause
`;
  return `data:text/plain;charset=utf-8,${encodeURIComponent(scriptContent)}`;
}

export function getClientShortcutDownloadUrl(serverIp: string): string {
  const shortcutContent = `@echo off
title SafeWatch HSE Workstation
echo Connecting to SafeWatch Central Server at http://${serverIp || '127.0.0.1'}:3000...
start http://${serverIp || '127.0.0.1'}:3000
`;
  return `data:text/plain;charset=utf-8,${encodeURIComponent(shortcutContent)}`;
}

export async function fetchServerBackups(): Promise<ServerBackupItem[]> {
  try {
    const base = getServerUrl();
    const targetUrl = base ? `${base}/api/backups` : '/api/backups';
    const res = await fetch(targetUrl, { headers: { 'Accept': 'application/json' } });
    const parsed = await safeParseJson(res);
    if (!res.ok || !parsed.ok) return [];
    return parsed.data?.backups || [];
  } catch {
    return [];
  }
}

export async function createServerBackup(note?: string): Promise<{ success: boolean; message: string; backup?: any }> {
  try {
    const base = getServerUrl();
    const targetUrl = base ? `${base}/api/backups` : '/api/backups';
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ note }),
    });
    const parsed = await safeParseJson(res);
    if (!res.ok || !parsed.ok) {
      return { success: false, message: parsed.error || `خطا در ایجاد پشتیبان (کد ${res.status})` };
    }
    return parsed.data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'خطا در ارتباط با سرور' };
  }
}

export async function restoreServerBackup(
  filename: string
): Promise<{ success: boolean; message: string; restoredState?: any }> {
  try {
    const base = getServerUrl();
    const targetUrl = base ? `${base}/api/backups` : '/api/backups';
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ action: 'restore', filename }),
    });
    const parsed = await safeParseJson(res);
    if (!res.ok || !parsed.ok) {
      return { success: false, message: parsed.error || `خطا در بازیابی پشتیبان (کد ${res.status})` };
    }
    return parsed.data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'خطا در ارتباط با سرور' };
  }
}

export async function deleteServerBackup(filename: string): Promise<{ success: boolean; message: string }> {
  try {
    const base = getServerUrl();
    const targetUrl = base 
      ? `${base}/api/backups?filename=${encodeURIComponent(filename)}` 
      : `/api/backups?filename=${encodeURIComponent(filename)}`;
    const res = await fetch(targetUrl, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' }
    });
    const parsed = await safeParseJson(res);
    if (!res.ok || !parsed.ok) {
      return { success: false, message: parsed.error || `خطا در حذف فایل پشتیبان (کد ${res.status})` };
    }
    return parsed.data;
  } catch (err: any) {
    return { success: false, message: err?.message || 'خطا در ارتباط با سرور' };
  }
}

export function getServerBackupDownloadUrl(filename: string): string {
  const base = getServerUrl();
  const targetUrl = base ? `${base}/api/backups/download` : '/api/backups/download';
  return `${targetUrl}?filename=${encodeURIComponent(filename)}`;
}
