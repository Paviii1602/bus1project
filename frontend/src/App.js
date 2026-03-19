import React, { useState, useEffect, useCallback, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

const getApiBase = () => {
  const envBase = process.env.REACT_APP_API_BASE;
  if (!envBase) return 'http://localhost:5000/api';
  
  let base = envBase.trim();
  if (!base.startsWith('http')) {
    base = `https://${base}`;
  }
  // Remove trailing slash if present
  base = base.replace(/\/$/, "");
  // Ensure it ends with /api
  return base.endsWith('/api') ? base : `${base}/api`;
};

const API_BASE = getApiBase();
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
// ─── SVG ICONS ───────────────────────────────────────────────────────────────
const BusIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" />
  </svg>
);
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);
const LocationIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
  </svg>
);
const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);
const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
  </svg>
);
const NavBusLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z" />
  </svg>
);
const SwapIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z" />
  </svg>
);

// ─── GOOGLE MAPS LOADER ───────────────────────────────────────────────────────
function useGoogleMaps() {
  const [loaded, setLoaded] = useState(!!window.google?.maps);
  useEffect(() => {
    if (window.google?.maps) { setLoaded(true); return; }
    const existing = document.querySelector('script[data-gmaps]');
    if (existing) {
      existing.addEventListener('load', () => setLoaded(true));
      return;
    }
    const script = document.createElement('script');
    script.setAttribute('data-gmaps', 'true');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
  return loaded;
}

// ─── SPLASH ──────────────────────────────────────────────────────────────────
function SplashScreen({ onComplete }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2500);
    return () => clearTimeout(t);
  }, [onComplete]);
  return (
    <div className="splash-screen">
      <div className="splash-logo"><NavBusLogo /></div>
      <h1 className="splash-title">NavBus</h1>
      <p className="splash-subtitle">Track Your Bus</p>
    </div>
  );
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onRegisterClick }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Please enter username and password'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) onLogin(data);
      else setError(data.error || 'Login failed');
    } catch { setError('Cannot connect to server'); }
    setLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-logo"><NavBusLogo /></div>
        <h1>Welcome Back</h1>
        <p className="login-subtitle">Sign in to continue to NavBus</p>
        <form onSubmit={handleLogin}>
          {error && <div className="login-error">⚠️ {error}</div>}
          <div className="form-group">
            <label>Username</label>
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? <span className="login-loading">⏳ Signing in…</span> : '→  Sign In'}
          </button>
          <div className="login-divider"><span>or</span></div>
          <div className="login-footer">
            New to NavBus?{' '}
            <button type="button" onClick={onRegisterClick}>Create Account</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── REGISTER ────────────────────────────────────────────────────────────────
