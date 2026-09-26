# AI Marketing Operating System (Marketing OS)

Evidence-grounded, multi-channel marketing automation platform built for startup founders and lean teams.

---

## 🚀 Quick Start (Running on Any Laptop)

### Prerequisites
Make sure you have installed on your laptop:
1. **Python 3.10+** (check with `python --version`)
2. **Node.js 18+** & npm (check with `node --version`)
3. **Git**

---

### Option A: 1-Click Launch (Windows)
If you are on Windows, simply double-click:
```
start-all.bat
```
This automatically sets up the Python virtual environment, installs backend and frontend dependencies, and opens both services in separate terminal windows.

---

### Option B: Step-by-Step Terminal Instructions (Mac, Linux & Windows)

#### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd <repo-folder>
```

#### Step 2: Start the Backend (FastAPI on Port 8000)
Open your first terminal window:
```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a Python virtual environment
# Windows:
python -m venv venv
.\venv\Scripts\activate

# Mac/Linux:
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the FastAPI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
> The local SQLite database (`marketing_os.db`) and all tables auto-initialize automatically on first startup!
> Backend API: `http://127.0.0.1:8000` | Swagger Docs: `http://127.0.0.1:8000/docs`

#### Step 3: Start the Frontend (Next.js on Port 3000)
Open a **second** terminal window:
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Create .env.local from example
# Windows:
copy .env.example .env.local

# Mac/Linux:
cp .env.example .env.local

# 3. Install packages
npm install

# 4. Start Next.js development server
npm run dev
```

#### Step 4: Open in Browser
Visit **`http://localhost:3000`** in your browser!

---

## 🔍 Common Issues & Solutions

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"ModuleNotFoundError: No module named ..."** | Missing Python packages in virtual environment | Run `pip install -r requirements.txt` inside the `backend` folder with your venv activated. |
| **"Failed to fetch" / API errors on frontend** | Backend is not running or on wrong port | Make sure **both** terminal windows are running (Backend on `127.0.0.1:8000` AND Frontend on `localhost:3000`). |
| **"Port 3000 already in use"** | Another app is running on port 3000 | Next.js will ask to run on port 3001. Our backend CORS is already pre-configured to accept 3000, 3001, 3002, and 5173. |
| **"npm ERR! enoent open 'package.json'"** | Trying to run `npm run dev` from project root | Run `cd frontend` first, then run `npm run dev`. |
| **Database missing or empty** | Clean git clone | SQLite tables auto-create on backend startup. No manual SQL scripts required. |

---

## 🛠 Tech Stack
- **Frontend**: Next.js 15+ (App Router), React 19, Tailwind CSS, Lucide Icons
- **Backend**: FastAPI (Python 3.10+), Pydantic v2, Uvicorn
- **Database**: Local SQLite (Zero-config persistent storage) + Supabase support
- **AI Agents**: Aster Strategist (Adaptive Interview Agent, Brand Memory Synthesis, Editorial Multi-Channel Generator)
