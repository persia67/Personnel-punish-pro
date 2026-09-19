@echo off
title SafeWatch HSE - Central Server Console
color 0A
chcp 65001 >nul

echo ====================================================================
echo        SafeWatch HSE Enterprise Central Server (v4.15.22)
echo ====================================================================
echo.

:: 1. Verify Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not found in your system PATH!
    echo.
    echo To run the central server, please install Node.js (LTS version)
    echo from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Auto-configure Windows Firewall for Port 3000
echo [*] Checking Windows Firewall rule for Port 3000...
netsh advfirewall firewall show rule name="SafeWatch HSE Server Port 3000" >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Opening Port 3000 in Windows Firewall...
    netsh advfirewall firewall add rule name="SafeWatch HSE Server Port 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>nul
    if %errorlevel% equ 0 (
        echo [OK] Windows Firewall Port 3000 opened successfully.
    ) else (
        echo [!] Note: To configure the firewall rule automatically, run this script as Administrator.
    )
) else (
    echo [OK] Firewall rule for Port 3000 is active.
)

:: 3. Set environment variables
set PORT=3000
set HOST=0.0.0.0
set RUN_STANDALONE=true

echo.
echo [*] Launching Central Server on Port 3000...
echo.

if exist "server\dist\index.mjs" (
    node scripts\start-server.js
) else if exist "scripts\start-server.js" (
    node scripts\start-server.js
) else (
    node server\dist\index.mjs
)

pause