function RegisterScreen({ onLoginClick, onRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('passenger');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Please fill all fields'); return; }
    if (password.length < 4) { setError('Password must be at least 4 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });
      const data = await res.json();
      if (res.ok) onRegister({ username, role });
      else setError(data.error || 'Registration failed');
    } catch { setError('Cannot connect to server'); }
    setLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        <div className="login-logo"><NavBusLogo /></div>
        <h1>Create Account</h1>
        <p className="login-subtitle">Join NavBus — Vellore's bus tracker</p>
        <form onSubmit={handleRegister}>
          {error && <div className="login-error">⚠️ {error}</div>}
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" autoComplete="username" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 4 characters" autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label>Pick Your Role (Choice is Final)</label>
            <div className="role-toggle">
              <button type="button" className={`role-btn ${role === 'passenger' ? 'active' : ''}`} onClick={() => setRole('passenger')}>🧍 Passenger</button>
              <button type="button" className={`role-btn ${role === 'driver' ? 'active' : ''}`} onClick={() => setRole('driver')}>🚌 Driver</button>
            </div>
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? '⏳ Creating account…' : '→  Create Account'}
          </button>
          <div className="login-divider"><span>or</span></div>
          <div className="login-footer">
            Already have an account?{' '}
            <button type="button" onClick={onLoginClick}>Sign In</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── LOCATION PERMISSION ─────────────────────────────────────────────────────
function LocationPermissionScreen({ onGranted, onDenied }) {
  const [status, setStatus] = useState('pending');

  const requestLocation = () => {
    if (!navigator.geolocation) { setStatus('denied'); return; }
    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setStatus('granted');
        setTimeout(() => onGranted({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }), 800);
      },
      () => setStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="location-screen">
      <div className="location-container">
        <div className="location-icon"><LocationIcon /></div>
        <h1 className="location-title">Enable Location</h1>
        <p className="location-text">NavBus needs your location to find nearby buses and show accurate ETAs.</p>
        
        {status === 'denied' && (
          <div className="location-error">
            <strong>Location Access Denied</strong><br/>
            Please enable location in your browser settings or device settings.
          </div>
        )}
        
        <button className="location-btn" onClick={requestLocation} disabled={status === 'requesting' || status === 'granted'}>
          {status === 'requesting' ? 'Requesting…' : status === 'granted' ? '✓ Granted' : 'Allow Location Access'}
        </button>
        
        <button className="skip-btn" onClick={onDenied}>
          {status === 'denied' ? 'Continue with Default Location' : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}

// ─── PROFILE DRAWER ───────────────────────────────────────────────────────────
function ProfileDrawer({ user, recentSearches, theme, onToggleTheme, onLogout, onClose }) {
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className={`profile-drawer ${theme === 'dark' ? 'dark' : ''}`}>
        <button className="drawer-close" onClick={onClose}>✕</button>
        <div className="drawer-user-section">
          <div className="drawer-avatar"><ProfileIcon /></div>
          <div className="drawer-user-info">
            <p className="drawer-username">{user?.username || 'Guest'}</p>
            <span className={`drawer-role-badge ${user?.role}`}>
              {user?.role === 'driver' ? '🚌 Driver' : '🧍 Passenger'}
            </span>
          </div>
        </div>
        <div className="drawer-divider" />
        <div className="drawer-section">
          <p className="drawer-section-title">🔍 Recent Searches</p>
          {recentSearches.length > 0 ? recentSearches.slice(0, 5).map((s, i) => (
            <div key={i} className="drawer-recent-item">
              <span className="drawer-recent-icon">🕐</span>
              <span className="drawer-recent-text">{s}</span>
            </div>
          )) : <p className="drawer-empty-text">No recent searches</p>}
        </div>
        <div className="drawer-divider" />
        <div className="drawer-section">
          <p className="drawer-section-title">🎨 Theme</p>
          <div className="drawer-theme-row">
            <span className="drawer-theme-label">{theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
            <div className={`theme-toggle ${theme === 'dark' ? 'on' : ''}`} onClick={onToggleTheme}>
              <div className="theme-toggle-knob" />
            </div>
          </div>
        </div>
        <div className="drawer-divider" />
        <div className="drawer-section">
          <button className="drawer-logout-btn" onClick={onLogout}>🚪 Log Out</button>
        </div>
      </div>
    </>
  );
}

// ─── TRIP SEARCH ──────────────────────────────────────────────────────────────
function TripSearchBar({ onTripResult, onSaveSearch, allStops }) {
  const [fromStop, setFromStop] = useState('');
  const [toStop, setToStop] = useState('');
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!fromStop || !toStop) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/search_trip?from=${encodeURIComponent(fromStop)}&to=${encodeURIComponent(toStop)}`);
      const data = await res.json();
      
      // Map format to include from/to stop locations if needed (optional but good for context)
      // For now, search_trip returns enough info to identify buses and routes.
      // We pass the full objects for from/to context if we can find them.
      // But since /api/stops/unique only returns names, we just pass names for context.
      onTripResult(data.buses || [], { name: fromStop }, { name: toStop });
      if (onSaveSearch) onSaveSearch(`${fromStop} → ${toStop}`);
    } catch { }
    setSearching(false);
  };

  const swapStops = () => {
    const tmp = fromStop;
    setFromStop(toStop);
    setToStop(tmp);
  };

  return (
    <div className="trip-search-container">
      <p className="section-title" style={{ marginTop: 0, fontSize: 13, color: '#666' }}>Plan your trip</p>
      
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11 }}>From</label>
        <select 
          className="trip-input" 
          value={fromStop} 
          onChange={e => setFromStop(e.target.value)}
          style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
        >
          <option value="">Select starting stop…</option>
          {allStops.map((s, i) => <option key={i} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0' }}>
        <button className="trip-swap-btn" onClick={swapStops} style={{ zIndex: 5 }}><SwapIcon /></button>
      </div>

      <div className="form-group" style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11 }}>To</label>
        <select 
          className="trip-input" 
          value={toStop} 
          onChange={e => setToStop(e.target.value)}
          style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
        >
          <option value="">Select destination stop…</option>
          {allStops.map((s, i) => <option key={i} value={s}>{s}</option>)}
        </select>
      </div>

      <button className="trip-search-btn" onClick={handleSearch} disabled={!fromStop || !toStop || searching}>
        {searching ? '🔍 Searching…' : <><SearchIcon /> Find My Bus</>}
      </button>
    </div>
  );
}

// ─── SEARCH RESULT SCREEN ────────────────────────────────────────────────────
function SearchResultScreen({ fromStop, toStop, onBack, onBusSelect, userLocation }) {
  const mapsLoaded = useGoogleMaps();
  const mapRef    = useRef(null);
  const mapInst   = useRef(null);
  const markersRef  = useRef([]);
  const polylineRef = useRef(null);
  const infoWinRef  = useRef(null);

  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Fetch search result once
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/search_trip?from=${encodeURIComponent(fromStop)}&to=${encodeURIComponent(toStop)}`)
      .then(r => r.json())
      .then(data => { setResult(data); setLoading(false); })
      .catch(() => { setError('Could not load results'); setLoading(false); });
  }, [fromStop, toStop]);

  // Refresh active bus positions every 15 s
  useEffect(() => {
    if (!result) return;
    const refresh = () => {
      fetch(`${API_BASE}/search_trip?from=${encodeURIComponent(fromStop)}&to=${encodeURIComponent(toStop)}`)
        .then(r => r.json())
        .then(data => setResult(data))
        .catch(() => {});
    };
    const iv = setInterval(refresh, 15000);
    return () => clearInterval(iv);
  }, [fromStop, toStop, result]);

  // Draw map whenever result or mapsLoaded changes
  useEffect(() => {
    if (!mapsLoaded || !result || !mapRef.current) return;
    const stops = result.stops || [];
    if (stops.length === 0) return;

    const center = { lat: stops[0].latitude, lng: stops[0].longitude };
    if (!mapInst.current) {
      mapInst.current = new window.google.maps.Map(mapRef.current, {
        center, zoom: 14,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        styles: [
          { featureType: 'poi',            elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'transit.station',elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'transit.line',   elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'road',           elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#444444' }] },
          { featureType: 'road',           elementType: 'geometry',         stylers: [{ color: '#ffffff' }] },
          { featureType: 'road.arterial',  elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
          { featureType: 'road.highway',   elementType: 'geometry',         stylers: [{ color: '#dadada' }] },
          { featureType: 'road.highway',   elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
          { featureType: 'landscape',      elementType: 'geometry',         stylers: [{ color: '#f5f5f5' }] },
          { featureType: 'water',          elementType: 'geometry',         stylers: [{ color: '#c9d8e8' }] },
          { featureType: 'water',          elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
        ],
      });
      infoWinRef.current = new window.google.maps.InfoWindow();
    }
    const map = mapInst.current;

    // Clear old markers + polyline
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) polylineRef.current.setMap(null);

    const bounds = new window.google.maps.LatLngBounds();

    // Draw route polyline (only the searched segment)
    if (stops.length > 1) {
      const path = stops.map(s => ({ lat: s.latitude, lng: s.longitude }));
      polylineRef.current = new window.google.maps.Polyline({
        path, strokeColor: '#15a8cd', strokeOpacity: 0.9, strokeWeight: 5, map,
      });
      path.forEach(p => bounds.extend(p));
    }

    // Draw stop markers
    stops.forEach((stop, i) => {
      const pos = { lat: stop.latitude, lng: stop.longitude };
      bounds.extend(pos);
      const isFirst = i === 0;
      const isSearched = stop.name.toLowerCase() === fromStop.toLowerCase();
      
      const pinColor = isSearched ? '#f59e0b' : '#64748b';
      const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8" fill="${pinColor}" stroke="white" stroke-width="2"/>
            ${isSearched ? `<rect x="8" y="22" width="8" height="2" fill="${pinColor}" />` : ''}
          </svg>`
        )}`,
        scaledSize: new window.google.maps.Size(34, 34),
        anchor: new window.google.maps.Point(17, 17),
      };
      const marker = new window.google.maps.Marker({ position: pos, map, icon, title: stop.name, zIndex: isSearched ? 10 : 1 });
      
      if (isSearched) {
        const info = new window.google.maps.InfoWindow({
          content: `<div style="padding:4px 8px;font-weight:700;font-size:12px;">${stop.name}</div>`,
          disableAutoPan: true
        });
        info.open(map, marker);
      }
      
      markersRef.current.push(marker);
    });

    // Draw active buses on the map
    (result.buses || []).forEach(bus => {
      if (!bus.is_active || !bus.latitude || !bus.longitude) return;
      const pos = { lat: bus.latitude, lng: bus.longitude };
      bounds.extend(pos);
      const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="14" fill="#15a8cd" stroke="white" stroke-width="3"/>
            <text x="20" y="26" font-size="16" text-anchor="middle" fill="white" font-weight="900">B</text>
          </svg>`
        )}`,
        scaledSize: new window.google.maps.Size(36, 36),
        anchor: new window.google.maps.Point(18, 18),
      };
      const m = new window.google.maps.Marker({ position: pos, map, icon, title: bus.bus_name, zIndex: 999 });
      markersRef.current.push(m);
    });

    // User location
    if (userLocation) {
      const uPos = { lat: userLocation.latitude, lng: userLocation.longitude };
      const uIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="11" fill="#22c55e" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="4" fill="white"/>
          </svg>`
        )}`,
        scaledSize: new window.google.maps.Size(24, 24),
        anchor: new window.google.maps.Point(12, 12),
      };
      markersRef.current.push(new window.google.maps.Marker({ position: uPos, map, icon: uIcon, title: 'You' }));
    }

    if (!bounds.isEmpty()) map.fitBounds(bounds, { top: 50, right: 20, bottom: 20, left: 20 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded, result, userLocation]);

  const activeBuses  = (result?.buses || []).filter(b => b.is_active);
  const allBuses     = (result?.buses || []);
  const stops        = result?.stops || [];

  return (
    <div className="app-container" style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Search Overlay */}
      <div className="search-overlay">
        <button className="back-btn" onClick={onBack} style={{ color: '#64748b', padding: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>
        <div className="search-box-pill">
          <div className="search-dot" />
          <span className="search-input">{fromStop}</span>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, padding: '0 4px', width: 'auto', margin: 0 }}>✕</button>
        </div>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#15a8cd' }} />
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <>
          {/* Map */}
          <div ref={mapRef} style={{ width: '100%', flex: 1, background: '#e5e3df', minHeight: '40vh' }}>
            {!mapsLoaded && (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            )}
          </div>

          {/* Bottom Panel */}
          <div style={{
            background: '#1a1a1a', color: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24,
            padding: '20px 16px 30px', marginTop: -24, zIndex: 10, position: 'relative',
            maxHeight: '50vh', overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              {allBuses.length} buses available near {fromStop}
            </h3>

            {allBuses.map((bus, i) => (
              <div key={i} className="bus-card" style={{
                background: '#262626', border: 'none', borderRadius: 16, padding: '16px', marginBottom: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }} onClick={() => onBusSelect(bus.bus_id, bus.route_id, { name: fromStop }, { name: toStop })}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 4 }}>{bus.bus_name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Via {bus.route_name.split('·')[0]} • {bus.start_time}-{bus.end_time}</div>
                </div>
                <div className={`status-badge ${bus.is_active ? 'arriving' : 'minutes'}`} style={{
                  background: bus.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(21,168,205,0.1)',
                  color: bus.is_active ? '#22c55e' : '#15a8cd',
                  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800
                }}>
                  {bus.is_active ? 'Arriving' : `${Math.floor(Math.random() * 15) + 5} min`}
                </div>
              </div>
            ))}

            {allBuses.length === 0 && (
              <p style={{ textAlign: 'center', color: '#666', padding: '20px 0' }}>No buses found</p>
            )}

            <div style={{ textAlign: 'center', color: '#666', fontSize: 12, marginTop: 8 }}>
              tap a bus on map or in list to see details
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── STOP TIMELINE ───────────────────────────────────────────────────────────
// Reusable dark-card timeline used in ETA panel, Driver stops, and Route detail
function StopTimeline({ stops, activeStopId, getRight }) {
  // stops: [{ id, name, ... }]
  // activeStopId: highlight this stop (next stop for driver, arriving for passenger)
  // getRight: fn(stop, i) → JSX for right side (ETA badge, "Stop N", etc.)
  const arr = Array.isArray(stops) ? stops : [];
  return (
    <div style={{
      background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', padding: '4px 16px',
      margin: '0 0 8px 0'
    }}>
      {arr.map((stop, i) => {
        const isFirst  = i === 0;
        const isLast   = i === arr.length - 1;
        const isActive = stop.id === activeStopId;
        const dotColor = isActive ? '#f59e0b'
                       : isFirst  ? '#15a8cd'
                       : isLast   ? '#ef4444'
                       : 'white';
        const dotBorder = isActive ? '#f59e0b'
                        : isFirst  ? '#15a8cd'
                        : isLast   ? '#ef4444'
                        : '#cbd5e1';
        const dotGlow = isFirst  ? '0 0 8px rgba(21,168,205,0.6)'
                      : isActive ? '0 0 8px rgba(245,158,11,0.6)'
                      : 'none';
        return (
          <div key={stop.id || i} style={{ display: 'flex', alignItems: 'stretch', gap: 14 }}>
            {/* Timeline dot + line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 22, flexShrink: 0 }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 15,
                background: dotColor, border: `2px solid ${dotBorder}`,
                boxShadow: dotGlow,
              }} />
              {!isLast && <div style={{ width: 2, flex: 1, background: '#1e3a4a', minHeight: 18 }} />}
            </div>
            {/* Stop info */}
            <div style={{
              flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0',
              borderBottom: !isLast ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 14, fontWeight: isFirst || isActive ? 700 : 400,
                  color: isActive ? '#f59e0b' : isFirst ? '#036ea7' : isLast ? '#ef4444' : '#374151',
                }}>
                  {stop.name || stop.stop_name}
                </span>
                {isFirst && !isActive && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#15a8cd',
                    background: 'rgba(21,168,205,0.15)', border: '1px solid rgba(21,168,205,0.3)',
                    padding: '2px 7px', borderRadius: 6, letterSpacing: 0.5,
                  }}>START</span>
                )}
                {isActive && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#f59e0b',
                    background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                    padding: '2px 7px', borderRadius: 6, letterSpacing: 0.5,
                  }}>NEXT</span>
                )}
                {isLast && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#ef4444',
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                    padding: '2px 7px', borderRadius: 6, letterSpacing: 0.5,
                  }}>END</span>
                )}
              </div>
              {getRight && (
                <div style={{ flexShrink: 0, marginLeft: 8 }}>
                  {getRight(stop, i)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────
const HomeScreen = ({ routes, buses, user, cityName, onRouteSelect, onBusSelect, onNearMe, onProfileClick, onSaveSearch, userLocation, allStops, onLogout }) => {
  const mapsLoaded  = useGoogleMaps();
  const mapRef      = useRef(null);
  const mapInst     = useRef(null);
  const markersRef  = useRef([]);
  const infoWinRef  = useRef(null);

  const [fromStop, setFromStop]         = useState('');
  const [toStop, setToStop]             = useState('');
  const [showResult, setShowResult]     = useState(false);
  const [activeBuses, setActiveBuses]   = useState([]);

  const safeAllStops = Array.isArray(allStops) ? allStops : [];
  const safeBuses    = Array.isArray(buses) ? buses : [];
  const uniqueBuses  = safeBuses.filter((b, i, arr) => arr.findIndex(x => x.bus_id === b.bus_id) === i);

  // Fetch active buses every 15 s
  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetch(`${API_BASE}/active_buses`)
        .then(r => r.json())
        .then(data => { if (mounted) setActiveBuses(Array.isArray(data) ? data : []); })
        .catch(() => {});
    };
    load();
    const iv = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  // Draw active buses on home map
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;
    if (!mapInst.current) {
      mapInst.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 12.93, lng: 79.13 }, zoom: 13,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        styles: [
          { featureType: 'poi',            elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'transit.station',elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'transit.line',   elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'road',           elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#444444' }] },
          { featureType: 'road',           elementType: 'geometry',         stylers: [{ color: '#ffffff' }] },
          { featureType: 'road.arterial',  elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
          { featureType: 'road.highway',   elementType: 'geometry',         stylers: [{ color: '#dadada' }] },
          { featureType: 'road.highway',   elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
          { featureType: 'landscape',      elementType: 'geometry',         stylers: [{ color: '#f5f5f5' }] },
          { featureType: 'water',          elementType: 'geometry',         stylers: [{ color: '#c9d8e8' }] },
          { featureType: 'water',          elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
        ],
      });
      infoWinRef.current = new window.google.maps.InfoWindow();
    }
    const map = mapInst.current;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    activeBuses.forEach(ab => {
      if (!ab.latitude || !ab.longitude) return;
      const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="18" fill="#16a34a" stroke="white" stroke-width="2"/>
            <text x="19" y="25" font-size="19" text-anchor="middle">🚌</text>
          </svg>`
        )}`,
        scaledSize: new window.google.maps.Size(38, 38),
        anchor: new window.google.maps.Point(19, 19),
      };
      const m = new window.google.maps.Marker({ position: { lat: ab.latitude, lng: ab.longitude }, map, icon, title: ab.bus_name });
      m.addListener('click', () => {
        infoWinRef.current.setContent(`<div style="padding:8px"><strong>${ab.bus_name}</strong><p style="font-size:12px;color:#16a34a;margin-top:4px">🟢 Live · ${ab.speed || 0} km/h</p></div>`);
        infoWinRef.current.open(map, m);
      });
      markersRef.current.push(m);
    });

    if (userLocation) {
      const uIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="11" fill="#22c55e" stroke="white" stroke-width="2"/>
            <circle cx="12" cy="12" r="4" fill="white"/>
          </svg>`
        )}`,
        scaledSize: new window.google.maps.Size(24, 24),
        anchor: new window.google.maps.Point(12, 12),
      };
      markersRef.current.push(new window.google.maps.Marker({ position: { lat: userLocation.latitude, lng: userLocation.longitude }, map, icon: uIcon, title: 'You' }));
    }
  }, [mapsLoaded, activeBuses, userLocation]);

  const handleSearch = () => {
    if (!fromStop || !toStop) return;
    if (onSaveSearch) onSaveSearch(`${fromStop} → ${toStop}`);
    setShowResult(true);
  };

  const swapStops = () => { const t = fromStop; setFromStop(toStop); setToStop(t); };

  // If search result screen is active, show it
  if (showResult && fromStop && toStop) {
    return (
      <SearchResultScreen
        fromStop={fromStop}
        toStop={toStop}
        userLocation={userLocation}
        onBack={() => setShowResult(false)}
        onBusSelect={onBusSelect}
      />
    );
  }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header className="header" style={{ background: '#0070bb' }}>
        <div className="header-left">
          <div className="header-logo" style={{ background: 'white', borderRadius: '50%', padding: 4, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><NavBusLogo style={{ color: '#0070bb' }} /></div>
          <div className="header-title-group">
            <h1 className="header-title" style={{ fontSize: 18, letterSpacing: -0.5 }}>NavBus</h1>
            {cityName && <div className="header-location" style={{ opacity: 0.8 }}><LocationIcon /><span>{cityName}</span></div>}
          </div>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={onLogout} style={{
            background: 'rgba(255,255,255,0.15)', width: 'auto', padding: '6px 16px',
            fontSize: 12, marginTop: 0, borderRadius: 20, fontWeight: 700,
            border: 'none', color: 'white'
          }}>Sign Out</button>
          <div className="profile-icon" onClick={onProfileClick} style={{ cursor: 'pointer' }}><ProfileIcon /></div>
        </div>
      </header>

      {/* Search panel */}
      <div style={{ padding: '20px 16px 24px', background: '#0070bb', flexShrink: 0, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <p style={{ color: 'white', fontSize: 13, fontWeight: 600, marginBottom: 16, opacity: 0.9 }}>
          Where do you want to go?
        </p>

        {/* From */}
        <div className="search-box-pill" style={{ background: 'white', padding: '12px 16px', borderRadius: 12, marginBottom: 12 }}>
          <div className="search-dot" style={{ borderColor: '#0070bb' }} />
          <select value={fromStop} onChange={e => setFromStop(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontWeight: 600, color: '#0f2030', background: 'transparent' }}>
            <option value="">Starting Stop</option>
            {safeAllStops.map((s, i) => <option key={i} value={s}>{s}</option>)}
          </select>
        </div>

        {/* To row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="search-box-pill" style={{ background: 'white', padding: '12px 16px', borderRadius: 12, flex: 1 }}>
            <div className="search-dot" style={{ borderColor: '#ef4444' }} />
            <select value={toStop} onChange={e => setToStop(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontWeight: 600, color: '#0f2030', background: 'transparent' }}>
              <option value="">Destination Stop</option>
              {safeAllStops.map((s, i) => <option key={i} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={swapStops} style={{
            width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)',
            border: 'none', color: 'white', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            margin: 0, padding: 0
          }}><SwapIcon /></button>
        </div>

        {/* Search button */}
        <button onClick={handleSearch} disabled={!fromStop || !toStop} style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: (!fromStop || !toStop) ? 'rgba(255,255,255,0.2)' : '#ffcc00',
          color: (!fromStop || !toStop) ? 'rgba(255,255,255,0.5)' : '#000',
          fontWeight: 800, fontSize: 16, cursor: (!fromStop || !toStop) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 0,
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <SearchIcon /> Search Buses
        </button>
      </div>

      {/* Live map */}
      <div style={{ position: 'relative', marginTop: -20, padding: '0 16px' }}>
        <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,0.1)', background: 'white' }}>
          <div ref={mapRef} style={{ width: '100%', height: 180, background: '#e5e3df' }} />
        </div>
        <div style={{
          position: 'absolute', top: 12, left: 28,
          background: 'rgba(0,0,0,0.6)', color: 'white',
          fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 20,
          display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase'
        }}>
          <span className="status-dot" style={{ background: activeBuses.length > 0 ? '#22c55e' : '#ef4444' }} />
          {activeBuses.length > 0 ? `${activeBuses.length} Live` : 'No Live Buses'}
        </div>
        <button onClick={onNearMe} style={{
          position: 'absolute', bottom: 12, right: 28,
          background: 'white', border: 'none', borderRadius: 12,
          padding: '8px 16px', fontSize: 12, fontWeight: 800, color: '#0070bb',
          cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: 8, margin: 0
        }}><LocationIcon /> Near Me</button>
      </div>

      {/* All buses list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', background: 'transparent' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0f2030', margin: 0 }}>Available Buses</h2>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', background: 'white', padding: '4px 10px', borderRadius: 10 }}>{uniqueBuses.length} TOTAL</span>
        </div>
        {uniqueBuses.map((bus, i) => (
          <div key={i} className="bus-card" style={{
            background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px', marginBottom: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
          }} onClick={() => onBusSelect(bus.bus_id, bus.route_id)}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f2030', marginBottom: 4 }}>{bus.bus_name}</div>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClockIcon style={{ width: 12, height: 12 }} /> {bus.start_time} – {bus.end_time}
              </div>
            </div>
            <div style={{ background: '#f1f5f9', color: '#036ea7', padding: '6px 12px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>
              {bus.bus_number}
            </div>
          </div>
        ))}
        {uniqueBuses.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            <p>Loading bus schedules...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROUTE DETAIL ─────────────────────────────────────────────────────────────
function RouteDetailScreen({ routeId, onBack, onBusSelect, allRoutes, allBuses }) {
  const [route, setRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rRes, sRes, bRes] = await Promise.all([
          fetch(`${API_BASE}/routes/${routeId}`),
          fetch(`${API_BASE}/routes/${routeId}/stops`),
          fetch(`${API_BASE}/buses/route/${routeId}`),
        ]);
        setRoute(await rRes.json());
        setStops(await sRes.json());
        setBuses(await bRes.json());
      } catch { }
      finally { setLoading(false); }
    })();
  }, [routeId]);

  if (loading) return (
    <div className="app-container">
      <header className="header">
        <button className="back-btn" onClick={onBack}><BackIcon /> Back</button>
      </header>
      <div className="loading"><div className="spinner"></div></div>
    </div>
  );

  if (!route) return (
    <div className="app-container">
      <header className="header">
        <button className="back-btn" onClick={onBack}><BackIcon /> Back</button>
      </header>
      <div className="empty-state">
        <div className="empty-state-icon"><BusIcon /></div>
        <p className="empty-state-text">Could not load route. Please go back and try again.</p>
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <header className="header">
        <button className="back-btn" onClick={onBack}><BackIcon /> Back</button>
      </header>
      <div className="route-detail">
        <div className="route-detail-header">
          <h2 className="route-detail-title">{route?.route_name}</h2>
          <div className="route-detail-path">
            <LocationIcon /><span>{route?.start_point}</span><ArrowIcon /><span>{route?.end_point}</span>
          </div>
        </div>
        <div className="buses-section">
          <h3 className="buses-title">Buses on this Route</h3>
          {(Array.isArray(buses) ? buses : []).map((bus, i) => (
            <div key={i} className="bus-card" onClick={() => onBusSelect(bus.bus_id, routeId)}>
              <div className="bus-header">
                <span className="bus-name">{bus.bus_name}</span>
                <span className="bus-number">{bus.bus_number}</span>
              </div>
              <div className="bus-times">
                <div className="time-item"><ClockIcon /><span>{bus.start_time} – {bus.end_time}</span></div>
              </div>
            </div>
          ))}
          {(!Array.isArray(buses) || buses.length === 0) && <p style={{ textAlign: 'center', padding: 12, color: '#888' }}>No buses available.</p>}
        </div>
        <h3 className="buses-title" style={{ marginTop: 20 }}>Stops</h3>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>
          {(Array.isArray(stops) ? stops : []).length} stops · {route?.start_point} → {route?.end_point}
        </p>

        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {(Array.isArray(stops) ? stops : [])
            .filter((stop, index, self) => index === self.findIndex(s => s.name === stop.name))
            .sort((a, b) => a.stop_order - b.stop_order)
            .map((stop, i, arr) => {
              const isFirst = i === 0;
              const isLast  = i === arr.length - 1;
              return (
                <div key={stop.id} style={{ display: 'flex', alignItems: 'stretch' }}>
                  <div style={{ width: 44, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 2, flex: 1, minHeight: isFirst ? 16 : 0, background: isFirst ? 'transparent' : '#15a8cd' }} />
                    <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, background: isFirst ? '#15a8cd' : isLast ? '#ef4444' : 'white', border: `2.5px solid ${isFirst ? '#15a8cd' : isLast ? '#ef4444' : '#cbd5e1'}` }} />
                    <div style={{ width: 2, flex: 1, minHeight: isLast ? 16 : 0, background: isLast ? 'transparent' : '#e2e8f0' }} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 12px 0', borderBottom: !isLast ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, color: isFirst ? '#036ea7' : isLast ? '#ef4444' : '#374151', fontWeight: isFirst || isLast ? 600 : 400 }}>
                        {stop.name}
                      </span>
                      {isFirst && <span style={{ fontSize: 9, fontWeight: 700, color: '#036ea7', background: '#e6f4fb', border: '1px solid #93c5d8', padding: '1px 6px', borderRadius: 8 }}>START</span>}
                      {isLast  && <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', padding: '1px 6px', borderRadius: 8 }}>END</span>}
                    </div>
                    <span style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>Stop {i + 1}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ─── PUSH NOTIFICATION HOOK ───────────────────────────────────────────────────
function useNotifications(busId, userStop) {
  const intervalRef = useRef(null);

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  };

  const fireNotification = (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico', badge: '/favicon.ico', vibrate: [200, 100, 200] });
    }
  };

  useEffect(() => {
    if (!busId || !userStop) return;
    requestPermission();
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/check_nearby_notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bus_id: busId, stop_name: userStop }),
        });
        const data = await res.json();
        if (data.notify) {
          fireNotification('🚌 Bus Approaching!', `Your bus is ${data.distance_km} km away from ${userStop}`);
        }
      } catch { }
    };
    intervalRef.current = setInterval(check, 20000);
    check();
    return () => clearInterval(intervalRef.current);
  }, [busId, userStop]);

  return { fireNotification };
}

// ─── ROAD ROUTE HELPER ───────────────────────────────────────────────────────
async function fetchRoadRoute(routeId) {
  if (!routeId) return null;
  try {
    const res = await fetch(`${API_BASE}/routes/${routeId}/road_path`);
    const data = await res.json();
    if (data.path && data.path.length > 1) return data.path;
  } catch { }
  return null;
}

// ─── BUS TRACKING SCREEN ──────────────────────────────────────────────────────
function BusTrackingScreen({ busId, onBack, userLocation, selectedRouteId, searchContext }) {
  const mapsLoaded = useGoogleMaps();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const infoWindowRef = useRef(null);
  const lastTapRef = useRef(0);

  const [busData, setBusData] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('eta');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [activeBuses, setActiveBuses] = useState([]);
  const [notifyStop, setNotifyStop] = useState('');
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  // Crowdsourcing state
  const [crowdStatus, setCrowdStatus] = useState(null);
  const [onBusReported, setOnBusReported] = useState(false);
  const locationIntervalRef = useRef(null);
  const [crowdLoading, setCrowdLoading] = useState(false);
  const [crowdFeedback, setCrowdFeedback] = useState('');
  const [showCrowdPanel, setShowCrowdPanel] = useState(false);

  useNotifications(busId, notifyStop);

  useEffect(() => {
    if (!mapInstance.current || !window.google) return;
    setTimeout(() => window.google.maps.event.trigger(mapInstance.current, 'resize'), 50);
  }, [isMapFullscreen]);

  // ── BUG FIX 1: destructure all 4 responses correctly ─────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [tRes, sRes, csRes, abRes] = await Promise.all([
        fetch(`${API_BASE}/track/${busId}${selectedRouteId ? `?route_id=${selectedRouteId}` : ''}`),
        fetch(`${API_BASE}/schedules/bus/${busId}`),
        fetch(`${API_BASE}/crowd/status/${busId}`),
        fetch(`${API_BASE}/active_buses`),
      ]);
      setBusData(await tRes.json());
      setSchedules(await sRes.json());
      setCrowdStatus(await csRes.json());
      setActiveBuses(await abRes.json());
    } catch { }
    finally { setLoading(false); }
  }, [busId, selectedRouteId]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, [fetchData]);

  useEffect(() => {
    if (!mapsLoaded || !busData || !mapRef.current) return;
    const center = busData.position
      ? { lat: busData.position.latitude, lng: busData.position.longitude }
      : { lat: 12.92, lng: 79.13 };

    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center, zoom: 14,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        styles: [
          { featureType: 'poi',            elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'transit.station',elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'transit.line',   elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'road',           elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#444444' }] },
          { featureType: 'road',           elementType: 'geometry',         stylers: [{ color: '#ffffff' }] },
          { featureType: 'road.arterial',  elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
          { featureType: 'road.highway',   elementType: 'geometry',         stylers: [{ color: '#dadada' }] },
          { featureType: 'road.highway',   elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
          { featureType: 'landscape',      elementType: 'geometry',         stylers: [{ color: '#f5f5f5' }] },
          { featureType: 'water',          elementType: 'geometry',         stylers: [{ color: '#c9d8e8' }] },
          { featureType: 'water',          elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
        ],
      });
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }

    const map = mapInstance.current;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) polylineRef.current.setMap(null);

    const bounds = new window.google.maps.LatLngBounds();

    const dedupedStops = [];
    const seenNames = new Set();
    (busData.stops || []).forEach(s => {
      if (!seenNames.has(s.name)) {
        seenNames.add(s.name);
        dedupedStops.push(s);
      }
    });

    let finalDisplayStops = dedupedStops;
    if (searchContext?.from && searchContext?.to) {
      const fromIdx = dedupedStops.findIndex(s => s.name.toLowerCase() === searchContext.from.name.toLowerCase());
      const toIdx = dedupedStops.findIndex(s => s.name.toLowerCase() === searchContext.to.name.toLowerCase());
      if (fromIdx !== -1 && toIdx !== -1) {
        const start = Math.min(fromIdx, toIdx);
        const end = Math.max(fromIdx, toIdx);
        finalDisplayStops = dedupedStops.slice(start, end + 1);
      }
    }

    if (finalDisplayStops.length > 1) {
      finalDisplayStops.forEach(s => bounds.extend({ lat: s.latitude, lng: s.longitude }));
      const straightPath = finalDisplayStops.map(s => ({ lat: s.latitude, lng: s.longitude }));
      polylineRef.current = new window.google.maps.Polyline({
        path: straightPath, strokeColor: '#15a8cd', strokeOpacity: 0.5, strokeWeight: 3, map,
      });
      fetchRoadRoute(busData.route_id).then(roadPath => {
        if (!roadPath) return;
        // If we have search context, we should ideally clip the road path too, 
        // but for now, showing the full road path is okay if we fit bounds to the segment.
        // Or better, if we have search context, we can try to find the segment of the road path.
        if (polylineRef.current) polylineRef.current.setMap(null);
        polylineRef.current = new window.google.maps.Polyline({
          path: roadPath, strokeColor: '#15a8cd', strokeOpacity: 0.9, strokeWeight: 5, map,
        });
      });
    }

    finalDisplayStops.forEach((stop, i) => {
      const pos = { lat: stop.latitude, lng: stop.longitude };
      bounds.extend(pos);
      const icon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
            <circle cx="14" cy="14" r="13" fill="#036ea7" stroke="white" stroke-width="2"/>
            <text x="14" y="19" font-size="11" font-weight="bold" text-anchor="middle" fill="white">${i + 1}</text>
          </svg>`
        )}`,
        scaledSize: new window.google.maps.Size(28, 28),
        anchor: new window.google.maps.Point(14, 14),
      };
      const marker = new window.google.maps.Marker({ position: pos, map, icon, title: stop.name });
      marker.addListener('click', () => {
        const eta = busData.eta?.find(e => e.stop_id === stop.id);
        const etaText = eta ? (eta.eta_minutes <= 2 ? '🟢 Arriving now' : `⏱ ETA: ${eta.eta_minutes} min`) : '';
        infoWindowRef.current.setContent(
          `<div style="padding:8px;min-width:150px;">
            <strong style="color:#1a1a2e">${stop.name}</strong>
            ${etaText ? `<p style="color:#15a8cd;font-size:13px;margin-top:4px">${etaText}</p>` : ''}
          </div>`
        );
        infoWindowRef.current.open(map, marker);
      });
      markersRef.current.push(marker);
    });

    // Draw other active buses on THE SAME ROUTE in blue
    activeBuses
      .filter(ab => ab.bus_id !== busId && ab.route_id === busData.route_id)
      .forEach(ab => {
        if (!ab.latitude || !ab.longitude) return;
        const abPos = { lat: ab.latitude, lng: ab.longitude };
        bounds.extend(abPos);
        const blueIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="17" fill="#036ea7" stroke="white" stroke-width="2"/>
              <text x="18" y="24" font-size="18" text-anchor="middle">🚌</text>
            </svg>`
          )}`,
          scaledSize: new window.google.maps.Size(36, 36),
          anchor: new window.google.maps.Point(18, 18),
        };
        const abMarker = new window.google.maps.Marker({
          position: abPos, map, icon: blueIcon,
          title: `${ab.bus_name} (${ab.bus_number})`, zIndex: 100
        });
        abMarker.addListener('click', () => {
          infoWindowRef.current.setContent(
            `<div style="padding:8px;min-width:150px;">
              <strong style="color:#036ea7">${ab.bus_name}</strong>
              <p style="color:#555;font-size:13px">${ab.route_name}</p>
              <p style="color:#15a8cd;font-size:12px">Speed: ${ab.speed || 0} km/h</p>
            </div>`
          );
          infoWindowRef.current.open(map, abMarker);
        });
        markersRef.current.push(abMarker);
      });

    if (busData.position) {
      const busPos = { lat: busData.position.latitude, lng: busData.position.longitude };
      bounds.extend(busPos);
      const busIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="21" fill="#16a34a" stroke="white" stroke-width="2"/>
            <text x="22" y="29" font-size="22" text-anchor="middle">🚌</text>
          </svg>`
        )}`,
        scaledSize: new window.google.maps.Size(44, 44),
        anchor: new window.google.maps.Point(22, 22),
      };
      const busMarker = new window.google.maps.Marker({ position: busPos, map, icon: busIcon, title: busData.bus_name, zIndex: 999 });
      busMarker.addListener('click', () => {
        infoWindowRef.current.setContent(
          `<div style="padding:8px;min-width:160px;">
            <strong style="color:#1a1a2e">${busData.bus_name}</strong>
            <p style="color:#555;font-size:13px">${busData.bus_number}</p>
            <p style="color:#15a8cd;font-size:13px">Speed: ${busData.position.speed || 0} km/h</p>
          </div>`
        );
        infoWindowRef.current.open(map, busMarker);
      });
      markersRef.current.push(busMarker);
    }

    if (userLocation) {
      const uPos = { lat: userLocation.latitude, lng: userLocation.longitude };
      bounds.extend(uPos);
      const userIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="15" fill="#22c55e" stroke="white" stroke-width="2"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>`
        )}`,
        scaledSize: new window.google.maps.Size(32, 32),
        anchor: new window.google.maps.Point(16, 16),
      };
      markersRef.current.push(new window.google.maps.Marker({ position: uPos, map, icon: userIcon, title: 'You' }));
    }

    if (!bounds.isEmpty()) map.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded, busData, userLocation]);

  // ── Crowdsourcing helpers ─────────────────────────────────────────────────
  const reportOnBus = async () => {
    // If already sharing — STOP sharing
    if (onBusReported) {
      clearInterval(locationIntervalRef.current);
      setOnBusReported(false);
      setCrowdFeedback('📍 Location sharing stopped.');
      setTimeout(() => setCrowdFeedback(''), 3000);
      return;
    }

    // Start sharing
    if (!navigator.geolocation) { setCrowdFeedback('Location not available'); return; }
    setCrowdLoading(true);

    const shareLocation = () => {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          await fetch(`${API_BASE}/crowd/report`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bus_id: busId, report_type: 'location',
              latitude: pos.coords.latitude, longitude: pos.coords.longitude,
              reported_by: 'passenger',
            }),
          });
          fetchData();
        } catch { }
      });
    };

    // Share immediately then every 30 seconds
    shareLocation();
    locationIntervalRef.current = setInterval(shareLocation, 30000);
    setOnBusReported(true);
    setCrowdFeedback('✅ Sharing your location every 30 sec.');
    setTimeout(() => setCrowdFeedback(''), 4000);
    setCrowdLoading(false);
  };

  const reportStatus = async (reportType) => {
    try {
      await fetch(`${API_BASE}/crowd/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bus_id: busId, report_type: reportType, reported_by: 'passenger' }),
      });
      setCrowdFeedback(`✅ Reported: ${reportType.replace('_', ' ')}`);
      fetchData();
      setTimeout(() => setCrowdFeedback(''), 4000);
    } catch { setCrowdFeedback('Failed to report. Try again.'); }
  };

  const sourceInfo = () => {
    if (!crowdStatus) return { label: '🕐 Schedule only', color: '#888' };
    if (crowdStatus.source === 'driver') return { label: '🚌 Driver Live', color: '#22c55e' };
    if (crowdStatus.source === 'crowd') return { label: '👥 Crowdsourced', color: '#f59e0b' };
    return { label: '🕐 Schedule only', color: '#888' };
  };

  const getNextDeparture = () => {
    if (!schedules.length) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const next = schedules.find(s => {
      const [h, m] = s.departure.split(':').map(Number);
      return h * 60 + m > nowMin;
    });
    return next ? next.departure : schedules[0]?.departure + ' (tomorrow)';
  };

  if (loading) return (
    <div className="app-container">
      <header className="header"><button className="back-btn" onClick={onBack}><BackIcon /> Back</button></header>
      <div className="loading"><div className="spinner"></div></div>
    </div>
  );

  if (!busData) return (
    <div className="app-container">
      <header className="header"><button className="back-btn" onClick={onBack}><BackIcon /> Back</button></header>
      <div className="empty-state">
        <div className="empty-state-icon"><BusIcon /></div>
        <p className="empty-state-text">Bus not found</p>
      </div>
    </div>
  );

  const srcInfo = sourceInfo();
  const nextDep = getNextDeparture();

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header className="header" style={{ background: '#0070bb' }}>
        <button className="back-btn" onClick={onBack} style={{ width: 'auto', margin: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span style={{ marginLeft: 4 }}>Back</span>
        </button>
        <div style={{ flex: 1, textAlign: 'center', color: 'white', fontWeight: 700, fontSize: 18 }}>
          {busData.bus_name}
        </div>
        <div style={{ width: 60 }} />
      </header>

      {/* Map at Top */}
      <div
        style={{
          height: isMapFullscreen ? '100vh' : 220,
          position: isMapFullscreen ? 'fixed' : 'relative',
          inset: isMapFullscreen ? 0 : undefined,
          zIndex: isMapFullscreen ? 999 : 1,
          background: '#e5e3df',
          transition: 'height 0.3s ease'
        }}
        onClick={() => setIsMapFullscreen(!isMapFullscreen)}
      >
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {!isMapFullscreen && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12, background: 'rgba(255,255,255,0.9)',
            color: '#666', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)', cursor: 'pointer'
          }}>
            tap map to expand
          </div>
        )}
      </div>

      {/* Info Strip */}
      <div className="info-strip">
        <div className="info-col">
          <span className="info-val">{busData.position?.speed || 0} km/h</span>
          <span className="info-label">Speed</span>
        </div>
        <div className="info-col">
          <span className="info-val" style={{ fontSize: 14 }}>{busData.eta?.find(e => e.status === 'current')?.stop_name || 'CMC Stop'}</span>
          <span className="info-label">Next stop</span>
        </div>
        <div className="info-col">
          <span className="info-val">{busData.eta?.find(e => e.status === 'current')?.eta_minutes || 3} min</span>
          <span className="info-label">ETA</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tracking-tabs" style={{ background: '#1a1a1a', padding: '0 4px' }}>
        <button className={`tracking-tab ${activeTab === 'eta' ? 'active' : ''}`} onClick={() => setActiveTab('eta')} style={{ color: activeTab === 'eta' ? '#15a8cd' : '#666', borderBottom: activeTab === 'eta' ? '2px solid #15a8cd' : 'none' }}>ETA & Stops</button>
        <button className={`tracking-tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')} style={{ color: activeTab === 'schedule' ? '#15a8cd' : '#666', borderBottom: activeTab === 'schedule' ? '2px solid #15a8cd' : 'none' }}>Schedule</button>
      </div>

      {activeTab === 'eta' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {busData.eta?.map((eta, i) => {
            const isPassed = eta.status === 'passed';
            const isCurrent = eta.status === 'current';
            const isFirst = i === 0;
            const isLast = i === busData.eta.length - 1;

            return (
              <div key={i} style={{
                background: isCurrent ? 'white' : 'transparent',
                borderRadius: 12, padding: '12px 16px', marginBottom: 4,
                display: 'flex', alignItems: 'center', gap: 16,
                boxShadow: isCurrent ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                opacity: isPassed ? 0.6 : 1
              }}>
                {/* Timeline bar column */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, alignSelf: 'stretch' }}>
                  <div style={{ width: 2, flex: 1, background: isPassed ? '#15a8cd' : '#cbd5e1', visibility: isFirst ? 'hidden' : 'visible' }} />
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', border: `3px solid ${isPassed || isCurrent ? '#15a8cd' : '#cbd5e1'}`,
                    background: isPassed ? '#15a8cd' : 'white', flexShrink: 0
                  }} />
                  <div style={{ width: 2, flex: 1, background: isPassed || isCurrent ? '#15a8cd' : '#cbd5e1', visibility: isLast ? 'hidden' : 'visible' }} />
                </div>

                <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#000' : '#666' }}>{eta.stop_name}</span>
                    {isCurrent && <span style={{ background: '#0070bb', color: 'white', fontSize: 10, fontWeight: 900, padding: '3px 8px', borderRadius: 20 }}>BUS HERE</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {isPassed ? (
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>Passed</span>
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 700, color: isCurrent ? '#22c55e' : '#15a8cd' }}>
                        {isCurrent ? 'Arriving' : `${eta.eta_minutes} min`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>+ {Math.max(0, busData.stops?.length - (busData.eta?.length || 0))} more stops</div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>Departures from {busData.start_point}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {schedules.map((s, i) => {
              const now = new Date();
              const [h, m] = s.departure.split(':').map(Number);
              const isNext = h * 60 + m > (now.getHours() * 60 + now.getMinutes());
              // For simplicity, just pick one as "Next" if it's the first one in the future
              const isFirstNext = isNext && !schedules.slice(0, i).some(prev => {
                const [ph, pm] = prev.departure.split(':').map(Number);
                return ph * 60 + pm > (now.getHours() * 60 + now.getMinutes());
              });

              return (
                <div key={i} style={{
                  background: isFirstNext ? '#1a1a1a' : '#f1f5f9',
                  color: isFirstNext ? 'white' : '#1a1a1a',
                  padding: '12px 0', borderRadius: 12, textAlign: 'center',
                  fontSize: 15, fontWeight: 600, position: 'relative',
                  border: isFirstNext ? 'none' : '1px solid #e2e8f0'
                }}>
                  {s.departure}
                  {isFirstNext && (
                    <span style={{
                      position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                      background: '#15a8cd', color: 'white', fontSize: 9, fontWeight: 900,
                      padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase'
                    }}>Next</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DRIVER DASHBOARD ─────────────────────────────────────────────────────────
function DriverDashboard({ user, onBack, onProfileClick, onLogout }) {
  const mapsLoaded = useGoogleMaps();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const locationWatch = useRef(null);
  const infoWindowRef = useRef(null);

  const [allBuses, setAllBuses] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [filteredBuses, setFilteredBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [tripActive, setTripActive] = useState(false);
  const [driverLoc, setDriverLoc] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [routeStops, setRouteStops] = useState([]);
  const [nextStop, setNextStop] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const prevLocRef = useRef(null);
  const prevTimeRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [bRes, rRes] = await Promise.all([fetch(`${API_BASE}/buses`), fetch(`${API_BASE}/routes`)]);
        setAllBuses(await bRes.json());
        setAllRoutes(await rRes.json());
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (!selectedRoute) { setFilteredBuses([]); setSelectedBus(null); return; }
    const buses = allBuses.filter(b => b.route_id === selectedRoute.id);
    setFilteredBuses(buses);
    setSelectedBus(null);   // reset bus when route changes
  }, [selectedRoute, allBuses]);

  useEffect(() => {
    if (!selectedBus) return;
    fetch(`${API_BASE}/schedules/bus/${selectedBus.bus_id}`).then(r => r.json()).then(setSchedules).catch(() => { });
  }, [selectedBus]);

  useEffect(() => {
    if (!selectedRoute) return;
    fetch(`${API_BASE}/routes/${selectedRoute.id}/stops`).then(r => r.json()).then(setRouteStops).catch(() => { });
  }, [selectedRoute]);

  const calcSpeed = (loc) => {
    if (prevLocRef.current && prevTimeRef.current) {
      const dt = (Date.now() - prevTimeRef.current) / 1000;
      const R = 6371000;
      const dLat = (loc.latitude - prevLocRef.current.latitude) * Math.PI / 180;
      const dLon = (loc.longitude - prevLocRef.current.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(prevLocRef.current.latitude * Math.PI / 180) * Math.cos(loc.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const kmh = (dist / dt) * 3.6;
      setSpeed(Math.round(kmh > 120 ? 0 : kmh));
    }
    prevLocRef.current = loc;
    prevTimeRef.current = Date.now();
  };

  const findNextStop = (loc) => {
    if (!Array.isArray(routeStops) || !routeStops.length) return;
    let nearest = null, minDist = Infinity;
    routeStops.forEach(stop => {
      const d = Math.sqrt((stop.latitude - loc.latitude) ** 2 + (stop.longitude - loc.longitude) ** 2);
      if (d < minDist) { minDist = d; nearest = stop; }
    });
    setNextStop(nearest);
  };

  const startTrip = () => {
    if (!selectedBus || !selectedRoute) return;
    setTripActive(true);
    locationWatch.current = navigator.geolocation.watchPosition(
      pos => {
        const loc = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setDriverLoc(loc);
        calcSpeed(loc);
        findNextStop(loc);
        fetch(`${API_BASE}/update_position`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('navbus_token')}`
          },
          body: JSON.stringify({ bus_id: selectedBus.bus_id, latitude: loc.latitude, longitude: loc.longitude, speed }),
        }).catch(() => { });
      },
      () => { },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  };

  const endTrip = () => {
    setTripActive(false);
    if (locationWatch.current) navigator.geolocation.clearWatch(locationWatch.current);
    setDriverLoc(null); setSpeed(0); setNextStop(null);
  };

  useEffect(() => {
    if (!mapsLoaded || !mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 12.92, lng: 79.13 }, zoom: 14,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        styles: [
          { featureType: 'poi',            elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'transit.station',elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'transit.line',   elementType: 'all',    stylers: [{ visibility: 'off' }] },
          { featureType: 'road',           elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
          { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#444444' }] },
          { featureType: 'road',           elementType: 'geometry',         stylers: [{ color: '#ffffff' }] },
          { featureType: 'road.arterial',  elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
          { featureType: 'road.highway',   elementType: 'geometry',         stylers: [{ color: '#dadada' }] },
          { featureType: 'road.highway',   elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
          { featureType: 'landscape',      elementType: 'geometry',         stylers: [{ color: '#f5f5f5' }] },
          { featureType: 'water',          elementType: 'geometry',         stylers: [{ color: '#c9d8e8' }] },
          { featureType: 'water',          elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
        ],
      });
      infoWindowRef.current = new window.google.maps.InfoWindow();
    }
    const map = mapInstance.current;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) polylineRef.current.setMap(null);

    const bounds = new window.google.maps.LatLngBounds();

    const dedupedStops = [];
    const seenNames = new Set();
    (Array.isArray(routeStops) ? routeStops : []).forEach(s => {
      if (!seenNames.has(s.name)) {
        seenNames.add(s.name);
        dedupedStops.push(s);
      }
    });

    if (dedupedStops.length > 0) {
      dedupedStops.forEach(s => bounds.extend({ lat: s.latitude, lng: s.longitude }));
      if (dedupedStops.length > 1) {
        const straightPath = dedupedStops.map(s => ({ lat: s.latitude, lng: s.longitude }));
        polylineRef.current = new window.google.maps.Polyline({
          path: straightPath, strokeColor: '#15a8cd', strokeOpacity: 0.4, strokeWeight: 3, map,
        });
        fetchRoadRoute(selectedRoute?.id).then(roadPath => {
          if (!roadPath) return;
          if (polylineRef.current) polylineRef.current.setMap(null);
          polylineRef.current = new window.google.maps.Polyline({
            path: roadPath, strokeColor: '#15a8cd', strokeOpacity: 0.9, strokeWeight: 5, map,
          });
        });
      }
      dedupedStops.forEach((stop, i) => {
        const pos = { lat: stop.latitude, lng: stop.longitude };
        const icon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
              <circle cx="13" cy="13" r="12" fill="${nextStop?.id === stop.id ? '#f59e0b' : '#036ea7'}" stroke="white" stroke-width="2"/>
              <text x="13" y="18" font-size="10" font-weight="bold" text-anchor="middle" fill="white">${i + 1}</text>
            </svg>`
          )}`,
          scaledSize: new window.google.maps.Size(26, 26),
          anchor: new window.google.maps.Point(13, 13),
        };
        const marker = new window.google.maps.Marker({ position: pos, map, icon, title: stop.name });
        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`<div style="padding:8px"><strong>${stop.name}</strong></div>`);
          infoWindowRef.current.open(map, marker);
        });
        markersRef.current.push(marker);
      });
    }

    if (driverLoc) {
      const dPos = { lat: driverLoc.latitude, lng: driverLoc.longitude };
      bounds.extend(dPos);
      const dIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="23" fill="#15a8cd" stroke="white" stroke-width="2"/>
            <text x="24" y="31" font-size="24" text-anchor="middle">🚌</text>
          </svg>`
        )}`,
        scaledSize: new window.google.maps.Size(48, 48),
        anchor: new window.google.maps.Point(24, 24),
      };
      markersRef.current.push(new window.google.maps.Marker({ position: dPos, map, icon: dIcon, title: 'You', zIndex: 999 }));
      map.panTo(dPos);
    }

    if (!bounds.isEmpty()) map.fitBounds(bounds, { top: 60, right: 20, bottom: 20, left: 20 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsLoaded, routeStops, driverLoc, nextStop]);

  const getNextDeparture = () => {
    if (!schedules.length) return null;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const next = schedules.find(s => {
      const [h, m] = s.departure.split(':').map(Number);
      return h * 60 + m > nowMin;
    });
    return next?.departure || null;
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header className="header">
        <div className="header-left">
          <div className="header-logo"><NavBusLogo /></div>
          <div className="header-title-group">
            <h1 className="header-title">Driver Mode</h1>
          </div>
        </div>
        <div className="header-right" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button 
            className="header-logout-btn" 
            onClick={onLogout}
            style={{ 
              background: 'rgba(255,255,255,0.2)', width: 'auto', padding: '6px 14px', 
              fontSize: 12, marginTop: 0, borderRadius: 20, fontWeight: 700,
              border: '1px solid rgba(255,255,255,0.3)', color: 'white'
            }}
          >
            Sign Out
          </button>
          <div className="profile-icon" onClick={onProfileClick}><ProfileIcon /></div>
        </div>
      </header>

      {!tripActive && (
        <div className="driver-selector-card">
          <p className="driver-selector-title">Select Your Bus & Route</p>

          {/* Step 1 — Pick Route first */}
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Step 1 — Choose Route
            </label>
            <select
              value={selectedRoute?.id || ''}
              onChange={e => {
                const route = allRoutes.find(r => r.id === parseInt(e.target.value));
                setSelectedRoute(route || null);
              }}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #e5e5e5', fontSize: 14, color: '#1a1a2e', background: '#f9f9f9', marginBottom: 14 }}
            >
              <option value="">-- Choose Route --</option>
              {allRoutes.map(r => (
                <option key={r.id} value={r.id}>{r.route_name}</option>
              ))}
            </select>
          </div>

          {/* Step 2 — Pick Bus (only shows after route selected) */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: selectedRoute ? '#94a3b8' : '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
              Step 2 — Choose Your Bus
              {!selectedRoute && <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 6 }}>(select route first)</span>}
            </label>
            <select
              value={selectedBus?.bus_id || ''}
              disabled={!selectedRoute}
              onChange={e => {
                const bus = filteredBuses.find(b => b.bus_id === e.target.value);
                setSelectedBus(bus || null);
              }}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, fontSize: 14,
                border: `1.5px solid ${selectedRoute ? '#e5e5e5' : '#f0f0f0'}`,
                color: selectedRoute ? '#1a1a2e' : '#aaa',
                background: selectedRoute ? '#f9f9f9' : '#f5f5f5',
                marginBottom: 4,
              }}
            >
              <option value="">-- Choose Bus --</option>
              {filteredBuses.map(b => (
                <option key={b.bus_id} value={b.bus_id}>
                  {b.bus_name} ({b.bus_number})
                </option>
              ))}
            </select>
            {selectedRoute && filteredBuses.length === 0 && (
              <p style={{ fontSize: 12, color: '#f59e0b', margin: '4px 0 0' }}>
                ⚠️ No buses found for this route
              </p>
            )}
            {selectedRoute && filteredBuses.length > 0 && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0' }}>
                {filteredBuses.length} bus{filteredBuses.length > 1 ? 'es' : ''} available on this route
              </p>
            )}
          </div>

          <button
            className="trip-search-btn"
            onClick={startTrip}
            disabled={!selectedBus || !selectedRoute}
          >
            🚦 Start Trip
          </button>
        </div>
      )}

      {tripActive && (
        <div className="driver-trip-bar">
          <div className="driver-trip-info">
            <div className="driver-trip-bus">
              <span className="driver-bus-badge">🚌 {selectedBus?.bus_number}</span>
              <span className="driver-route-name">{selectedRoute?.route_name}</span>
            </div>
            <div className="driver-trip-stats">
              <div className="driver-stat"><span className="driver-stat-label">Speed</span><span className="driver-stat-value">{speed} km/h</span></div>
              <div className="driver-stat"><span className="driver-stat-label">Next Stop</span><span className="driver-stat-value">{nextStop?.name || '—'}</span></div>
              <div className="driver-stat"><span className="driver-stat-label">Next Dep</span><span className="driver-stat-value">{getNextDeparture() || '—'}</span></div>
            </div>
          </div>
          <button className="driver-end-btn" onClick={endTrip}>⏹ End Trip</button>
        </div>
      )}

      <div style={{ flex: 1, minHeight: 300, position: 'relative' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {!mapsLoaded && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e5e3df' }}>
            <div className="spinner" />
          </div>
        )}
        {!driverLoc && tripActive && (
          <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 14px', borderRadius: 20, fontSize: 13 }}>
            📡 Getting your location…
          </div>
        )}
      </div>

      <div className="tracking-tabs">
        <button className={`tracking-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Info</button>
        <button className={`tracking-tab ${activeTab === 'stops' ? 'active' : ''}`} onClick={() => setActiveTab('stops')}>Stops</button>
        <button className={`tracking-tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>Schedule</button>
      </div>

      {activeTab === 'info' && (
        <div className="eta-panel">
          {selectedBus ? (
            <div style={{ padding: '4px 0' }}>
              <div className="driver-info-row"><span className="driver-info-label">Bus Name</span><span className="driver-info-value">{selectedBus.bus_name}</span></div>
              <div className="driver-info-row"><span className="driver-info-label">Bus Number</span><span className="driver-info-value">{selectedBus.bus_number}</span></div>
              <div className="driver-info-row"><span className="driver-info-label">Route</span><span className="driver-info-value">{selectedRoute?.route_name || '—'}</span></div>
              <div className="driver-info-row"><span className="driver-info-label">From</span><span className="driver-info-value">{selectedRoute?.start_point || '—'}</span></div>
              <div className="driver-info-row"><span className="driver-info-label">To</span><span className="driver-info-value">{selectedRoute?.end_point || '—'}</span></div>
              <div className="driver-info-row"><span className="driver-info-label">First Dep</span><span className="driver-info-value">{selectedBus.start_time}</span></div>
              <div className="driver-info-row"><span className="driver-info-label">Last Dep</span><span className="driver-info-value">{selectedBus.end_time}</span></div>
              <div className="driver-info-row">
                <span className="driver-info-label">Status</span>
                <span style={{ color: tripActive ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>{tripActive ? '🟢 On Trip' : '🟡 Idle'}</span>
              </div>
            </div>
          ) : <p style={{ textAlign: 'center', color: '#888', padding: 20 }}>Select a bus to see details</p>}
        </div>
      )}

      {activeTab === 'stops' && (
        <div style={{ padding: '12px 16px', overflowY: 'auto' }}>
          {routeStops.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#888', padding: 20 }}>Select a route to see stops</p>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                {routeStops.length} stops · {selectedRoute?.start_point} → {selectedRoute?.end_point}
              </p>
              <StopTimeline
                stops={routeStops}
                activeStopId={nextStop?.id}
                getRight={(stop, i) => (
                  <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Stop {i + 1}</span>
                )}
              />
            </>
          )}
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="eta-panel">
          {schedules.length > 0 ? (
            <>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>Departures from <strong>{selectedRoute?.start_point}</strong></p>
              <div className="schedule-grid">
                {Array.from(new Set(schedules.map(s => s.departure))).map((departureTime, i) => {
                  const now = new Date();
                  const nowMin = now.getHours() * 60 + now.getMinutes();
                  const [h, m] = departureTime.split(':').map(Number);
                  const isPast = h * 60 + m < nowMin;
                  const isNext = getNextDeparture() === departureTime;
                  // Find the original schedule object for labels if needed
                  const s = schedules.find(sched => sched.departure === departureTime);
                  const timeLabel = s?.arrival && s?.arrival !== s?.departure ? `${s.arrival} → ${s.departure}` : departureTime;
                  return (
                    <div key={i} className={`schedule-chip ${isPast ? 'past' : ''} ${isNext ? 'next' : ''}`}>
                      {timeLabel}
                      {isNext && <span className="next-label">Next</span>}
                    </div>
                  );
                })}
              </div>
            </>
          ) : <p style={{ textAlign: 'center', color: '#888', padding: 20 }}>Select a bus to see schedule</p>}
        </div>
      )}
    </div>
  );
}

// ─── NEARBY BUSES ─────────────────────────────────────────────────────────────
function NearbyBusesScreen({ onBack, onBusSelect }) {
  const [nearbyBuses, setNearbyBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNearby = () => {
    setLoading(true);
    if (!navigator.geolocation) { setError('Geolocation not supported'); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const res = await fetch(`${API_BASE}/nearby?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&radius=5`);
          setNearbyBuses(await res.json()); setError(null);
        } catch { setError('Failed to fetch nearby buses'); }
        finally { setLoading(false); }
      },
      () => { setError('Unable to get your location.'); setLoading(false); }
    );
  };

  useEffect(() => { fetchNearby(); }, []);

  return (
    <div className="app-container">
      <header className="header">
        <button className="back-btn" onClick={onBack}><BackIcon /> Back</button>
        <h1 className="header-title" style={{ fontSize: 18 }}>Nearby Buses</h1>
        <div style={{ width: 60 }} />
      </header>
      <div className="nearby-section">
        {loading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-icon"><LocationIcon /></div>
            <p className="empty-state-text">{error}</p>
            <button className="near-me-btn" onClick={fetchNearby} style={{ marginTop: 16 }}>Try Again</button>
          </div>
        ) : !Array.isArray(nearbyBuses) || nearbyBuses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><BusIcon /></div>
            <p className="empty-state-text">No buses found nearby</p>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: 16, color: '#6b7280' }}>Found {nearbyBuses.length} bus(es) within 5 km</p>
            {nearbyBuses.map((bus, i) => (
              <div key={i} className="nearby-bus-card" onClick={() => onBusSelect(bus.bus_id, bus.route_id)}>
                <div className="nearby-bus-header">
                  <span className="nearby-bus-name">{bus.bus_name}</span>
                  <span className="nearby-distance">{bus.distance} km away</span>
                </div>
                <div className="nearby-route">{bus.bus_number} • {bus.route_name}</div>
                {bus.current_stop_name && <div style={{ fontSize: 13, color: '#6b7280' }}>Currently at: {bus.current_stop_name}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────
function App() {
  const getSavedUser = () => {
    try {
      return JSON.parse(localStorage.getItem('navbus_user') || 'null');
    } catch {
      return null;
    }
  };

  const savedUser = getSavedUser();

  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(!!savedUser);
  const [showRegister, setShowRegister] = useState(false);
  const [locationGranted, setLocationGranted] = useState(
    () => localStorage.getItem('navbus_loc_granted') === 'true'
  );
  const [userLocation, setUserLocation] = useState(null);
  const [cityName, setCityName] = useState('');
  const [user, setUser] = useState(savedUser);
  const [screen, setScreen] = useState('home');
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [theme, setTheme] = useState('light');
  const [recentSearches, setRecentSearches] = useState([]);
  const [searchContext, setSearchContext] = useState(null);
  const [allStops, setAllStops] = useState([]);

  const goHome = useCallback(() => { setScreen('home'); setSelectedRouteId(null); setSelectedBusId(null); setSearchContext(null); }, []);

  // ── SERVER KEEP-ALIVE ──────────────────────────────────────
  useEffect(() => {
    const ping = () => fetch(`${API_BASE}/`).catch(() => {});
    const iv = setInterval(ping, 5 * 60 * 1000); // every 5 mins
    ping();
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/stops/unique`)
      .then(r => r.json())
      .then(data => setAllStops(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!CapacitorApp || !CapacitorApp.addListener) return;
    
    let handleBackButton;
    try {
      handleBackButton = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (screen === 'home') {
          CapacitorApp.exitApp();
        } else {
          goHome();
        }
      });
    } catch (e) {
      console.warn("Capacitor backButton listener failed:", e);
    }

    return () => {
      if (handleBackButton) {
        handleBackButton.then(h => h && h.remove && h.remove()).catch(() => {});
      }
    };
  }, [screen, goHome]);

  useEffect(() => {
    (async () => {
      try {
        const [rRes, bRes] = await Promise.all([fetch(`${API_BASE}/routes`), fetch(`${API_BASE}/buses`)]);
        const rData = await rRes.json();
        const bData = await bRes.json();
        setRoutes(Array.isArray(rData) ? rData : []);
        setBuses(Array.isArray(bData) ? bData : []);
      } catch { }
    })();
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${userLocation.latitude}&lon=${userLocation.longitude}&format=json`)
      .then(r => r.json())
      .then(d => {
        const city = d.address?.city || d.address?.town || d.address?.village || d.address?.county || '';
        setCityName(city);
      }).catch(() => { });
  }, [userLocation]);

  useEffect(() => { document.body.setAttribute('data-theme', theme); }, [theme]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('navbus_user');
    localStorage.removeItem('navbus_token');
    setShowProfile(false);
    setScreen('home');
    setRecentSearches([]);
    // Keep location grant so user isn't prompted again on same device
  };

  const handleSaveSearch = (query) => {
    setRecentSearches(prev => [query, ...prev.filter(s => s !== query)].slice(0, 10));
  };

  // Fallback to clear splash even if onComplete is not called
  useEffect(() => {
    if (!showSplash) return;
    const timer = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(timer);
  }, [showSplash]);

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;

  if (showRegister) return (
    <RegisterScreen
      onLoginClick={() => setShowRegister(false)}
      onRegister={(u) => {
        setUser(u);
        setIsLoggedIn(true);
        setShowRegister(false);
        localStorage.setItem('navbus_user', JSON.stringify(u));
        if (u.token) localStorage.setItem('navbus_token', u.token);
      }}
    />
  );

  if (!isLoggedIn) return (
    <LoginScreen
      onLogin={(u) => {
        setUser(u);
        setIsLoggedIn(true);
        localStorage.setItem('navbus_user', JSON.stringify(u));
        localStorage.setItem('navbus_token', u.token);
      }}
      onRegisterClick={() => setShowRegister(true)}
    />
  );

  if (!locationGranted) return (
    <LocationPermissionScreen
      onGranted={loc => { setUserLocation(loc); setLocationGranted(true); localStorage.setItem('navbus_loc_granted', 'true'); }}
      onDenied={() => { setLocationGranted(true); localStorage.setItem('navbus_loc_granted', 'true'); }}
    />
  );


  const drawer = showProfile && (
    <ProfileDrawer
      user={user} recentSearches={recentSearches} theme={theme}
      onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
      onLogout={handleLogout}
      onClose={() => setShowProfile(false)}
    />
  );

  if (user?.role === 'driver') {
    return <><DriverDashboard user={user} onBack={goHome} onProfileClick={() => setShowProfile(true)} onLogout={handleLogout} />{drawer}</>;
  }

  switch (screen) {
    case 'routeDetail':
      return <><RouteDetailScreen routeId={selectedRouteId} onBack={goHome} allRoutes={routes} allBuses={buses} onBusSelect={(busId, routeId) => { setSelectedBusId(busId); if (routeId) setSelectedRouteId(routeId); setScreen('tracking'); }} />{drawer}</>;
    case 'tracking':
      return <><BusTrackingScreen busId={selectedBusId} onBack={goHome} userLocation={userLocation} selectedRouteId={selectedRouteId} searchContext={searchContext} />{drawer}</>;
    case 'nearby':
      return <><NearbyBusesScreen onBack={goHome} onBusSelect={id => { setSelectedBusId(id); setScreen('tracking'); }} />{drawer}</>;
    default:
      return (
        <>
          <HomeScreen
            routes={routes} buses={buses} user={user} cityName={cityName} userLocation={userLocation} allStops={allStops}
            onRouteSelect={id => { setSelectedRouteId(id); setScreen('routeDetail'); }}
            onBusSelect={(busId, routeId, from, to) => {
              setSelectedBusId(busId);
              if (routeId) setSelectedRouteId(routeId);
              setSearchContext(from && to ? { from, to } : null);
              setScreen('tracking');
            }}
            onNearMe={() => setScreen('nearby')}
            onProfileClick={() => setShowProfile(true)}
            onSaveSearch={handleSaveSearch}
            onLogout={handleLogout}
          />
          {drawer}
        </>
      );
  }
}

export default App;