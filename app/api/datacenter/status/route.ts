import { NextResponse } from 'next/server';
import os from 'os';
import { DatabaseAdapter } from '@/database/db-adapter';
import { getDatabaseStatus } from '@/database/connection';

export async function GET() {
  try {
    const db = await DatabaseAdapter.getFullState();
    const dbStatus = await getDatabaseStatus();
    const interfaces = os.networkInterfaces();
    const networkList: any[] = [];
    let primaryIp = '127.0.0.1';

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4') {
          networkList.push({ name, address: addr.address, netmask: addr.netmask });
          if (!addr.internal && (addr.address.startsWith('192.168.') || addr.address.startsWith('10.'))) {
            primaryIp = addr.address;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'SERVER',
      serverUrl: `http://${primaryIp}:3000`,
      port: 3000,
      activeClientsCount: 1,
      primaryIp,
      database: dbStatus,
      dbStats: {
        violationsCount: db.violations.length,
        rewardsCount: db.rewards.length,
        employeesCount: db.employees.length,
        usersCount: db.users.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
