import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKUPS_DIR = path.join(process.cwd(), 'database', 'backups');

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filename = url.searchParams.get('filename');
  if (!filename) {
    return new NextResponse('Filename missing', { status: 400 });
  }

  const safeFilename = path.basename(filename);
  const filePath = path.join(BACKUPS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Backup file not found', { status: 404 });
  }

  const fileContent = fs.readFileSync(filePath);
  return new NextResponse(fileContent, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
    },
  });
}
