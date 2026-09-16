const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

// Helper to load or generate a clean 1024x1024 PNG master icon buffer
function getMasterPngBuffer() {
  const masterPngPath = path.join(__dirname, '../assets/icon-master.png');
  if (fs.existsSync(masterPngPath)) {
    const buf = fs.readFileSync(masterPngPath);
    if (buf.length > 8 && buf.subarray(0, 4).toString('hex') === '89504e47') {
      return buf;
    }
  }

  // Fallback to source JPEG image if PNG is missing or corrupted
  const jpgCandidates = [
    path.join(__dirname, '../src/assets/images/app_icon_master_1785575009595.jpg'),
    path.join(__dirname, '../src/assets/images/app_icon_main_1785151968177.jpg')
  ];

  let jpgPath = jpgCandidates.find(p => fs.existsSync(p));
  if (!jpgPath) {
    throw new Error('No master image found to generate application icons!');
  }

  const jpegData = fs.readFileSync(jpgPath);
  const rawData = jpeg.decode(jpegData, { useTolerant: true });
  const png = new PNG({ width: rawData.width, height: rawData.height });
  png.data = rawData.data;
  const cleanPngBuf = PNG.sync.write(png);

  fs.mkdirSync(path.dirname(masterPngPath), { recursive: true });
  fs.writeFileSync(masterPngPath, cleanPngBuf);
  console.log(`[Icon Pipeline] Regenerated clean master PNG at ${masterPngPath}`);
  return cleanPngBuf;
}

// Helper to create uncompressed 32bpp DIB header and data from PNG
function createDIBFromPNG(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const w = png.width;
  const h = png.height;

  // BITMAPINFOHEADER (40 bytes)
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);          // biSize
  header.writeInt32LE(w, 4);            // biWidth
  header.writeInt32LE(h * 2, 8);        // biHeight (2 * h for XOR + AND masks)
  header.writeUInt16LE(1, 12);          // biPlanes
  header.writeUInt16LE(32, 14);         // biBitCount
  header.writeUInt32LE(0, 16);          // biCompression (0 = BI_RGB)
  header.writeUInt32LE(w * h * 4, 20);  // biSizeImage

  // XOR Mask: BGRA pixels bottom-to-top
  const xorData = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcRow = y;
    const dstRow = h - 1 - y;
    for (let x = 0; x < w; x++) {
      const srcIdx = (srcRow * w + x) * 4;
      const dstIdx = (dstRow * w + x) * 4;
      const r = png.data[srcIdx];
      const g = png.data[srcIdx + 1];
      const b = png.data[srcIdx + 2];
      const a = png.data[srcIdx + 3];
      xorData[dstIdx] = b;
      xorData[dstIdx + 1] = g;
      xorData[dstIdx + 2] = r;
      xorData[dstIdx + 3] = a;
    }
  }

  // AND Mask: 1 bit per pixel, aligned to 32-bit (4-byte) boundary
  const andRowSize = Math.ceil(w / 32) * 4;
  const andData = Buffer.alloc(andRowSize * h);
  for (let y = 0; y < h; y++) {
    const srcRow = y;
    const dstRow = h - 1 - y;
    for (let x = 0; x < w; x++) {
      const srcIdx = (srcRow * w + x) * 4 + 3;
      const alpha = png.data[srcIdx];
      if (alpha === 0) {
        const byteIdx = dstRow * andRowSize + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        andData[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  return Buffer.concat([header, xorData, andData]);
}

// Resizes a PNG buffer to target square size (nearest neighbor / billinear interpolation)
function resizePNG(srcPngBuf, targetSize) {
  const src = PNG.sync.read(srcPngBuf);
  const dst = new PNG({ width: targetSize, height: targetSize });
  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const srcX = Math.floor(x * src.width / targetSize);
      const srcY = Math.floor(y * src.height / targetSize);
      const srcIdx = (srcY * src.width + srcX) * 4;
      const dstIdx = (y * targetSize + x) * 4;
      dst.data[dstIdx] = src.data[srcIdx];
      dst.data[dstIdx + 1] = src.data[srcIdx + 1];
      dst.data[dstIdx + 2] = src.data[srcIdx + 2];
      dst.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }
  return PNG.sync.write(dst);
}

// Generates multi-resolution .ico with standard DIB headers
function generateIco(masterPngBuf, outputIcoPath) {
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const imagesData = sizes.map(sz => {
    const resized = resizePNG(masterPngBuf, sz);
    return { size: sz, buf: createDIBFromPNG(resized) };
  });

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(imagesData.length, 4);

  let currentOffset = 6 + imagesData.length * 16;
  const dirEntries = [];

  imagesData.forEach(item => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 0); // Width
    entry.writeUInt8(item.size === 256 ? 0 : item.size, 1); // Height
    entry.writeUInt8(0, 2); // Palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(item.buf.length, 8); // Size
    entry.writeUInt32LE(currentOffset, 12); // Offset
    currentOffset += item.buf.length;
    dirEntries.push(entry);
  });

  const finalIco = Buffer.concat([header, ...dirEntries, ...imagesData.map(i => i.buf)]);
  fs.mkdirSync(path.dirname(outputIcoPath), { recursive: true });
  fs.writeFileSync(outputIcoPath, finalIco);
  console.log(`[Icon Pipeline] Generated valid Windows DIB ICO at ${outputIcoPath}`);
}

