import { Pool, PoolConfig } from 'pg';
import { newDb, IMemoryDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';

export interface DatabaseStatus {
  engine: 'POSTGRESQL_REMOTE' | 'POSTGRESQL_MEM';
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
  version: string;
  totalTables: number;
  tables: Record<string, number>;
  lastQueryTimestamp?: string;
  connectionError?: string | null;
}

let activePool: Pool | null = null;
let memDb: IMemoryDb | null = null;
let memAdapter: any = null;
let isUsingMemDb = false;
let lastInitError: string | null = null;

const SNAPSHOT_DIR = path.join(process.cwd(), 'database', 'data');
const SNAPSHOT_FILE = path.join(SNAPSHOT_DIR, 'pg_snapshot.json');

// Ensure snapshot directory exists
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

function getDatabaseConfig(): { isConfigured: boolean; config: PoolConfig; description: string } {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (url && (url.startsWith('postgres://') || url.startsWith('postgresql://'))) {
    return {
      isConfigured: true,
      config: {
        connectionString: url,
        ssl: url.includes('sslmode=require') || url.includes('supabase') || url.includes('neon') ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000,
      },
      description: `URL: ${url.split('@')[1] || 'remote'}`,
    };
  }

  const host = process.env.PGHOST || process.env.SQL_HOST || '';
  const user = process.env.PGUSER || process.env.SQL_USER || '';
  const password = process.env.PGPASSWORD || process.env.SQL_PASSWORD || '';
  const database = process.env.PGDATABASE || process.env.SQL_DB_NAME || '';
  const port = parseInt(process.env.PGPORT || '5432', 10);

  if (host && (user || database)) {
    return {
      isConfigured: true,
      config: {
        host,
        port,
        user,
        password,
        database,
        connectionTimeoutMillis: 5000,
      },
      description: `${user}@${host}:${port}/${database}`,
    };
  }

  return {
    isConfigured: false,
    config: {},
    description: 'PostgreSQL In-Memory Engine (pg-mem compliant)',
  };
}

/**
 * Initialize in-memory PostgreSQL instance with schema & seed
 */
function initMemPostgres() {
  if (memDb && memAdapter) {
    return memAdapter;
  }

  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });

  // Register common PostgreSQL extensions/functions
  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 16.2 (pg-mem compliant engine)',
  });

  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  const seedPath = path.join(process.cwd(), 'database', 'seed.sql');

  let schemaSql = '';
  if (fs.existsSync(schemaPath)) {
    schemaSql = fs.readFileSync(schemaPath, 'utf8');
  } else {
    schemaSql = `
      CREATE TABLE IF NOT EXISTS users (id VARCHAR(64) PRIMARY KEY, username VARCHAR(128) UNIQUE, password VARCHAR(256), full_name VARCHAR(256), role VARCHAR(64), avatar TEXT, managed_department VARCHAR(128), phone_number VARCHAR(64), email VARCHAR(256), telegram_username VARCHAR(128), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS employees (id VARCHAR(64) PRIMARY KEY, personnel_id VARCHAR(64) UNIQUE, full_name VARCHAR(256), department VARCHAR(128), job_title VARCHAR(128), national_id VARCHAR(32), hire_date VARCHAR(32), phone_number VARCHAR(64), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS violation_codes (id VARCHAR(64) PRIMARY KEY, code INTEGER UNIQUE, label TEXT, score INTEGER, department VARCHAR(128), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS reward_codes (id VARCHAR(64) PRIMARY KEY, code INTEGER UNIQUE, label TEXT, score INTEGER, department VARCHAR(128), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS violations (id VARCHAR(64) PRIMARY KEY, employee_name VARCHAR(256), personnel_id VARCHAR(64), department VARCHAR(128), department_source VARCHAR(128), reporter_name VARCHAR(256), date VARCHAR(32), violation_type VARCHAR(256), violation_code INTEGER, description TEXT, reason TEXT, severity VARCHAR(32), score INTEGER, penalty_actions JSONB DEFAULT '[]', violation_stage INTEGER DEFAULT 1, evidence TEXT, is_archived BOOLEAN DEFAULT FALSE, committee_verdict TEXT, status VARCHAR(32) DEFAULT 'Pending', is_approved BOOLEAN DEFAULT FALSE, rejection_reason TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS rewards (id VARCHAR(64) PRIMARY KEY, employee_name VARCHAR(256), personnel_id VARCHAR(64), department VARCHAR(128), department_source VARCHAR(128), reporter_name VARCHAR(256), date VARCHAR(32), reward_type VARCHAR(128), reward_code INTEGER, description TEXT, reason TEXT, score INTEGER, rewards_given JSONB DEFAULT '[]', evidence TEXT, is_approved BOOLEAN DEFAULT FALSE, is_archived BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS system_settings (id VARCHAR(64) PRIMARY KEY, settings_json JSONB NOT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS sms_logs (id VARCHAR(64) PRIMARY KEY, recipient_name VARCHAR(256), recipient_phone VARCHAR(64), type VARCHAR(32), message TEXT, date VARCHAR(32), status VARCHAR(32), provider VARCHAR(64), response_message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS backups_metadata (id VARCHAR(64) PRIMARY KEY, file_name VARCHAR(256), backup_type VARCHAR(32), note TEXT, violations_count INTEGER, rewards_count INTEGER, employees_count INTEGER, users_count INTEGER, size_bytes BIGINT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    `;
  }

  // Sanitize PostgreSQL DDL for pg-mem compatibility
  const cleanSchema = schemaSql
    .replace(/TIMESTAMPTZ/gi, 'TIMESTAMP')
    .replace(/::jsonb/gi, '')
    .replace(/JSONB/gi, 'JSON');

  try {
    db.public.none(cleanSchema);
  } catch (err) {
    console.warn('[PostgreSQL Engine] Schema setup notice:', err);
  }

  // Execute seed if available and snapshot does not exist
  if (fs.existsSync(SNAPSHOT_FILE)) {
    try {
      const snapData = JSON.parse(fs.readFileSync(SNAPSHOT_FILE, 'utf8'));
      restoreFromSnapshot(db, snapData);
      console.log('[PostgreSQL Engine] Restored snapshot from disk');
    } catch (e) {
      console.error('[PostgreSQL Engine] Error loading snapshot, running seed:', e);
      runSeed(db, seedPath);
    }
  } else {
    runSeed(db, seedPath);
  }

  memDb = db;
  memAdapter = db.adapters.createPg();
  isUsingMemDb = true;

  return memAdapter;
}

