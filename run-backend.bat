@echo off
echo ========================================================
echo Starting Marketing OS FastAPI Backend (Port 8000)...
echo ========================================================
cd backend
if not exist venv (
    echo [Setup] Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
echo [Setup] Checking backend dependencies...
pip install -r requirements.txt
echo.
echo ========================================================
echo FastAPI Backend Running at: http://127.0.0.1:8000
echo API Documentation / Swagger: http://127.0.0.1:8000/docs
echo ========================================================
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
pause
