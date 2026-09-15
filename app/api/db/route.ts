import { NextRequest, NextResponse } from 'next/server';
import { DatabaseAdapter } from '@/database/db-adapter';

export async function GET() {
  try {
    const data = await DatabaseAdapter.getFullState();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API /api/db GET] Error:', error);
    return NextResponse.json({ error: 'Failed to read from PostgreSQL', details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await DatabaseAdapter.syncState(body);
    return NextResponse.json({ success: true, db: updated });
  } catch (error: any) {
    console.error('[API /api/db POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
