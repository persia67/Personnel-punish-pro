import { NextResponse } from 'next/server';
import { DatabaseAdapter } from '@/database/db-adapter';

export async function GET() {
  try {
    const status = await DatabaseAdapter.getDiagnostics();
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
