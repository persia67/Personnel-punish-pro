#!/usr/bin/env node
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Allow custom port from argv or env (default: 3000)
const argPort = process.argv.find(arg => /^\d+$/.test(arg));
const PORT = argPort || process.env.PORT || '3000';
process.env.PORT = PORT;
process.env.RUN_STANDALONE = 'true';

const distDir = path.join(rootDir, 'dist');
const serverDist = path.join(rootDir, 'server', 'dist', 'index.mjs');

// 1. Build frontend bundle if missing
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.log('[SafeWatch Server] Frontend dist is missing. Building web assets with Vite...');
  try {
    execSync('npx vite build', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log('[SafeWatch Server] Frontend build completed successfully.');
  } catch (err) {
    console.error('[SafeWatch Server] Warning: Frontend build failed:', err.message);
  }
}

// 2. Build server bundle if missing
if (!fs.existsSync(serverDist)) {
  console.log('[SafeWatch Server] Building server bundle with Vite SSR...');
  try {
    execSync('npx vite build --ssr server/src/index.ts --outDir server/dist', {
      cwd: rootDir,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('[SafeWatch Server] Server build failed, attempting to run with node:', err.message);
  }
}

// 3. Print banner and IP detection
const interfaces = os.networkInterfaces();
const ipv4List = [];

for (const [name, addrs] of Object.entries(interfaces)) {
  if (!addrs) continue;
  for (const addr of addrs) {
    if (addr.family === 'IPv4') {
      ipv4List.push({ name, address: addr.address, internal: addr.internal });
    }
  }
}

console.log(`\n=============================================================`);
console.log(`   SafeWatch HSE Enterprise Intranet Web Server`);
console.log(`   سرور وب یکپارچه واحد ایمنی و بهداشت در شبکه داخلی`);
console.log(`=============================================================`);
console.log(` [✓] پورت فعال سرور (Port):   ${PORT}`);
console.log(` [✓] میزبان (Host Binding):  0.0.0.0 (تمام کارت‌های شبکه)`);
console.log(` [✓] دسترسی محلی (Local):    http://localhost:${PORT}`);

const nonInternal = ipv4List.filter(ip => !ip.internal);
if (nonInternal.length > 0) {
  console.log(` [✓] آدرس‌های اتصال سایر سیستم‌ها در شبکه کارخانه (LAN Workstations):`);
  nonInternal.forEach(ip => {
    console.log(`     -> http://${ip.address}:${PORT}  (${ip.name})`);
  });
} else {
  console.log(` [✓] آدرس شبکه محلی:        http://127.0.0.1:${PORT}`);
}

console.log(`-------------------------------------------------------------`);
console.log(` [ℹ] همکاران در سایر سیستم‌ها با وارد کردن آدرس بالا در مرورگر`);
console.log(`     می‌توانند بدون نیاز به نصب، وارد سامانه شوند.`);
console.log(`=============================================================\n`);

// 4. Run the server bundle
const serverProcess = spawn('node', [serverDist], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: PORT,
    RUN_STANDALONE: 'true',
  },
});

serverProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[SafeWatch Server] Process exited with code ${code}`);
  }
});

process.on('SIGINT', () => {
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

