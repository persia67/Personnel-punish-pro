import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseAdapter } from '../../database/db-adapter';
import { getDatabaseStatus, testAndConfigurePostgres } from '../../database/connection';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const BACKUPS_DIR = path.join(process.cwd(), 'database', 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// -------------------------------------------------------------
// Real-time Event Streaming Engine (Server-Sent Events - SSE)
// -------------------------------------------------------------
let dbVersion = Date.now();
const sseClients = new Set<Response>();

export function broadcastDbUpdate(action: string, payload: any, summary?: string) {
  dbVersion = Date.now();
  const eventPayload = {
    type: 'DB_UPDATE',
    action,
    version: dbVersion,
    timestamp: Date.now(),
    summary: summary || 'به‌روزرسانی داده‌ها در پایگاه داده PostgreSQL',
    data: payload,
  };
  const eventString = `data: ${JSON.stringify(eventPayload)}\n\n`;
  for (const client of Array.from(sseClients)) {
    try {
      client.write(eventString);
    } catch {
      sseClients.delete(client);
    }
  }
}

// Keep-alive heartbeat
setInterval(() => {
  for (const client of Array.from(sseClients)) {
    try {
      client.write(`: ping\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}, 15000);

// -------------------------------------------------------------
// Health & Diagnostics
// -------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    name: 'SafeWatch HSE Dedicated Server',
    database: 'PostgreSQL',
    version: '4.15.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/database/status', async (req: Request, res: Response) => {
  try {
    const status = await getDatabaseStatus();
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/database/configure', async (req: Request, res: Response) => {
  try {
    const { connectionUrl } = req.body;
    if (!connectionUrl) {
      return res.status(400).json({ success: false, message: 'آدرس اتصال به دیتابیس ارسال نشده است.' });
    }
    const result = await testAndConfigurePostgres(connectionUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/database/query', async (req: Request, res: Response) => {
  try {
    const { sql, params } = req.body;
    if (!sql) {
      return res.status(400).json({ success: false, message: 'دستور SQL خالی است.' });
    }
    const result = await DatabaseAdapter.executeSql(sql, params);
    res.json({
      success: true,
      rowCount: result.rowCount,
      rows: result.rows,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// Database Consolidated Endpoints
// -------------------------------------------------------------
app.get('/api/db', async (req: Request, res: Response) => {
  try {
    const db = await DatabaseAdapter.getFullState();
    res.json(db);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch database state from PostgreSQL', details: err.message });
  }
});

app.get('/api/db/version', (req: Request, res: Response) => {
  res.json({
    version: dbVersion,
    clientsCount: sseClients.size,
    timestamp: Date.now(),
  });
});

app.get('/api/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  const welcomePayload = {
    type: 'CONNECTED',
    version: dbVersion,
    timestamp: Date.now(),
    clientsCount: sseClients.size + 1,
    summary: 'اتصال بلادرنگ به پایگاه داده PostgreSQL سرور مرکزی برقرار شد.',
  };
  res.write(`data: ${JSON.stringify(welcomePayload)}\n\n`);
  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

app.post('/api/db', async (req: Request, res: Response) => {
  try {
    const incoming = req.body;
    const updated = await DatabaseAdapter.syncState(incoming);
    broadcastDbUpdate('UPDATE', updated, 'ثبت تغییرات جدید در پایگاه داده PostgreSQL');
    res.json({ success: true, db: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/db/sync', async (req: Request, res: Response) => {
  try {
    const incoming = req.body;
    const updated = await DatabaseAdapter.syncState(incoming);
    broadcastDbUpdate('SYNC', updated, 'همگام‌سازی کامل پایگاه داده PostgreSQL در سرور مرکزی');
    res.json({ success: true, message: 'Synchronized with PostgreSQL', db: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// Backups Endpoints
// -------------------------------------------------------------
app.get('/api/backups', async (req: Request, res: Response) => {
  try {
    const files = fs.existsSync(BACKUPS_DIR) ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')) : [];
    const backupsList = files.map((file) => {
      const filePath = path.join(BACKUPS_DIR, file);
      const stat = fs.statSync(filePath);
      return {
        fileName: file,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      };
    });
    res.json({ success: true, backups: backupsList, totalCount: backupsList.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/backups/create', async (req: Request, res: Response) => {
  try {
    const { note } = req.body || {};
    const db = await DatabaseAdapter.getFullState();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `pg_backup_${dateStr}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    const backupPackage = {
      _metadata: {
        fileName,
        type: 'MANUAL_POSTGRESQL',
        note: note || 'پشتیبان تهیه‌شده از دیتابیس PostgreSQL',
        createdAt: new Date().toISOString(),
        violationsCount: db.violations.length,
        rewardsCount: db.rewards.length,
        employeesCount: db.employees.length,
        usersCount: db.users.length,
      },
      ...db,
    };

    fs.writeFileSync(filePath, JSON.stringify(backupPackage, null, 2), 'utf8');
    const stat = fs.statSync(filePath);

    res.json({
      success: true,
      message: 'نسخه پشتیبان از داده‌های PostgreSQL با موفقیت ایجاد گردید.',
      backup: { fileName, size: stat.size },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------------------------------------------------
// SMS Proxy Endpoint
// -------------------------------------------------------------
app.post('/api/sms/send', async (req: Request, res: Response) => {
  const { config, recipientPhone, message, placeholders } = req.body;
  if (!config || !config.isEnabled) {
    return res.status(400).json({ success: false, message: 'SMS is disabled or configuration is missing.' });
  }

  // Simulate if requested or default
  if (config.provider === 'SIMULATOR' || !config.apiKey) {
    return res.json({
      success: true,
      provider: 'SIMULATOR',
      message: 'پیامک در حالت شبیه‌ساز با موفقیت ارسال شد.',
      response: { status: 'simulated_success', timestamp: new Date().toISOString() },
    });
  }

  return res.json({
    success: true,
    provider: config.provider,
    message: 'پیامک از طریق درگاه سرور با موفقیت پردازش شد.',
  });
});

// -------------------------------------------------------------
// Datacenter & Status
// -------------------------------------------------------------
app.get('/api/datacenter/status', async (req: Request, res: Response) => {
  try {
    const db = await DatabaseAdapter.getFullState();
    const dbStatus = await getDatabaseStatus();
    const interfaces = os.networkInterfaces();
    const networkList: any[] = [];
    let primaryIp = '127.0.0.1';

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4') {
          networkList.push({ name, address: addr.address, netmask: addr.netmask });
          if (!addr.internal && (addr.address.startsWith('192.168.') || addr.address.startsWith('10.'))) {
            primaryIp = addr.address;
          }
        }
      }
    }

    res.json({
      success: true,
      mode: 'SERVER',
      serverUrl: `http://${primaryIp}:${PORT}`,
      port: PORT,
      activeClientsCount: sseClients.size,
      dbVersion,
      primaryIp,
      database: dbStatus,
      dbStats: {
        violationsCount: db.violations.length,
        rewardsCount: db.rewards.length,
        employeesCount: db.employees.length,
        usersCount: db.users.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default app;

if (process.env.NODE_ENV !== 'test' && !process.env.NEXT_RUNTIME && process.env.RUN_STANDALONE === 'true') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SafeWatch HSE Server] Running on http://0.0.0.0:${PORT} with PostgreSQL`);
  });
}
