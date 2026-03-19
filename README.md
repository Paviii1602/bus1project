# NavBus — Real-Time Bus Tracker for Vellore

A mobile-friendly bus tracking app for local buses in Vellore city.

## Folder Structure

```
NavBus/
├── app.py                  ← Flask backend (API + WebSocket)
├── database_init.py        ← Database schema + seed data
├── requirements.txt        ← Python dependencies
├── render.yaml             ← Render.com deploy config
└── frontend/
    ├── .env                ← API keys (local dev)
    ├── package.json        ← Node dependencies + proxy
    ├── capacitor.config.ts ← Mobile (Capacitor) config
    ├── public/
    │   └── index.html      ← HTML entry point
    └── src/
        ├── App.js          ← Main React app
        ├── index.css       ← All styles
        └── index.js        ← React entry point
```

## Quick Start (Local)

### 1. Backend
```bash
cd NavBus
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
python app.py
```
Backend runs at: http://localhost:5000

### 2. Frontend
```bash
cd NavBus/frontend
npm install
npm start
```
App opens at: http://localhost:3000

### 3. First Run
- Delete any old `database.db` file before starting
- The database is auto-created on first `python app.py`

## Test on Phone (same Wi-Fi)
1. Find your PC IP: `ipconfig` (Windows) / `ifconfig` (Mac)
2. Edit `frontend/.env` → set `REACT_APP_API_BASE=http://YOUR_PC_IP:5000/api`
3. Open `http://YOUR_PC_IP:3000` on your phone browser

## Deploy to Render
1. Push this folder to GitHub
2. Backend → New Web Service
   - Build: `pip install -r requirements.txt`
   - Start: `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app`
   - Set env vars: `GOOGLE_MAPS_API_KEY`, `FRONTEND_ORIGIN`
3. Frontend → New Static Site
   - Build: `cd frontend && npm install && npm run build`
   - Publish: `frontend/build`
   - Set env vars: `REACT_APP_API_BASE`, `REACT_APP_GOOGLE_MAPS_API_KEY`

## Routes
- Route 1: Bagayam → Katpadi (Via Polytechnic) — 23 stops
- Route 2: Bagayam → Katpadi (Via Otteri) — 20 stops
- 32 buses, all running both routes (driver picks route each trip)

## Tech Stack
- Backend: Flask + Flask-SocketIO + Flask-JWT
- Frontend: React 18 + Google Maps API
- Database: SQLite
- Mobile: Capacitor (Android)
