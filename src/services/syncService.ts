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

const STORAGE_KEY_MODE = 'sg_deployment_mode';
const STORAGE_KEY_SERVER_URL = 'sg_server_url';

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
    const custom = localStorage.getItem(STORAGE_KEY_SERVER_URL);
    if (custom && custom.trim()) {
      const trimmed = custom.trim().replace(/\/$/, '');
      // If current protocol is https and custom is http (mixed content), only use if same host or explicit
      if (window.location.protocol === 'https:' && trimmed.startsWith('http://') && !trimmed.includes('localhost')) {
        return window.location.origin;
      }
      return trimmed;
    }
    return window.location.origin;
  } catch {
    return '';
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
    return await res.json();
  } catch (err: any) {
    console.warn('[Sync] Central server not reachable, using local storage cache:', err?.message || err);
    return null;
  }
}

export async function syncCentralData(data: any): Promise<any> {
  const base = getServerUrl();
  try {
    const res = await fetch(`${base}/api/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      let errorMsg = res.statusText;
      try {
        const errorJson = await res.json();
        if (errorJson?.error || errorJson?.message) {
          errorMsg = errorJson.error || errorJson.message;
        }
      } catch {}
      throw new Error(`Failed to sync database: ${errorMsg || `HTTP ${res.status}`}`);
    }
    return res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function subscribeToLiveEvents(onEvent: (event: LiveDbEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  try {
    const base = getServerUrl();
    const eventSource = new EventSource(`${base}/api/events`);

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
    const res = await fetch(`${base}/api/datacenter/status`);
    if (!res.ok) {
      return { success: false, message: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: true, data };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function configureDatacenterMode(
  mode: DeploymentMode,
  serverUrl?: string
): Promise<{ success: boolean }> {
  setLocalDeploymentMode(mode);
  if (serverUrl && typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_SERVER_URL, serverUrl.trim());
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
    const res = await fetch(`${base}/api/backups`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.backups || [];
  } catch {
    return [];
  }
}

export async function createServerBackup(note?: string): Promise<{ success: boolean; message: string; backup?: any }> {
  try {
    const base = getServerUrl();
    const res = await fetch(`${base}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function restoreServerBackup(
  filename: string
): Promise<{ success: boolean; message: string; restoredState?: any }> {
  try {
    const base = getServerUrl();
    const res = await fetch(`${base}/api/backups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', filename }),
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function deleteServerBackup(filename: string): Promise<{ success: boolean; message: string }> {
  try {
    const base = getServerUrl();
    const res = await fetch(`${base}/api/backups?filename=${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    return json;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export function getServerBackupDownloadUrl(filename: string): string {
  const base = getServerUrl();
  return `${base}/api/backups/download?filename=${encodeURIComponent(filename)}`;
}
