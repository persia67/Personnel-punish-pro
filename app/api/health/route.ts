import { NextResponse } from 'next/server';
import { getDatabaseStatus } from '@/database/connection';

export async function GET() {
  const dbStatus = await getDatabaseStatus();
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'SafeWatch HSE Server',
    database: dbStatus,
  });
}