function runIconPipeline() {
  const masterPngBuf = getMasterPngBuffer();
  const tauriIconsDir = path.join(__dirname, '../src-tauri/icons');
  fs.mkdirSync(tauriIconsDir, { recursive: true });

  // 1. Generate required Tauri desktop & Appx PNG icons
  const pngOutputs = [
    { name: '16x16.png', size: 16 },
    { name: '24x24.png', size: 24 },
    { name: '32x32.png', size: 32 },
    { name: '48x48.png', size: 48 },
    { name: '64x64.png', size: 64 },
    { name: '128x128.png', size: 128 },
    { name: '128x128@2x.png', size: 256 },
    { name: '256x256.png', size: 256 },
    { name: 'icon.png', size: 512 },
    { name: 'StoreLogo.png', size: 50 },
    { name: 'Square30x30Logo.png', size: 30 },
    { name: 'Square44x44Logo.png', size: 44 },
    { name: 'Square71x71Logo.png', size: 71 },
    { name: 'Square89x89Logo.png', size: 89 },
    { name: 'Square107x107Logo.png', size: 107 },
    { name: 'Square142x142Logo.png', size: 142 },
    { name: 'Square150x150Logo.png', size: 150 },
    { name: 'Square284x284Logo.png', size: 284 },
    { name: 'Square310x310Logo.png', size: 310 }
  ];

  pngOutputs.forEach(item => {
    const outPath = path.join(tauriIconsDir, item.name);
    const resized = resizePNG(masterPngBuf, item.size);
    fs.writeFileSync(outPath, resized);
  });

  // 2. Generate Android icons if target enabled
  const androidMipmaps = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 }
  ];

  androidMipmaps.forEach(m => {
    const dirPath = path.join(tauriIconsDir, 'android', m.dir);
    fs.mkdirSync(dirPath, { recursive: true });
    const resized = resizePNG(masterPngBuf, m.size);
    fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), resized);
    fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), resized);
    fs.writeFileSync(path.join(dirPath, 'ic_launcher_foreground.png'), resized);

    // Also check Capacitor android native project if present
    const capAndroidPath = path.join(__dirname, `../android/app/src/main/res/${m.dir}`);
    if (fs.existsSync(capAndroidPath)) {
      fs.writeFileSync(path.join(capAndroidPath, 'ic_launcher.png'), resized);
      fs.writeFileSync(path.join(capAndroidPath, 'ic_launcher_round.png'), resized);
      fs.writeFileSync(path.join(capAndroidPath, 'ic_launcher_foreground.png'), resized);
    }
  });

  // 3. Generate Windows DIB icon.ico (avoids RC2176 error in RC.EXE)
  const icoPath = path.join(tauriIconsDir, 'icon.ico');
  generateIco(masterPngBuf, icoPath);

  // 4. Sync icons to public and src asset directories
  const publicDir = path.join(__dirname, '../public');
  fs.mkdirSync(publicDir, { recursive: true });

  const icon512 = resizePNG(masterPngBuf, 512);
  const icon256 = resizePNG(masterPngBuf, 256);
  const icon32 = resizePNG(masterPngBuf, 32);

  fs.writeFileSync(path.join(publicDir, 'icon.png'), icon512);
  fs.writeFileSync(path.join(publicDir, 'logo.png'), icon512);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), icon256);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), fs.readFileSync(icoPath));
  fs.writeFileSync(path.join(publicDir, 'icon.ico'), fs.readFileSync(icoPath));

  const srcAssetsLogo = path.join(__dirname, '../src/assets/logo.png');
  fs.mkdirSync(path.dirname(srcAssetsLogo), { recursive: true });
  fs.writeFileSync(srcAssetsLogo, icon512);

  console.log('[Icon Pipeline] Successfully generated and verified all Tauri desktop, Windows DIB ICO, Android, and web icons!');
}

runIconPipeline();
