@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo NexVett AI - Monorepo Setup
echo ==========================================

REM Check if pnpm is installed
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ pnpm is not installed. Please install pnpm first:
    echo    npm install -g pnpm
    pause
    exit /b 1
)

echo 📦 Installing all dependencies (Monorepo)...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Installation failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 🚀 Starting servers in parallel...
echo [Hint] You can also run 'pnpm dev' from the root terminal.

echo.
echo Starting Backend (nexvett-ai)...
start "NexVett AI Backend" cmd /k "cd nexvett-ai && pnpm dev"

echo Starting Client (nexvett-ai-client)...
start "NexVett AI Client" cmd /k "cd nexvett-ai-client && pnpm dev"

echo.
echo ==========================================
echo Components are launching!
echo Backend: http://localhost:4111
echo Client: http://localhost:3000
echo ==========================================
pause