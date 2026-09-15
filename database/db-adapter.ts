import { query, saveSnapshot, getDatabaseStatus, DatabaseStatus, testAndConfigurePostgres } from './connection';
import { User, Employee, CodeItem, Violation, Reward, AppSettings } from '../types';

export interface DBState {
  violations: Violation[];
  rewards: Reward[];
  users: User[];
  employees: Employee[];
  violationCodes: CodeItem[];
  rewardCodes: CodeItem[];
  settings: AppSettings | null;
}

/**
 * Adapter providing relational CRUD on top of PostgreSQL
 */
export class DatabaseAdapter {
  /**
   * Fetch the full consolidated state from PostgreSQL tables
   */
  static async getFullState(): Promise<DBState> {
    try {
      const [uRes, eRes, vcRes, rcRes, vRes, rRes, sRes] = await Promise.all([
        query('SELECT * FROM users;'),
        query('SELECT * FROM employees;'),
        query('SELECT * FROM violation_codes;'),
        query('SELECT * FROM reward_codes;'),
        query('SELECT * FROM violations ORDER BY created_at DESC;'),
        query('SELECT * FROM rewards ORDER BY created_at DESC;'),
        query('SELECT settings_json FROM system_settings WHERE id = $1;', ['default']),
      ]);

      const users: User[] = (uRes.rows || []).map((row: any) => ({
        id: row.id,
        username: row.username,
        password: row.password,
        fullName: row.full_name,
        role: row.role,
        avatar: row.avatar || '',
        managedDepartment: row.managed_department,
        phoneNumber: row.phone_number,
        email: row.email,
        telegramUsername: row.telegram_username,
      }));

      const employees: Employee[] = (eRes.rows || []).map((row: any) => ({
        id: row.id,
        personnelId: row.personnel_id,
        fullName: row.full_name,
        department: row.department,
        jobTitle: row.job_title,
        nationalId: row.national_id,
        hireDate: row.hire_date,
        phoneNumber: row.phone_number,
      }));

      const violationCodes: CodeItem[] = (vcRes.rows || []).map((row: any) => ({
        id: row.id,
        code: parseInt(row.code, 10),
        label: row.label,
        score: parseInt(row.score, 10),
        department: row.department,
      }));

      const rewardCodes: CodeItem[] = (rcRes.rows || []).map((row: any) => ({
        id: row.id,
        code: parseInt(row.code, 10),
        label: row.label,
        score: parseInt(row.score, 10),
        department: row.department,
      }));

      const violations: Violation[] = (vRes.rows || []).map((row: any) => {
        let penaltyActions: string[] = [];
        try {
          penaltyActions = typeof row.penalty_actions === 'string' ? JSON.parse(row.penalty_actions) : (row.penalty_actions || []);
        } catch {
          penaltyActions = [];
        }

        return {
          id: row.id,
          employeeName: row.employee_name,
          personnelId: row.personnel_id,
          department: row.department,
          departmentSource: row.department_source || 'HSE',
          reporterName: row.reporter_name,
          date: row.date,
          violationType: row.violation_type,
          violationCode: parseInt(row.violation_code, 10),
          description: row.description,
          reason: row.reason,
          severity: row.severity,
          score: parseInt(row.score, 10),
          penaltyActions,
          violationStage: parseInt(row.violation_stage || '1', 10),
          evidence: row.evidence,
          isArchived: Boolean(row.is_archived),
          committeeVerdict: row.committee_verdict,
          status: row.status,
          isApproved: Boolean(row.is_approved),
          rejectionReason: row.rejection_reason,
        };
      });

      const rewards: Reward[] = (rRes.rows || []).map((row: any) => {
        let rewardsGiven: string[] = [];
        try {
          rewardsGiven = typeof row.rewards_given === 'string' ? JSON.parse(row.rewards_given) : (row.rewards_given || []);
        } catch {
          rewardsGiven = [];
        }

        return {
          id: row.id,
          employeeName: row.employee_name,
          personnelId: row.personnel_id,
          department: row.department,
          departmentSource: row.department_source || 'HSE',
          reporterName: row.reporter_name,
          date: row.date,
          rewardType: row.reward_type,
          rewardCode: parseInt(row.reward_code, 10),
          description: row.description,
          reason: row.reason,
          score: parseInt(row.score, 10),
          rewardsGiven,
          evidence: row.evidence,
          isApproved: Boolean(row.is_approved),
          isArchived: Boolean(row.is_archived),
        };
      });

      let settings: AppSettings | null = null;
      if (sRes.rows && sRes.rows[0]) {
        try {
          const raw = sRes.rows[0].settings_json;
          settings = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
          console.warn('Error parsing settings JSON from PostgreSQL:', e);
        }
      }

      return {
        violations,
        rewards,
        users,
        employees,
        violationCodes,
        rewardCodes,
        settings,
      };
    } catch (err) {
      console.error('[DatabaseAdapter.getFullState] Error:', err);
      throw err;
    }
  }

