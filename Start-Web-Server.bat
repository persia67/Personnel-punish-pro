@echo off
title SafeWatch HSE - Intranet Web Server (LAN)
color 0B
chcp 65001 >nul

echo ====================================================================
echo        SafeWatch HSE Enterprise Web Server (LAN Intranet)
echo    راه‌اندازی سامانه ایمنی و بهداشت به صورت وب‌سایت در شبکه کارخانه
echo ====================================================================
echo.

:: 1. Verify Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [خطا] Node.js بر روی سیستم شما نصب نیست.
    echo لطفاً ابتدا نسخه LTS نود جی‌اس را از سایت https://nodejs.org دانلود و نصب نمایید.
    echo.
    pause
    exit /b 1
)

:: 2. Port configuration (Default: 3000)
set SERVER_PORT=3000
if not "%~1"=="" set SERVER_PORT=%~1

:: 3. Open Windows Firewall for this port
echo [*] بررسی وضعیت پورت %SERVER_PORT% در فایروال ویندوز...
netsh advfirewall firewall add rule name="SafeWatch HSE Web Server Port %SERVER_PORT%" dir=in action=allow protocol=TCP localport=%SERVER_PORT% >nul 2>nul
if %errorlevel% equ 0 (
    echo [تأیید] پورت %SERVER_PORT% در فایروال ویندوز باز شد.
)

:: 4. Start Server
set PORT=%SERVER_PORT%
set HOST=0.0.0.0
set RUN_STANDALONE=true

echo.
echo [*] در حال اجرای وب‌سرور روی پورت %SERVER_PORT%...
echo.

node scripts\start-server.js %SERVER_PORT%

pause
