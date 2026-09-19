#!/usr/bin/env node
import { spawn, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = process.env.PORT || '3000';
process.env.PORT = PORT;
process.env.RUN_STANDALONE = 'true';

const serverDist = path.join(rootDir, 'server', 'dist', 'index.mjs');

// Build server bundle if missing
if (!fs.existsSync(serverDist)) {
  console.log('[SafeWatch Server] Building server bundle with Vite SSR...');
  try {
    execSync('npx vite build --ssr server/src/index.ts --outDir server/dist', {
      cwd: rootDir,
      stdio: 'inherit',
    });
  } catch (err) {
    console.error('[SafeWatch Server] Build failed, attempting to run with node strip-types:', err.message);
  }
}

// Print banner and IP detection
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
console.log(`   SafeWatch HSE Enterprise Central Server`);
console.log(`=============================================================`);
console.log(` [✓] Target Port:      ${PORT}`);
console.log(` [✓] Host Binding:     0.0.0.0 (All Network Interfaces)`);
console.log(` [✓] Local Host:       http://localhost:${PORT}`);

const nonInternal = ipv4List.filter(ip => !ip.internal);
if (nonInternal.length > 0) {
  console.log(` [✓] Available LAN Addresses for Workstations:`);
  nonInternal.forEach(ip => {
    console.log(`     -> http://${ip.address}:${PORT} (${ip.name})`);
  });
} else {
  console.log(` [✓] LAN Workstation:  http://127.0.0.1:${PORT}`);
}

console.log(`=============================================================\n`);

// Run the server bundle
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
