import { NextRequest, NextResponse } from 'next/server';
import { DatabaseAdapter } from '@/database/db-adapter';

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await DatabaseAdapter.syncState(body);
    return NextResponse.json({ success: true, message: 'Synchronized with PostgreSQL', db: updated });
  } catch (error: any) {
    console.error('[API /api/db/sync PUT] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
