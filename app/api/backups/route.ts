import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DatabaseAdapter } from '@/database/db-adapter';

const BACKUPS_DIR = path.join(process.cwd(), 'database', 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export async function GET() {
  try {
    const files = fs.existsSync(BACKUPS_DIR) ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')) : [];
    const backupsList = files.map((file) => {
      const filePath = path.join(BACKUPS_DIR, file);
      const stat = fs.statSync(filePath);
      return {
        fileName: file,
        filename: file,
        size: stat.size,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        createdAt: stat.mtime.toISOString(),
      };
    });
    return NextResponse.json({ success: true, backups: backupsList, totalCount: backupsList.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // If restore action requested
    if (body.action === 'restore' && body.filename) {
      const safeFilename = path.basename(body.filename);
      const filePath = path.join(BACKUPS_DIR, safeFilename);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ success: false, message: 'فایل پشتیبان مورد نظر یافت نشد.' }, { status: 404 });
      }
      const raw = fs.readFileSync(filePath, 'utf8');
      const backupData = JSON.parse(raw);
      const restored = await DatabaseAdapter.syncState(backupData);
      return NextResponse.json({
        success: true,
        message: 'پایگاه داده با موفقیت از پشتیبان بازیابی گردید.',
        restoredState: restored,
      });
    }

    // Default: create backup
    const note = body.note || 'پشتیبان تهیه‌شده از دیتابیس PostgreSQL';
    const db = await DatabaseAdapter.getFullState();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `pg_backup_${dateStr}.json`;
    const filePath = path.join(BACKUPS_DIR, fileName);

    const backupPackage = {
      _metadata: {
        fileName,
        type: 'MANUAL_POSTGRESQL',
        note,
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

    return NextResponse.json({
      success: true,
      message: 'نسخه پشتیبان از داده‌های PostgreSQL با موفقیت ایجاد گردید.',
      backup: { fileName, filename: fileName, size: stat.size, sizeBytes: stat.size, createdAt: new Date().toISOString() },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const filename = url.searchParams.get('filename');
    if (!filename) {
      return NextResponse.json({ success: false, message: 'نام فایل پشتیبان مشخص نشده است.' }, { status: 400 });
    }
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUPS_DIR, safeFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return NextResponse.json({ success: true, message: 'فایل پشتیبان با موفقیت حذف گردید.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
