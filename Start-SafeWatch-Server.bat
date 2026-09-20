@echo off
title SafeWatch HSE - Enterprise Intranet Web Server Console
color 0A
chcp 65001 >nul

echo ====================================================================
echo        SafeWatch HSE Enterprise Intranet Web Server (v4.15.23)
echo       سرور وب یکپارچه سامانه جامع ایمنی و بهداشت کارخانه
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

:: 2. Set Port (default: 3000)
set SERVER_PORT=3000
if not "%~1"=="" set SERVER_PORT=%~1

:: 3. Auto-configure Windows Firewall for specified Port
echo [*] Checking Windows Firewall rule for Port %SERVER_PORT%...
netsh advfirewall firewall show rule name="SafeWatch HSE Server Port %SERVER_PORT%" >nul 2>nul
if %errorlevel% neq 0 (
    echo [*] Opening Port %SERVER_PORT% in Windows Firewall...
    netsh advfirewall firewall add rule name="SafeWatch HSE Server Port %SERVER_PORT%" dir=in action=allow protocol=TCP localport=%SERVER_PORT% >nul 2>nul
    if %errorlevel% equ 0 (
        echo [OK] Windows Firewall Port %SERVER_PORT% opened successfully.
    ) else (
        echo [!] Note: To configure the firewall rule automatically, run this script as Administrator.
    )
) else (
    echo [OK] Firewall rule for Port %SERVER_PORT% is active.
)

:: 4. Set environment variables
set PORT=%SERVER_PORT%
set HOST=0.0.0.0
set RUN_STANDALONE=true

echo.
echo [*] Launching Intranet Web Server on Port %SERVER_PORT%...
echo.

node scripts\start-server.js %SERVER_PORT%

pause