function runSeed(db: IMemoryDb, seedPath: string) {
  if (fs.existsSync(seedPath)) {
    try {
      const seedSql = fs.readFileSync(seedPath, 'utf8')
        .replace(/::jsonb/gi, '')
        .replace(/TIMESTAMPTZ/gi, 'TIMESTAMP');
      
      const statements = seedSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const stmt of statements) {
        try {
          db.public.none(stmt);
        } catch (e) {
          // Ignore unique conflicts or partial seed issues
        }
      }
    } catch (err) {
      console.warn('[PostgreSQL Engine] Seed error:', err);
    }
  }
}

function restoreFromSnapshot(db: IMemoryDb, snapshot: any) {
  if (!snapshot || typeof snapshot !== 'object') return;
  for (const [table, rows] of Object.entries(snapshot)) {
    if (Array.isArray(rows)) {
      for (const row of rows) {
        try {
          const cols = Object.keys(row);
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
          const values = Object.values(row);
          const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`;
          db.public.query(sql, values);
        } catch {
          // ignore row restoration conflict
        }
      }
    }
  }
}

export function saveSnapshot() {
  if (!memDb || !isUsingMemDb) return;
  try {
    const tables = ['users', 'employees', 'violation_codes', 'reward_codes', 'violations', 'rewards', 'system_settings', 'sms_logs', 'backups_metadata'];
    const snapshot: Record<string, any[]> = {};
    for (const tbl of tables) {
      try {
        const res = memDb.public.many(`SELECT * FROM ${tbl};`);
        snapshot[tbl] = res;
      } catch {
        snapshot[tbl] = [];
      }
    }
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (err) {
    console.error('[PostgreSQL Engine] Snapshot save error:', err);
  }
}

/**
 * Execute a SQL query on PostgreSQL (either Remote PostgreSQL Pool or Embedded PostgreSQL Engine)
 */
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  const { isConfigured, config } = getDatabaseConfig();

  // Try Remote PostgreSQL first if configured
  if (isConfigured && !isUsingMemDb) {
    try {
      if (!activePool) {
        activePool = new Pool(config);
        activePool.on('error', (err) => {
          console.error('[PostgreSQL Pool] Unexpected error on idle client:', err);
        });
      }
      const client = await activePool.connect();
      try {
        const res = await client.query(text, params);
        return { rows: res.rows as T[], rowCount: res.rowCount || res.rows.length };
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn(`[PostgreSQL Remote] Connection failed (${err.message}). Falling back to Embedded PostgreSQL Engine.`);
      lastInitError = err.message;
      isUsingMemDb = true;
    }
  }

  // Use Embedded PostgreSQL Engine
  initMemPostgres();
  try {
    const client = new memAdapter.Client();
    await client.connect();
    try {
      const res = await client.query(text, params);
      // Auto-save snapshot on mutating queries
      if (/^(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)/i.test(text.trim())) {
        saveSnapshot();
      }
      return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows?.length ?? 0 };
    } finally {
      await client.end();
    }
  } catch (err: any) {
    console.error('[PostgreSQL Query Error]:', err);
    throw err;
  }
}

/**
 * Switch or update connection configuration
 */
export async function testAndConfigurePostgres(newUrl: string): Promise<{ success: boolean; message: string }> {
  try {
    const testPool = new Pool({
      connectionString: newUrl,
      connectionTimeoutMillis: 6000,
      ssl: newUrl.includes('sslmode=require') || newUrl.includes('supabase') || newUrl.includes('neon') ? { rejectUnauthorized: false } : undefined,
    });
    const client = await testPool.connect();
    const res = await client.query('SELECT version();');
    client.release();
    await testPool.end();

    // Set environment variable
    process.env.DATABASE_URL = newUrl;
    if (activePool) {
      await activePool.end().catch(() => null);
      activePool = null;
    }
    isUsingMemDb = false;
    lastInitError = null;

    return {
      success: true,
      message: `اتصال به پایگاه داده PostgreSQL با موفقیت برقرار شد. (${res.rows[0]?.version || 'PostgreSQL'})`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `خطا در اتصال به PostgreSQL: ${err.message}`,
    };
  }
}

/**
 * Return detailed PostgreSQL health and statistical data
 */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  const { isConfigured } = getDatabaseConfig();
  const engine = isConfigured && !isUsingMemDb ? 'POSTGRESQL_REMOTE' : 'POSTGRESQL_MEM';

  let ver = 'PostgreSQL 16.2 (Engine Active)';
  let counts: Record<string, number> = {};

  try {
    const vRes = await query('SELECT version();');
    if (vRes.rows && vRes.rows[0]) {
      ver = Object.values(vRes.rows[0])[0] as string;
    }

    const tables = ['users', 'employees', 'violations', 'rewards', 'violation_codes', 'reward_codes', 'system_settings', 'sms_logs', 'backups_metadata'];
    for (const t of tables) {
      try {
        const cRes = await query(`SELECT COUNT(*) as count FROM ${t};`);
        counts[t] = parseInt(cRes.rows[0]?.count || '0', 10);
      } catch {
        counts[t] = 0;
      }
    }
  } catch (e: any) {
    console.error('Error getting DB status:', e);
  }

  const host = process.env.PGHOST || (process.env.DATABASE_URL ? (process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'remote') : 'localhost (in-process)');
  const port = parseInt(process.env.PGPORT || '5432', 10);
  const database = process.env.PGDATABASE || 'safewatch_hse';
  const user = process.env.PGUSER || 'postgres';

  return {
    engine,
    connected: true,
    host,
    port,
    database,
    user,
    ssl: Boolean(process.env.DATABASE_URL?.includes('sslmode=require')),
    version: ver,
    totalTables: Object.keys(counts).length,
    tables: counts,
    lastQueryTimestamp: new Date().toISOString(),
    connectionError: lastInitError,
  };
}
