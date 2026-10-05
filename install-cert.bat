@echo off
title MapVeri SSL Certificate Installer
echo ===================================================================
echo     MapVeri Local Development Certificate Installer (mkcert)
echo ===================================================================
echo.
echo Installing the local CA into Windows, Chrome, Edge, and Firefox...
echo A Windows Security Warning prompt may appear. Click "Yes" to confirm.
echo.
"%~dp0apps\mapveri\.cert\mkcert.exe" -install
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] The development certificate is now trusted by your system!
    echo.
    echo - Chrome: Trusted (No "Advanced" warning)
    echo - Edge: Trusted (No "Advanced" warning)
    echo - Firefox: Trusted (No "Advanced" warning)
    echo.
    echo Please restart or refresh your browser tab at:
    echo   https://localhost:5173
) else (
    echo [NOTICE] If prompted by Windows, make sure to click "Yes" to confirm.
)
echo.
pause
