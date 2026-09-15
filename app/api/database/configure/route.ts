import { NextRequest, NextResponse } from 'next/server';
import { DatabaseAdapter } from '@/database/db-adapter';

export async function POST(req: NextRequest) {
  try {
    const { connectionUrl } = await req.json();
    if (!connectionUrl) {
      return NextResponse.json({ success: false, message: 'آدرس اتصال به دیتابیس ارسال نشده است.' }, { status: 400 });
    }
    const result = await DatabaseAdapter.updateConnectionString(connectionUrl);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
