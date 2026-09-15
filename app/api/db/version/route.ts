import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    version: Date.now(),
    clientsCount: 1,
    timestamp: Date.now(),
  });
}
