import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const { prompt, customApiKey } = await req.json();
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'کلید API هوش مصنوعی (GEMINI_API_KEY) تنظیم نشده است.',
        fallback: true,
      }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return NextResponse.json({
      success: true,
      text: response.text || '',
    });
  } catch (error: any) {
    console.error('[Gemini API] Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'خطا در ارتباط با هوش مصنوعی',
    }, { status: 500 });
  }
}
