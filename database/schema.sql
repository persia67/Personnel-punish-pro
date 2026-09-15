-- =========================================================================
-- SafeWatch HSE Management System - Relational PostgreSQL Database Schema
-- Separate Database Engine for Personnel Reward & Punishment Operations
-- =========================================================================

-- 1. Users & RBAC Accounts Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(128) NOT NULL UNIQUE,
    password VARCHAR(256) NOT NULL,
    full_name VARCHAR(256) NOT NULL,
    role VARCHAR(64) NOT NULL DEFAULT 'HSE_OFFICER',
    avatar TEXT,
    managed_department VARCHAR(128),
    phone_number VARCHAR(64),
    email VARCHAR(256),
    telegram_username VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Employees Roster Table
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(64) PRIMARY KEY,
    personnel_id VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(256) NOT NULL,
    department VARCHAR(128) NOT NULL,
    job_title VARCHAR(128),
    national_id VARCHAR(32),
    hire_date VARCHAR(32),
    phone_number VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_personnel_id ON employees(personnel_id);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON employees(full_name);

-- 3. Standard Violation Codes Catalog
CREATE TABLE IF NOT EXISTS violation_codes (
    id VARCHAR(64) PRIMARY KEY,
    code INTEGER NOT NULL UNIQUE,
    label TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT -5,
    department VARCHAR(128) NOT NULL DEFAULT 'HSE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_violation_codes_code ON violation_codes(code);
CREATE INDEX IF NOT EXISTS idx_violation_codes_department ON violation_codes(department);

-- 4. Standard Reward Codes Catalog
CREATE TABLE IF NOT EXISTS reward_codes (
    id VARCHAR(64) PRIMARY KEY,
    code INTEGER NOT NULL UNIQUE,
    label TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 5,
    department VARCHAR(128) NOT NULL DEFAULT 'HSE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reward_codes_code ON reward_codes(code);
CREATE INDEX IF NOT EXISTS idx_reward_codes_department ON reward_codes(department);

-- 5. Violations & Infractions Record Table
CREATE TABLE IF NOT EXISTS violations (
    id VARCHAR(64) PRIMARY KEY,
    employee_name VARCHAR(256) NOT NULL,
    personnel_id VARCHAR(64) NOT NULL,
    department VARCHAR(128) NOT NULL,
    department_source VARCHAR(128) NOT NULL DEFAULT 'HSE',
    reporter_name VARCHAR(256) NOT NULL,
    date VARCHAR(32) NOT NULL,
    violation_type VARCHAR(256) NOT NULL,
    violation_code INTEGER NOT NULL,
    description TEXT NOT NULL,
    reason TEXT,
    severity VARCHAR(32) NOT NULL DEFAULT 'Medium',
    score INTEGER NOT NULL DEFAULT -5,
    penalty_actions JSONB DEFAULT '[]'::jsonb,
    violation_stage INTEGER NOT NULL DEFAULT 1,
    evidence TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    committee_verdict TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_violations_personnel_id ON violations(personnel_id);
CREATE INDEX IF NOT EXISTS idx_violations_department ON violations(department);
CREATE INDEX IF NOT EXISTS idx_violations_date ON violations(date);
CREATE INDEX IF NOT EXISTS idx_violations_status ON violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_is_approved ON violations(is_approved);

-- 6. Rewards & Commendations Record Table
CREATE TABLE IF NOT EXISTS rewards (
    id VARCHAR(64) PRIMARY KEY,
    employee_name VARCHAR(256) NOT NULL,
    personnel_id VARCHAR(64) NOT NULL,
    department VARCHAR(128) NOT NULL,
    department_source VARCHAR(128) NOT NULL DEFAULT 'HSE',
    reporter_name VARCHAR(256) NOT NULL,
    date VARCHAR(32) NOT NULL,
    reward_type VARCHAR(128) NOT NULL,
    reward_code INTEGER NOT NULL,
    description TEXT NOT NULL,
    reason TEXT,
    score INTEGER NOT NULL DEFAULT 5,
    rewards_given JSONB DEFAULT '[]'::jsonb,
    evidence TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rewards_personnel_id ON rewards(personnel_id);
CREATE INDEX IF NOT EXISTS idx_rewards_department ON rewards(department);
CREATE INDEX IF NOT EXISTS idx_rewards_date ON rewards(date);
CREATE INDEX IF NOT EXISTS idx_rewards_is_approved ON rewards(is_approved);

-- 7. System Settings & Configurations (Key-Value / JSON Document in PostgreSQL)
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
    settings_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. SMS Gateway Transaction Logs
CREATE TABLE IF NOT EXISTS sms_logs (
    id VARCHAR(64) PRIMARY KEY,
    recipient_name VARCHAR(256) NOT NULL,
    recipient_phone VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL,
    message TEXT NOT NULL,
    date VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    provider VARCHAR(64) NOT NULL,
    response_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Backups Registry & Versioning
CREATE TABLE IF NOT EXISTS backups_metadata (
    id VARCHAR(64) PRIMARY KEY,
    file_name VARCHAR(256) NOT NULL,
    backup_type VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
    note TEXT,
    violations_count INTEGER DEFAULT 0,
    rewards_count INTEGER DEFAULT 0,
    employees_count INTEGER DEFAULT 0,
    users_count INTEGER DEFAULT 0,
    size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
