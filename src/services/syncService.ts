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
export const STORAGE_KEY_SERVER_LAN_IP = 'sg_server_lan_ip';

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

export function getServerLanIp(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_KEY_SERVER_LAN_IP) || '';
  } catch {
    return '';
  }
}

export function setServerLanIp(ip: string): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanIp = (ip || '').trim().replace(/^https?:\/\//i, '').split(':')[0].replace(/\/.*$/, '');
    if (cleanIp) {
      localStorage.setItem(STORAGE_KEY_SERVER_LAN_IP, cleanIp);
      const fullUrl = `http://${cleanIp}:3000`;
      localStorage.setItem(STORAGE_KEY_SERVER_URL, fullUrl);
      localStorage.setItem(STORAGE_KEY_SERVER_URL_ALT, fullUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY_SERVER_LAN_IP);
    }
  } catch {}
}

/**
 * Detect local IPv4 addresses (such as 10.1.1.17) in client runtime using WebRTC
 */
export async function detectLocalIpsWebRTC(): Promise<string[]> {
  if (typeof window === 'undefined' || !(window as any).RTCPeerConnection) {
    return [];
  }
  return new Promise((resolve) => {
    const ips = new Set<string>();
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.onicecandidate = (event) => {
        if (!event || !event.candidate) {
          pc.close();
          resolve(Array.from(ips));
          return;
        }
        const cand = event.candidate.candidate;
        // Match private IPv4: 10.x.x.x, 192.168.x.x, 172.16-31.x.x
        const matches = cand.match(/\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g);
        if (matches) {
          matches.forEach(ip => ips.add(ip));
        }
      };
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          pc.close();
          resolve(Array.from(ips));
        });

      // Timeout after 1.5 seconds if ICE gathering takes too long
      setTimeout(() => {
        try { pc.close(); } catch {}
        resolve(Array.from(ips));
      }, 1500);
    } catch {
      resolve([]);
    }
  });
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
      return trimmed;
    }

    const savedLanIp = getServerLanIp();
    if (savedLanIp) {
      return `http://${savedLanIp}:3000`;
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

export function getFirewallScriptDownloadUrl(osType: 'windows' | 'linux' = 'windows'): string {
  if (osType === 'linux') {
    const linuxScript = `#!/usr/bin/env bash
echo "==================================================="
echo "[SafeWatch HSE] Opening Port 3000 in Linux Firewall"
echo "==================================================="
if command -v ufw >/dev/null 2>&1; then
    sudo ufw allow 3000/tcp comment 'SafeWatch HSE Server Port 3000'
    echo "[OK] UFW rule applied for port 3000."
fi
if command -v firewall-cmd >/dev/null 2>&1; then
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
    echo "[OK] Firewalld rule applied for port 3000."
fi
if command -v iptables >/dev/null 2>&1; then
    sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
    echo "[OK] iptables rule added for port 3000."
fi
echo "Port 3000 is open."
`;
    return `data:text/plain;charset=utf-8,${encodeURIComponent(linuxScript)}`;
  }

  const scriptContent = `@echo off
title SafeWatch HSE - Firewall Configuration
color 0A
chcp 65001 >nul
echo ===================================================
echo [SafeWatch HSE] Opening Port 3000 in Windows Firewall
echo ===================================================
echo.
netsh advfirewall firewall add rule name="SafeWatch HSE Server Port 3000" dir=in action=allow protocol=TCP localport=3000
if %errorlevel% equ 0 (
    echo [OK] Port 3000 is now open and accessible for all workstations.
) else (
    echo [!] Note: Please right-click and 'Run as administrator' to apply firewall rules.
)
echo.
pause
`;
  return `data:text/plain;charset=utf-8,${encodeURIComponent(scriptContent)}`;
}

export function getServerLauncherScriptDownloadUrl(port: number = 3000): string {
  const scriptContent = `@echo off
@setlocal EnableDelayedExpansion
title SafeWatch HSE - Central Server Console
color 0A
chcp 65001 >nul 2>&1

echo ====================================================================
echo        SafeWatch HSE Enterprise Central Server (v4.16.0)
echo    Central Intranet Server for Safety ^& Health Department
echo ====================================================================
echo.

REM 1. Auto-discover Node.js from standard installation paths if not in PATH
where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\\nodejs\\node.exe" (
        set "PATH=%ProgramFiles%\\nodejs;!PATH!"
    ) else if exist "%ProgramFiles(x86)%\\nodejs\\node.exe" (
        set "PATH=%ProgramFiles(x86)%\\nodejs;!PATH!"
    ) else if exist "%LOCALAPPDATA%\\Programs\\nodejs\\node.exe" (
        set "PATH=%LOCALAPPDATA%\\Programs\\nodejs;!PATH!"
    ) else if exist "%APPDATA%\\npm" (
        set "PATH=%APPDATA%\\npm;!PATH!"
    )
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not found on this system.
    echo.
    echo Please install Node.js (LTS recommended) from:
    echo https://nodejs.org
    echo.
    echo After installation, run this file again.
    echo.
    pause
    exit /b 1
)

REM 2. Determine target port
set "SERVER_PORT=${port}"
if not "%~1"=="" set "SERVER_PORT=%~1"

REM 3. Safely apply Windows Firewall rule
echo [*] Checking Windows Firewall rule for Port !SERVER_PORT!...
netsh advfirewall firewall show rule name="SafeWatch HSE Server Port !SERVER_PORT!" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="SafeWatch HSE Server Port !SERVER_PORT!" dir=in action=allow protocol=TCP localport=!SERVER_PORT! >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] Port !SERVER_PORT! opened in Windows Firewall.
    ) else (
        echo [!] Note: To configure firewall automatically, run as Administrator.
    )
) else (
    echo [OK] Firewall rule for Port !SERVER_PORT! is active.
)

REM 4. Set environment and launch
set "PORT=!SERVER_PORT!"
set "HOST=0.0.0.0"
set "RUN_STANDALONE=true"

echo.
echo [*] Starting Central Server on Port !SERVER_PORT!...
echo.

node scripts\\start-server.js !SERVER_PORT!

if %errorlevel% neq 0 (
    echo.
    echo [!] Server process exited with code %errorlevel%
    pause
)
`;
  return `data:text/plain;charset=utf-8,${encodeURIComponent(scriptContent)}`;
}

export function getClientShortcutDownloadUrl(serverIp: string, port: number = 3000): string {
  const cleanIp = (serverIp || '10.1.1.17').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').split(':')[0] || '10.1.1.17';
  const targetUrl = `http://${cleanIp}:${port}`;

  const shortcutContent = `@echo off
title SafeWatch HSE Workstation Connection
color 0B
chcp 65001 >nul

echo ====================================================================
echo         SafeWatch HSE Workstation Setup
echo ====================================================================
echo Connecting to Central Server at ${targetUrl}...
echo.

:: Create Desktop Shortcut via PowerShell
set "TARGET_URL=${targetUrl}"
set "SHORTCUT_PATH=%USERPROFILE%\\Desktop\\SafeWatch HSE.url"

echo [InternetShortcut] > "%SHORTCUT_PATH%"
echo URL=%TARGET_URL% >> "%SHORTCUT_PATH%"
echo IconIndex=0 >> "%SHORTCUT_PATH%"

echo [✓] Desktop shortcut created: "%USERPROFILE%\\Desktop\\SafeWatch HSE"
echo [✓] Launching browser to ${targetUrl}...
start "" "%TARGET_URL%"
`;
  return `data:text/plain;charset=utf-8,${encodeURIComponent(shortcutContent)}`;
}

export async function testServerPing(targetUrl: string): Promise<{ success: boolean; latencyMs: number; data?: any; error?: string }> {
  const start = performance.now();
  try {
    let clean = (targetUrl || '').trim();
    if (!clean) return { success: false, latencyMs: 0, error: 'آدرس سرور خالی است.' };
    if (!/^https?:\/\//i.test(clean)) {
      clean = 'http://' + clean;
    }
    const endpoint = clean.endsWith('/') ? `${clean}api/health` : `${clean}/api/health`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(endpoint, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const latencyMs = Math.round(performance.now() - start);
    const parsed = await safeParseJson(res);
    if (res.ok && parsed.ok) {
      return { success: true, latencyMs, data: parsed.data };
    }
    return { success: false, latencyMs, error: parsed.error || `کد خطا: ${res.status}` };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return { success: false, latencyMs, error: err?.message || 'عدم دسترسی به سرور' };
  }
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
