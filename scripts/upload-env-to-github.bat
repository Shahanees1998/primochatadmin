@echo off
echo Running GitHub Environment Variables Uploader...
echo.

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0upload-env-to-github.ps1" %*

echo.
echo Press any key to exit...
pause >nul 