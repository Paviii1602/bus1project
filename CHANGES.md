# NavBus — Fix Summary

## Files Changed

### frontend/src/App.js
1. **Hardcoded local IP removed** (line 6)
   - Before: `return 'http://10.156.157.191:5000/api'`
   - After:  `return 'https://navbus.onrender.com/api'`
   - Why: This was the PRIMARY cause of the blank screen on mobile. Any device
     not on your home WiFi could never reach the backend.

2. **Location permission persisted in localStorage**
   - Before: `useState(false)` — asked EVERY login session
   - After: reads `navbus_loc_granted` from localStorage
   - Why: On mobile the OS location prompt only appears once. If the app
     kept resetting this flag, users were stuck on the location screen forever.

3. **onGranted / onDenied save to localStorage**
   - Both handlers now call `localStorage.setItem('navbus_loc_granted', 'true')`
   - Why: Pairs with fix #2 — makes the grant persist across sessions.

### frontend/src/index.css
4. **Mobile safe-area and iOS fixes added** (appended at end)
   - `viewport-fit=cover` safe area insets for notch/home-bar devices
   - `-webkit-fill-available` height fix (prevents blank gap on iOS Safari)
   - Input font-size set to 16px to prevent iOS auto-zoom on focus
   - `touch-action: manipulation` on buttons to prevent double-tap zoom

### frontend/public/index.html  ← NEW FILE (was missing)
5. **Proper mobile viewport meta tag**
   - `width=device-width, initial-scale=1, viewport-fit=cover`
   - Apple PWA meta tags (`apple-mobile-web-app-capable` etc.)
   - `theme-color` meta for Android browser chrome
   - Poppins font preloaded

### app.py
6. **CORS restricted to known origins**
   - Before: `CORS(app)` — allowed ALL origins (security risk)
   - After: restricted to `FRONTEND_ORIGIN` env var + localhost:3000
   - Set `FRONTEND_ORIGIN` in Render dashboard to your frontend URL

7. **prepare_app() runs only once**
   - Added `_app_initialized` boolean guard
   - Before: could spawn multiple `simulate_bus_movement` background tasks
     if Gunicorn ever forked workers
   - After: guaranteed to run exactly once

### frontend/.env  (renamed from _env)
8. **Filename corrected**
   - The file was named `_env` — React only reads `.env`
   - Now correctly named `.env`

## How to Deploy

### Backend (Render)
1. Push to your Git repo
2. In Render Dashboard → navbus-backend → Environment:
   - Set `FRONTEND_ORIGIN` = `https://navbus-frontend.onrender.com`
   - Set `GOOGLE_MAPS_API_KEY` = your key
   - `JWT_SECRET_KEY` is auto-generated

### Frontend (Render Static Site)
1. Set `REACT_APP_API_BASE` = `https://navbus-backend.onrender.com`
2. Set `REACT_APP_GOOGLE_MAPS_API_KEY` = your key
3. Build command: `cd frontend && npm install && npm run build`
4. Publish path: `frontend/build`

## Folder Structure
```
NavBus_Fixed/
├── app.py                     ← Fixed backend
├── database_init.py           ← Unchanged
├── requirements.txt           ← Unchanged
├── render.yaml                ← Unchanged
├── CHANGES.md                 ← This file
└── frontend/
    ├── .env                   ← Fixed (was named _env)
    ├── package.json           ← Unchanged
    ├── capacitor.config.ts    ← Unchanged
    ├── public/
    │   └── index.html         ← NEW — proper mobile viewport
    └── src/
        ├── App.js             ← Fixed (3 changes)
        ├── index.css          ← Fixed (mobile safe-area appended)
        └── index.js           ← Unchanged
```