  /**
   * Sync complete state into PostgreSQL
   */
  static async syncState(incoming: Partial<DBState>): Promise<DBState> {
    // 1. Sync Employees
    if (incoming.employees && Array.isArray(incoming.employees)) {
      for (const emp of incoming.employees) {
        if (!emp.id || !emp.personnelId) continue;
        await query(
          `INSERT INTO employees (id, personnel_id, full_name, department, job_title, national_id, hire_date, phone_number)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (personnel_id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             department = EXCLUDED.department,
             job_title = EXCLUDED.job_title,
             national_id = EXCLUDED.national_id,
             hire_date = EXCLUDED.hire_date,
             phone_number = EXCLUDED.phone_number;`,
          [emp.id, emp.personnelId, emp.fullName, emp.department || 'عمومی', emp.jobTitle || '', emp.nationalId || '', emp.hireDate || '', emp.phoneNumber || '']
        );
      }
    }

    // 2. Sync Users
    if (incoming.users && Array.isArray(incoming.users)) {
      for (const u of incoming.users) {
        if (!u.id || !u.username) continue;
        await query(
          `INSERT INTO users (id, username, password, full_name, role, avatar, managed_department, phone_number, email, telegram_username)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             username = EXCLUDED.username,
             password = EXCLUDED.password,
             full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             avatar = EXCLUDED.avatar,
             managed_department = EXCLUDED.managed_department,
             phone_number = EXCLUDED.phone_number,
             email = EXCLUDED.email,
             telegram_username = EXCLUDED.telegram_username;`,
          [u.id, u.username, u.password, u.fullName, u.role, u.avatar || '', u.managedDepartment || null, u.phoneNumber || null, u.email || null, u.telegramUsername || null]
        );
      }
    }

    // 3. Sync Violation Codes
    if (incoming.violationCodes && Array.isArray(incoming.violationCodes)) {
      for (const vc of incoming.violationCodes) {
        if (!vc.code) continue;
        const id = vc.id || `vc_${vc.code}`;
        await query(
          `INSERT INTO violation_codes (id, code, label, score, department)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (code) DO UPDATE SET
             label = EXCLUDED.label,
             score = EXCLUDED.score,
             department = EXCLUDED.department;`,
          [id, vc.code, vc.label, vc.score, vc.department || 'HSE']
        );
      }
    }

    // 4. Sync Reward Codes
    if (incoming.rewardCodes && Array.isArray(incoming.rewardCodes)) {
      for (const rc of incoming.rewardCodes) {
        if (!rc.code) continue;
        const id = rc.id || `rc_${rc.code}`;
        await query(
          `INSERT INTO reward_codes (id, code, label, score, department)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (code) DO UPDATE SET
             label = EXCLUDED.label,
             score = EXCLUDED.score,
             department = EXCLUDED.department;`,
          [id, rc.code, rc.label, rc.score, rc.department || 'HSE']
        );
      }
    }

    // 5. Sync Violations
    if (incoming.violations && Array.isArray(incoming.violations)) {
      for (const v of incoming.violations) {
        if (!v.id) continue;
        const penaltyStr = JSON.stringify(v.penaltyActions || []);
        await query(
          `INSERT INTO violations (
             id, employee_name, personnel_id, department, department_source,
             reporter_name, date, violation_type, violation_code, description,
             reason, severity, score, penalty_actions, violation_stage,
             evidence, is_archived, committee_verdict, status, is_approved, rejection_reason
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
           ON CONFLICT (id) DO UPDATE SET
             employee_name = EXCLUDED.employee_name,
             personnel_id = EXCLUDED.personnel_id,
             department = EXCLUDED.department,
             department_source = EXCLUDED.department_source,
             reporter_name = EXCLUDED.reporter_name,
             date = EXCLUDED.date,
             violation_type = EXCLUDED.violation_type,
             violation_code = EXCLUDED.violation_code,
             description = EXCLUDED.description,
             reason = EXCLUDED.reason,
             severity = EXCLUDED.severity,
             score = EXCLUDED.score,
             penalty_actions = EXCLUDED.penalty_actions,
             violation_stage = EXCLUDED.violation_stage,
             evidence = EXCLUDED.evidence,
             is_archived = EXCLUDED.is_archived,
             committee_verdict = EXCLUDED.committee_verdict,
             status = EXCLUDED.status,
             is_approved = EXCLUDED.is_approved,
             rejection_reason = EXCLUDED.rejection_reason;`,
          [
            v.id,
            v.employeeName,
            v.personnelId,
            v.department,
            v.departmentSource || 'HSE',
            v.reporterName,
            v.date,
            v.violationType,
            v.violationCode,
            v.description,
            v.reason || '',
            v.severity,
            v.score,
            penaltyStr,
            v.violationStage || 1,
            v.evidence || '',
            Boolean(v.isArchived),
            v.committeeVerdict || '',
            v.status || 'Pending',
            Boolean(v.isApproved),
            v.rejectionReason || '',
          ]
        );
      }
    }

    // 6. Sync Rewards
    if (incoming.rewards && Array.isArray(incoming.rewards)) {
      for (const r of incoming.rewards) {
        if (!r.id) continue;
        const rewardsGivenStr = JSON.stringify(r.rewardsGiven || []);
        await query(
          `INSERT INTO rewards (
             id, employee_name, personnel_id, department, department_source,
             reporter_name, date, reward_type, reward_code, description,
             reason, score, rewards_given, evidence, is_approved, is_archived
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO UPDATE SET
             employee_name = EXCLUDED.employee_name,
             personnel_id = EXCLUDED.personnel_id,
             department = EXCLUDED.department,
             department_source = EXCLUDED.department_source,
             reporter_name = EXCLUDED.reporter_name,
             date = EXCLUDED.date,
             reward_type = EXCLUDED.reward_type,
             reward_code = EXCLUDED.reward_code,
             description = EXCLUDED.description,
             reason = EXCLUDED.reason,
             score = EXCLUDED.score,
             rewards_given = EXCLUDED.rewards_given,
             evidence = EXCLUDED.evidence,
             is_approved = EXCLUDED.is_approved,
             is_archived = EXCLUDED.is_archived;`,
          [
            r.id,
            r.employeeName,
            r.personnelId,
            r.department,
            r.departmentSource || 'HSE',
            r.reporterName,
            r.date,
            r.rewardType,
            r.rewardCode,
            r.description,
            r.reason || '',
            r.score,
            rewardsGivenStr,
            r.evidence || '',
            Boolean(r.isApproved),
            Boolean(r.isArchived),
          ]
        );
      }
    }

    // 7. Sync Settings
    if (incoming.settings) {
      await query(
        `INSERT INTO system_settings (id, settings_json)
         VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET
           settings_json = EXCLUDED.settings_json,
           updated_at = CURRENT_TIMESTAMP;`,
        ['default', JSON.stringify(incoming.settings)]
      );
    }

    saveSnapshot();
    return await DatabaseAdapter.getFullState();
  }

  /**
   * Delete item by ID from specified table
   */
  static async deleteRecord(table: 'violations' | 'rewards' | 'employees' | 'users' | 'violation_codes' | 'reward_codes', id: string) {
    const res = await query(`DELETE FROM ${table} WHERE id = $1;`, [id]);
    saveSnapshot();
    return res.rowCount > 0;
  }

  /**
   * Execute raw arbitrary SQL (Admin Console)
   */
  static async executeSql(sql: string, params?: any[]) {
    return await query(sql, params);
  }

  /**
   * Return DB Diagnostics
   */
  static async getDiagnostics(): Promise<DatabaseStatus> {
    return await getDatabaseStatus();
  }

  /**
   * Test and save new connection string
   */
  static async updateConnectionString(url: string) {
    return await testAndConfigurePostgres(url);
  }
}
