@echo off
setlocal
cd /d "%~dp0"
node scripts/setup.mjs
if errorlevel 1 exit /b %errorlevel%
if not exist ".next\BUILD_ID" (
  call npm.cmd run build
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
node scripts/run.mjs start
pause
