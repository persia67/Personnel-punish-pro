import { NextRequest, NextResponse } from 'next/server';
import { DatabaseAdapter } from '@/database/db-adapter';

export async function POST(req: NextRequest) {
  try {
    const { sql, params } = await req.json();
    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ success: false, message: 'دستور SQL مشخص نشده است.' }, { status: 400 });
    }
    const result = await DatabaseAdapter.executeSql(sql, params);
    return NextResponse.json({
      success: true,
      rowCount: result.rowCount,
      rows: result.rows,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
