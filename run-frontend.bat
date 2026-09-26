@echo off
echo ========================================================
echo Starting Marketing OS Next.js Frontend (Port 3000)...
echo ========================================================
cd frontend
if not exist .env.local (
    echo [Setup] Initializing .env.local from .env.example...
    copy .env.example .env.local
)
if not exist node_modules (
    echo [Setup] Installing npm packages (first time setup)...
    npm install
)
echo.
echo ========================================================
echo Next.js Web App Running at: http://localhost:3000
echo ========================================================
npm run dev
pause
