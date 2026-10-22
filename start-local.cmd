@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\next\dist\bin\next" (
  echo Run: corepack.cmd pnpm@10.34.3 install --frozen-lockfile
  pause
  exit /b 1
)
node scripts/setup.mjs
if errorlevel 1 exit /b %errorlevel%
node scripts/run.mjs dev
pause
