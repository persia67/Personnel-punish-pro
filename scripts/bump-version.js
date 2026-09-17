#!/usr/bin/env node

/**
 * SafeWatch Automated Version Bumper & Changelog Generator
 * Analyzes git commit messages since the last tag or commit
 * to determine SemVer bump (Major, Minor, or Patch), updates all platform
 * configuration files (package.json, Tauri, Android), and outputs GitHub Actions variables.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (err) {
    return '';
  }
}

// 1. Get the current base version from package.json or latest git tag
function getCurrentVersion() {
  const pkgPath = path.join(process.cwd(), 'package.json');
  let pkgVersion = '1.0.0';
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) pkgVersion = pkg.version;
    } catch {}
  }

  // Check latest git tag
  const latestTag = exec('git describe --tags --abbrev=0 2>/dev/null');
  if (latestTag) {
    const cleanTag = latestTag.replace(/^v/, '');
    if (/^\d+\.\d+\.\d+/.test(cleanTag)) {
      return { version: cleanTag, lastTag: latestTag };
    }
  }

  return { version: pkgVersion, lastTag: latestTag || null };
}

// 2. Parse SemVer string into [major, minor, patch]
function parseSemVer(v) {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return [1, 0, 0];
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

// 3. Inspect commits since last tag to determine bump magnitude
function determineBump(lastTag) {
  let logOutput = '';
  if (lastTag) {
    logOutput = exec(`git log ${lastTag}..HEAD --pretty=format:"%s%n%b%n---COMMIT-SPLIT---"`);
  }
  
  if (!logOutput || logOutput.trim().length === 0) {
    // If no commits between tag and HEAD, check the last 5 commits
    logOutput = exec(`git log -n 5 --pretty=format:"%s%n%b%n---COMMIT-SPLIT---"`);
  }

  const commits = logOutput
    .split('---COMMIT-SPLIT---')
    .map((c) => c.trim())
    .filter(Boolean);

  let hasMajor = false;
  let hasMinor = false;
  let hasPatch = false;

  const features = [];
  const fixes = [];
  const others = [];

  for (const commit of commits) {
    const lower = commit.toLowerCase();
    const firstLine = commit.split('\n')[0].trim();

    // Check for Breaking Change (MAJOR)
    if (
      lower.includes('breaking change') ||
      lower.includes('breaking:') ||
      /^[a-z]+(\([a-z0-9_-]+\))?!:/.test(firstLine) ||
      lower.includes('[major]')
    ) {
      hasMajor = true;
      features.push(`💥 **${firstLine}** (Breaking Change)`);
      continue;
    }

    // Check for Feature (MINOR)
    if (
      firstLine.startsWith('feat:') ||
      firstLine.startsWith('feat(') ||
      firstLine.startsWith('feature:') ||
      firstLine.startsWith('add:') ||
      lower.includes('[minor]') ||
      lower.includes('افزودن') ||
      lower.includes('قابلیت')
    ) {
      hasMinor = true;
      features.push(`✨ ${firstLine}`);
      continue;
    }

    // Check for Fix / Patch (PATCH)
    if (
      firstLine.startsWith('fix:') ||
      firstLine.startsWith('fix(') ||
      firstLine.startsWith('bug:') ||
      firstLine.startsWith('patch:') ||
      lower.includes('اصلاح') ||
      lower.includes('رفع باگ')
    ) {
      hasPatch = true;
      fixes.push(`🐛 ${firstLine}`);
      continue;
    }

    others.push(`🔹 ${firstLine}`);
  }

  let bumpType = 'patch'; // Default to patch so every push increments the version!
  let bumpReason = 'Regular updates, improvements, or fixes';

  if (hasMajor) {
    bumpType = 'major';
    bumpReason = 'Breaking changes or major architectural changes detected';
  } else if (hasMinor) {
    bumpType = 'minor';
    bumpReason = 'New features or functional enhancements detected';
  } else if (hasPatch) {
    bumpType = 'patch';
    bumpReason = 'Bug fixes and performance patches detected';
  }

  return {
    bumpType,
    bumpReason,
    changelog: { features, fixes, others, rawCommits: commits },
  };
}

// 4. Calculate new version string
function calculateNewVersion(currentVersion, bumpType) {
  const [major, minor, patch] = parseSemVer(currentVersion);
  if (bumpType === 'major') {
    return `${major + 1}.0.0`;
  }
  if (bumpType === 'minor') {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

// 5. Calculate Android versionCode
function calculateVersionCode(newVersion) {
  const [major, minor, patch] = parseSemVer(newVersion);
  // Example: 4.15.2 -> 4 * 10000 + 15 * 100 + 2 = 41502
  const semverCode = major * 10000 + minor * 100 + patch;
  
  // Or check git commit count
  const commitCountStr = exec('git rev-list --count HEAD 2>/dev/null');
  const commitCount = parseInt(commitCountStr, 10) || 0;

  return Math.max(semverCode, commitCount + 100);
}

// 6. Update platform config files
function updatePlatformFiles(newVersion, versionCode) {
  const updatedFiles = [];

  // A. root package.json
  const rootPkgPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(rootPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
      pkg.version = newVersion;
      fs.writeFileSync(rootPkgPath, JSON.stringify(pkg, null, 2) + '\n');
      updatedFiles.push('package.json');
    } catch (e) {
      console.error('Error updating root package.json:', e.message);
    }
  }

  // A2. root package-lock.json (if present)
  const lockPkgPath = path.join(process.cwd(), 'package-lock.json');
  if (fs.existsSync(lockPkgPath)) {
    try {
      const lock = JSON.parse(fs.readFileSync(lockPkgPath, 'utf8'));
      lock.version = newVersion;
      if (lock.packages && lock.packages['']) {
        lock.packages[''].version = newVersion;
      }
      fs.writeFileSync(lockPkgPath, JSON.stringify(lock, null, 2) + '\n');
      updatedFiles.push('package-lock.json');
    } catch (e) {
      console.error('Error updating package-lock.json:', e.message);
    }
  }

  // B. client/package.json (if present)
  const clientPkgPath = path.join(process.cwd(), 'client', 'package.json');
  if (fs.existsSync(clientPkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(clientPkgPath, 'utf8'));
      pkg.version = newVersion;
      fs.writeFileSync(clientPkgPath, JSON.stringify(pkg, null, 2) + '\n');
      updatedFiles.push('client/package.json');
    } catch {}
  }

  // C. Tauri tauri.conf.json
  const tauriConfPath = path.join(process.cwd(), 'src-tauri', 'tauri.conf.json');
  if (fs.existsSync(tauriConfPath)) {
    try {
      const content = fs.readFileSync(tauriConfPath, 'utf8');
      const tauri = JSON.parse(content);
      tauri.version = newVersion;
      fs.writeFileSync(tauriConfPath, JSON.stringify(tauri, null, 2) + '\n');
      updatedFiles.push('src-tauri/tauri.conf.json');
    } catch (e) {
      console.error('Error updating tauri.conf.json:', e.message);
    }
  }

  // D. Tauri Cargo.toml
  const cargoPath = path.join(process.cwd(), 'src-tauri', 'Cargo.toml');
  if (fs.existsSync(cargoPath)) {
    try {
      let content = fs.readFileSync(cargoPath, 'utf8');
      content = content.replace(/^version\s*=\s*"[^"]+"/m, `version = "${newVersion}"`);
      fs.writeFileSync(cargoPath, content);
      updatedFiles.push('src-tauri/Cargo.toml');
    } catch (e) {
      console.error('Error updating Cargo.toml:', e.message);
    }
  }

  // E. Android build.gradle
  const buildGradlePath = path.join(process.cwd(), 'android', 'app', 'build.gradle');
  if (fs.existsSync(buildGradlePath)) {
    try {
      let content = fs.readFileSync(buildGradlePath, 'utf8');
      content = content.replace(/versionCode\s+\d+/g, `versionCode ${versionCode}`);
      content = content.replace(/versionName\s+"[^"]+"/g, `versionName "${newVersion}"`);
      fs.writeFileSync(buildGradlePath, content);
      updatedFiles.push('android/app/build.gradle');
    } catch (e) {
      console.error('Error updating android/app/build.gradle:', e.message);
    }
  }

  return updatedFiles;
}

// 7. Generate Markdown release notes
function generateReleaseNotes(newVersion, oldVersion, bumpType, bumpReason, changelog) {
  const dateStr = new Date().toISOString().split('T')[0];
  let notes = `## 🚀 SafeWatch HSE Release v${newVersion} (${dateStr})\n\n`;
  notes += `> **Version Increment**: \`${oldVersion}\` ➔ \`${newVersion}\` (${bumpType.toUpperCase()})\n`;
  notes += `> **Trigger**: ${bumpReason}\n\n`;

  if (changelog.features.length > 0) {
    notes += `### 🌟 New Features & Enhancements\n`;
    changelog.features.forEach((f) => (notes += `- ${f}\n`));
    notes += `\n`;
  }

  if (changelog.fixes.length > 0) {
    notes += `### 🛠️ Fixes & Improvements\n`;
    changelog.fixes.forEach((f) => (notes += `- ${f}\n`));
    notes += `\n`;
  }

  if (changelog.others.length > 0 && changelog.features.length === 0 && changelog.fixes.length === 0) {
    notes += `### 📝 Changes in this Build\n`;
    changelog.others.slice(0, 10).forEach((o) => (notes += `- ${o}\n`));
    notes += `\n`;
  }

  notes += `### 📦 Compiled Installers & Assets\n`;
  notes += `- 💻 **Windows Desktop Installer**: \`SafeWatch-v${newVersion}-Windows-Setup.msi\` (Offline Native Windows Installer)\n`;
  notes += `- 📱 **Android Mobile Installer**: \`SafeWatch-v${newVersion}-Android.apk\` (Signed Android APK Installer)\n`;
  notes += `- 🌐 **Web PWA Package**: \`SafeWatch-v${newVersion}-Web-PWA.zip\`\n\n`;
  notes += `---\n*Automated multi-platform CI/CD build powered by GitHub Actions.*`;

  return notes;
}

// Main Execution
function main() {
  const manualVersion = process.argv[2] || process.env.MANUAL_VERSION;
  const { version: currentVersion, lastTag } = getCurrentVersion();
  const { bumpType, bumpReason, changelog } = determineBump(lastTag);

  let newVersion = manualVersion && manualVersion.trim() ? manualVersion.trim().replace(/^v/, '') : calculateNewVersion(currentVersion, bumpType);
  const versionCode = calculateVersionCode(newVersion);

  console.log(`Current Version: ${currentVersion} (Last Tag: ${lastTag || 'none'})`);
  console.log(`Detected Bump Type: ${bumpType.toUpperCase()} (${bumpReason})`);
  console.log(`New Target Version: ${newVersion} (Android VersionCode: ${versionCode})`);

  // Update platform files
  const updatedFiles = updatePlatformFiles(newVersion, versionCode);
  console.log(`Updated files: ${updatedFiles.join(', ')}`);

  // Write release notes to file for GitHub Actions to use
  const releaseNotes = generateReleaseNotes(newVersion, currentVersion, bumpType, bumpReason, changelog);
  fs.writeFileSync(path.join(process.cwd(), 'release-notes.md'), releaseNotes);

  // Write to GITHUB_OUTPUT if running inside GitHub Actions
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput && fs.existsSync(githubOutput)) {
    fs.appendFileSync(githubOutput, `version=${newVersion}\n`);
    fs.appendFileSync(githubOutput, `tag_name=v${newVersion}\n`);
    fs.appendFileSync(githubOutput, `bump_type=${bumpType}\n`);
    fs.appendFileSync(githubOutput, `version_code=${versionCode}\n`);
  }

  return { newVersion, bumpType, versionCode };
}

if (require.main === module) {
  main();
}

module.exports = { main, getCurrentVersion, determineBump, calculateNewVersion };
