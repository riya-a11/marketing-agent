@echo off
echo ========================================================
echo Launching AI Marketing OS Full Stack
echo ========================================================
echo.
echo Starting FastAPI Backend in window 1...
start "Marketing OS Backend (FastAPI)" cmd /c run-backend.bat
echo Starting Next.js Frontend in window 2...
start "Marketing OS Frontend (Next.js)" cmd /c run-frontend.bat
echo.
echo Both services are booting up!
echo - Web App:  http://localhost:3000
echo - REST API: http://127.0.0.1:8000
echo - Swagger:  http://127.0.0.1:8000/docs
echo ========================================================
