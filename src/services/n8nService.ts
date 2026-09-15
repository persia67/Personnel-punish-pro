import { N8nConfig, AppSettings } from '../types';

export interface N8nWebhookPayload {
  event: 'VIOLATION_REGISTERED' | 'VIOLATION_UPDATED' | 'REWARD_REGISTERED' | 'REWARD_UPDATED' | 'EMPLOYEE_UPDATED' | 'SYSTEM_SYNC_COMPLETED' | 'TEST_CONNECTION' | 'INTERCONNECT_RELAY';
  nodeId: string;
  sourceCompany?: string;
  timestamp: string;
  data: any;
  meta?: {
    appVersion: string;
    environment: string;
  };
}

export interface N8nResponse {
  success: boolean;
  statusCode?: number;
  message: string;
  responseData?: any;
  responseTimeMs?: number;
}

/**
 * Dispatches a webhook to the configured n8n server.
 * Uses local Express backend proxy endpoint `/api/n8n/trigger` first to bypass browser CORS constraints,
 * falling back to direct client fetch if needed.
 */
export async function sendN8nWebhook(
  event: N8nWebhookPayload['event'],
  data: any,
  n8nConfig?: N8nConfig,
  settings?: AppSettings
): Promise<N8nResponse> {
  const config = n8nConfig || settings?.n8nConfig;
  
  if (!config || !config.isEnabled) {
    return {
      success: false,
      message: 'سرویس اتوماسیون n8n غیرفعال است.'
    };
  }

  // Check event trigger filters
  if (event.startsWith('VIOLATION') && config.triggerOnViolation === false) {
    return { success: false, message: 'ارسال رویدادهای تخلف به n8n غیرفعال شده است.' };
  }
  if (event.startsWith('REWARD') && config.triggerOnReward === false) {
    return { success: false, message: 'ارسال رویدادهای تشویقی به n8n غیرفعال شده است.' };
  }
  if (event.startsWith('EMPLOYEE') && config.triggerOnEmployee === false) {
    return { success: false, message: 'ارسال رویدادهای پرسنل به n8n غیرفعال شده است.' };
  }
  if (event.startsWith('SYSTEM_SYNC') && config.triggerOnSync === false) {
    return { success: false, message: 'ارسال رویدادهای همگام‌سازی به n8n غیرفعال شده است.' };
  }

  const payload: N8nWebhookPayload = {
    event,
    nodeId: config.nodeId || 'SafeWatch-Node',
    sourceCompany: settings?.companyName || 'SafeWatch HSE System',
    timestamp: new Date().toISOString(),
    data,
    meta: {
      appVersion: '4.9.0',
      environment: 'Company Internal Network'
    }
  };

  const startTime = Date.now();

  try {
    // 1. Try sending through local Express backend proxy
    const proxyRes = await fetch('/api/n8n/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        n8nConfig: config,
        payload
      })
    });

    const proxyData = await proxyRes.json().catch(() => null);
    const duration = Date.now() - startTime;

    if (proxyRes.ok && proxyData?.success) {
      return {
        success: true,
        statusCode: proxyData.statusCode || 200,
        message: proxyData.message || 'وب‌هوک با موفقیت به n8n ارسال شد.',
        responseData: proxyData.responseData,
        responseTimeMs: duration
      };
    }

    // 2. Fallback: Try direct browser fetch if server proxy endpoint isn't available
    const cleanBaseUrl = (config.baseUrl || '').replace(/\/+$/, '');
    const cleanPath = (config.webhookPath || '/webhook/safewatch-events').startsWith('/') 
      ? config.webhookPath 
      : `/${config.webhookPath}`;
    const targetUrl = cleanPath.startsWith('http://') || cleanPath.startsWith('https://') 
      ? cleanPath 
      : `${cleanBaseUrl}${cleanPath}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      headers['X-N8N-API-KEY'] = config.apiKey;
    }

    const directRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const directData = await directRes.json().catch(() => null);
    const directDuration = Date.now() - startTime;

    if (directRes.ok) {
      return {
        success: true,
        statusCode: directRes.status,
        message: `وب‌هوک مستقیماً به n8n (${targetUrl}) ارسال شد.`,
        responseData: directData,
        responseTimeMs: directDuration
      };
    } else {
      return {
        success: false,
        statusCode: directRes.status,
        message: proxyData?.message || `پاسخ ناموفق از n8n (کد ${directRes.status})`,
        responseData: directData,
        responseTimeMs: directDuration
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `خطا در برقراری ارتباط با اتوماسیون n8n: ${err.message || 'شبکه غیرقابل دسترس است'}`,
      responseTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Sends a test ping payload to n8n to verify connection
 */
export async function testN8nConnection(config: N8nConfig, companyName?: string): Promise<N8nResponse> {
  const testPayload = {
    testMessage: 'SafeWatch n8n Interconnectivity Ping Test',
    systemStatus: 'ONLINE',
    pingTime: new Date().toISOString()
  };

  return sendN8nWebhook('TEST_CONNECTION', testPayload, { ...config, isEnabled: true }, { companyName } as AppSettings);
}

/**
 * Dispatches inter-software interconnectivity sync data via n8n relay
 */
export async function sendInterconnectRelay(syncPacket: any, config: N8nConfig, settings?: AppSettings): Promise<N8nResponse> {
  if (!config.interconnectEnabled) {
    return { success: false, message: 'قابلیت تبادل بین‌سیستمی (Interconnectivity) غیرفعال است.' };
  }

  const payload: N8nWebhookPayload = {
    event: 'INTERCONNECT_RELAY',
    nodeId: config.nodeId || 'SafeWatch-Node',
    sourceCompany: settings?.companyName || 'SafeWatch System',
    timestamp: new Date().toISOString(),
    data: syncPacket,
    meta: {
      appVersion: '4.9.0',
      environment: 'SafeWatch Node-to-Node Interconnect'
    }
  };

  try {
    const targetUrl = config.interconnectWebhookUrl || `${config.baseUrl.replace(/\/+$/, '')}/webhook/safewatch-interconnect`;
    const res = await fetch('/api/n8n/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        n8nConfig: { ...config, webhookPath: targetUrl },
        payload
      })
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      return {
        success: true,
        message: 'بسته داده بین‌سیستمی با موفقیت به شبکه‌گذار n8n ارسال شد.',
        responseData: data.responseData
      };
    }
    return {
      success: false,
      message: data?.message || 'خطا در ارسال بسته بین‌سیستمی به n8n'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `خطای ارتباط شبکه در تبادل بین‌سیستمی: ${err.message}`
    };
  }
}
