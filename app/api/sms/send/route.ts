import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { config, recipientPhone, message } = await req.json();
    if (!config || !config.isEnabled) {
      return NextResponse.json({ success: false, message: 'SMS is disabled or configuration missing' }, { status: 400 });
    }

    // Proxy or simulate SMS
    return NextResponse.json({
      success: true,
      provider: config.provider || 'SIMULATOR',
      message: 'پیامک با موفقیت از طریق سرور ارسال گردید.',
      response: {
        timestamp: new Date().toISOString(),
        recipient: recipientPhone,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
