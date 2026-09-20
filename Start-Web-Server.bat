@echo off
@setlocal EnableDelayedExpansion
title SafeWatch HSE - Enterprise Intranet Web Server Console
color 0B
chcp 65001 >nul 2>&1

echo ====================================================================
echo        SafeWatch HSE Enterprise Web Server (v4.16.0)
echo    Central Intranet Server for Safety ^& Health Department
echo ====================================================================
echo.

REM 1. Auto-discover Node.js from standard installation paths if not in PATH
where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;!PATH!"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "PATH=%ProgramFiles(x86)%\nodejs;!PATH!"
    ) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;!PATH!"
    ) else if exist "%APPDATA%\npm" (
        set "PATH=%APPDATA%\npm;!PATH!"
    )
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not found on this system.
    echo.
    echo Please install Node.js (LTS recommended) from:
    echo https://nodejs.org
    echo.
    echo After installation, run this file again.
    echo.
    pause
    exit /b 1
)

REM 2. Determine target port (Default: 3000)
set "SERVER_PORT=3000"
if not "%~1"=="" set "SERVER_PORT=%~1"

REM 3. Safely apply Windows Firewall rule
echo [*] Checking Windows Firewall rule for Port !SERVER_PORT!...
netsh advfirewall firewall show rule name="SafeWatch HSE Web Server Port !SERVER_PORT!" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="SafeWatch HSE Web Server Port !SERVER_PORT!" dir=in action=allow protocol=TCP localport=!SERVER_PORT! >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] Port !SERVER_PORT! opened in Windows Firewall.
    ) else (
        echo [!] Note: To configure firewall automatically, run as Administrator.
    )
) else (
    echo [OK] Firewall rule for Port !SERVER_PORT! is active.
)

REM 4. Set environment and launch
set "PORT=!SERVER_PORT!"
set "HOST=0.0.0.0"
set "RUN_STANDALONE=true"

echo.
echo [*] Starting SafeWatch HSE Intranet Server on Port !SERVER_PORT!...
echo.

node scripts\start-server.js !SERVER_PORT!

if %errorlevel% neq 0 (
    echo.
    echo [!] Server process exited with code %errorlevel%
    pause
)
