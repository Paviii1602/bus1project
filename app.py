from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
from werkzeug.security import generate_password_hash,check_password_hash
from flask_cors import CORS
from flask_jwt_extended import (JWTManager, create_access_token, jwt_required, get_jwt_identity )
import sqlite3
import math
import os
import time as _time

app = Flask(__name__)
# Load secret key from environment variable for security
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'navbus-default-secret-key')
CORS(app, origins="*", supports_credentials=False)
socketio = SocketIO(app, cors_allowed_origins="*")
jwt = JWTManager(app)

# ─── DB HELPER ───────────────────────────────────────────────────────────────

def get_db_connection():
    db_path = os.getenv('DATABASE_URL', 'database.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# ─── DISTANCE & ETA ──────────────────────────────────────────────────────────

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def calculate_eta(distance_km, speed_kmh=25):
    speed_kmh = speed_kmh if speed_kmh > 0 else 25
    return max(1, round(distance_km / speed_kmh * 60))

# ─── HEALTH CHECK ────────────────────────────────────────────────────────────

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({'status': 'NavBus Server is UP', 'deployed': True})

# ─── AUTH ────────────────────────────────────────────────────────────────────

@app.route('/api/', methods=['GET'])
def api_root():
    return jsonify({
        'message': 'NavBus API',
        'version': '1.0',
        'status': 'running'
    })

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    role     = data.get('role')

    if not username or not password or not role:
        return jsonify({'error': 'Missing fields'}), 400

    conn = get_db_connection()
    try:
        conn.execute(
           "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            (username,generate_password_hash(password), role)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'Username already exists. Please choose a different one.'}), 400
    conn.close()
    return jsonify({'message': 'User registered successfully'})


@app.route('/api/login', methods=['POST'])
def login():
    data     = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    conn = get_db_connection()
    user = conn.execute(
        "SELECT * FROM users WHERE username = ?",
        (username,)
    ).fetchone()
    if user and not check_password_hash(user['password'], password):
        user = None
        conn.close()

    if user:
        token = create_access_token(identity={
            'username': user['username'],
            'role':     user['role']
        })
        return jsonify({'message':  'Login successful',
                        'username': user['username'],
                        'role':     user['role'],
                        'token':    token})    
    return jsonify({'error': 'Invalid credentials'}), 401

# ─── ROUTES ──────────────────────────────────────────────────────────────────

@app.route('/api/routes', methods=['GET'])
def get_routes():
    conn   = get_db_connection()
    routes = conn.execute('SELECT * FROM routes').fetchall()
    conn.close()
    return jsonify([dict(r) for r in routes])


@app.route('/api/routes/<int:route_id>', methods=['GET'])
def get_route(route_id):
    conn  = get_db_connection()
    route = conn.execute('SELECT * FROM routes WHERE id = ?', (route_id,)).fetchone()
    conn.close()
    if route is None:
        return jsonify({'error': 'Route not found'}), 404
    return jsonify(dict(route))


@app.route('/api/routes/<int:route_id>/stops', methods=['GET'])
def get_route_stops(route_id):
    conn  = get_db_connection()
    stops = conn.execute('''SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order''', (route_id,)).fetchall()
    conn.close()
    return jsonify([dict(s) for s in stops])


@app.route('/api/stops/unique', methods=['GET'])
def get_unique_stops():
    conn  = get_db_connection()
    stops = conn.execute('SELECT DISTINCT name FROM stops ORDER BY name').fetchall()
    conn.close()
    return jsonify([s['name'] for s in stops])


@app.route('/api/search_trip', methods=['GET'])
def search_trip():
    from_stop = request.args.get('from', '').lower()
    to_stop   = request.args.get('to', '').lower()
    if not from_stop or not to_stop:
        return jsonify({'buses': [], 'stops': [], 'route_id': None})

    conn = get_db_connection()

    # Find routes that have both stops in the correct order
    query = '''
        SELECT DISTINCT r.id, r.route_name,
               s1.stop_order AS from_order,
               s2.stop_order AS to_order
        FROM routes r
        JOIN stops s1 ON r.id = s1.route_id
        JOIN stops s2 ON r.id = s2.route_id
        WHERE LOWER(s1.name) = ? AND LOWER(s2.name) = ?
        AND s1.stop_order < s2.stop_order
        LIMIT 1
    '''
    route = conn.execute(query, (from_stop, to_stop)).fetchone()

    if not route:
        conn.close()
        return jsonify({'buses': [], 'stops': [], 'route_id': None})

    # Get only the stops BETWEEN from and to (inclusive)
    stops = conn.execute('''
        SELECT id, name, latitude, longitude, stop_order
        FROM stops
        WHERE route_id = ?
          AND stop_order >= ? AND stop_order <= ?
        ORDER BY stop_order
    ''', (route['id'], route['from_order'], route['to_order'])).fetchall()

    # Get all buses assigned to this route
    buses = conn.execute(
        'SELECT bus_id, bus_name, bus_number, route_id, start_time, end_time FROM buses_with_route WHERE route_id = ?',
        (route['id'],)
    ).fetchall()

    # Get active buses (have live position) — mark them
    cutoff = _time.strftime('%Y-%m-%d %H:%M:%S', _time.gmtime(_time.time() - 1800))
    active_ids = set(r['bus_id'] for r in conn.execute(
        'SELECT bus_id FROM bus_positions WHERE timestamp >= ?', (cutoff,)
    ).fetchall())

    # Deduplicate buses (each bus appears for both routes — show once)
    seen = set()
    results = []
    for b in buses:
        if b['bus_id'] in seen:
            continue
        seen.add(b['bus_id'])
        pos = conn.execute(
            'SELECT latitude, longitude, speed FROM bus_positions WHERE bus_id = ? ORDER BY timestamp DESC LIMIT 1',
            (b['bus_id'],)
        ).fetchone()
        results.append({
            'bus_id':     b['bus_id'],
            'bus_name':   b['bus_name'],
            'bus_number': b['bus_number'],
            'route_id':   route['id'],
            'route_name': route['route_name'],
            'start_time': b['start_time'],
            'end_time':   b['end_time'],
            'is_active':  b['bus_id'] in active_ids,
            'latitude':   pos['latitude']  if pos else None,
            'longitude':  pos['longitude'] if pos else None,
            'speed':      pos['speed']     if pos else 0,
        })

    conn.close()
    return jsonify({
        'buses':    results,
        'stops':    [dict(s) for s in stops],
        'route_id': route['id'],
        'route_name': route['route_name'],
        'from_stop': request.args.get('from'),
        'to_stop':   request.args.get('to'),
    })

# ─── ROAD PATH (Google Directions API — server side to avoid CORS) ──────────

GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')


# Cache road paths in memory so we only call Directions API once per route
_road_path_cache = {}

@app.route('/api/routes/<int:route_id>/road_path', methods=['GET'])
def get_road_path(route_id):
    import urllib.request, json as _json, urllib.parse

    # Return cached result if available
    if route_id in _road_path_cache:
        return jsonify({'path': _road_path_cache[route_id]})

    conn  = get_db_connection()
    stops = conn.execute(
        'SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order',
        (route_id,)
    ).fetchall()
    conn.close()
    stops = [dict(s) for s in stops]

    if len(stops) < 2:
        return jsonify({'path': []})

    def decode_polyline(encoded):
        points = []
        index = 0
        lat = lng = 0
        while index < len(encoded):
            for is_lng in (False, True):
                result = shift = 0
                while True:
                    b = ord(encoded[index]) - 63
                    index += 1
                    result |= (b & 0x1F) << shift
                    shift += 5
                    if b < 0x20:
                        break
                val = ~(result >> 1) if result & 1 else result >> 1
                if is_lng:
                    lng += val
                    points.append({'lat': round(lat / 1e5, 6), 'lng': round(lng / 1e5, 6)})
                else:
                    lat += val
        return points

    def fetch_segment(seg_stops):
        """Fetch road path for a segment of max 10 stops (8 waypoints + origin + dest)."""
        origin      = f"{seg_stops[0]['latitude']},{seg_stops[0]['longitude']}"
        destination = f"{seg_stops[-1]['latitude']},{seg_stops[-1]['longitude']}"
        mid = seg_stops[1:-1]
        waypoints = '|'.join(f"{s['latitude']},{s['longitude']}" for s in mid) if mid else ''
        url = (
            f"https://maps.googleapis.com/maps/api/directions/json"
            f"?origin={urllib.parse.quote(origin)}"
            f"&destination={urllib.parse.quote(destination)}"
            f"&mode=driving"
            f"&key={GOOGLE_MAPS_API_KEY}"
        )
        if waypoints:
            url += f"&waypoints={urllib.parse.quote(waypoints)}"
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = _json.loads(resp.read())
            if data.get('status') == 'OK':
                pts = []
                for leg in data['routes'][0]['legs']:
                    for step in leg['steps']:
                        pts.extend(decode_polyline(step['polyline']['points']))
                return pts
        except:
            pass
        # fallback straight line for this segment
        return [{'lat': s['latitude'], 'lng': s['longitude']} for s in seg_stops]

    # Split stops into chunks of 10 (8 waypoints max per request)
    # Each chunk overlaps by 1 stop so segments connect seamlessly
    CHUNK = 10
    full_path = []
    i = 0
    while i < len(stops):
        chunk = stops[i:i + CHUNK]
        seg   = fetch_segment(chunk)
        if full_path and seg:
            seg = seg[1:]   # remove duplicate junction point
        full_path.extend(seg)
        i += CHUNK - 1      # overlap by 1

    _road_path_cache[route_id] = full_path
    return jsonify({'path': full_path})

# ─── BUSES ───────────────────────────────────────────────────────────────────

@app.route('/api/buses', methods=['GET'])
def get_buses():
    conn  = get_db_connection()
    buses = conn.execute('''
        SELECT b.*, r.route_name, r.start_point, r.end_point
        FROM buses_with_route b
        JOIN routes r ON b.route_id = r.id
    ''').fetchall()
    conn.close()
    return jsonify([dict(b) for b in buses])


@app.route('/api/buses/<bus_id>', methods=['GET'])
def get_bus(bus_id):
    conn = get_db_connection()
    bus  = conn.execute('''
        SELECT b.*, r.route_name, r.start_point, r.end_point
        FROM buses_with_route b
        JOIN routes r ON b.route_id = r.id
        WHERE b.bus_id = ?
    ''', (bus_id,)).fetchone()
    conn.close()
    if bus is None:
        return jsonify({'error': 'Bus not found'}), 404
    return jsonify(dict(bus))


@app.route('/api/buses/route/<int:route_id>', methods=['GET'])
def get_buses_by_route(route_id):
    conn  = get_db_connection()
    buses = conn.execute('''
        SELECT b.*, r.route_name, r.start_point, r.end_point
        FROM buses_with_route b
        JOIN routes r ON b.route_id = r.id
        WHERE b.route_id = ?
    ''', (route_id,)).fetchall()
    conn.close()
    return jsonify([dict(b) for b in buses])

# ─── SCHEDULES ───────────────────────────────────────────────────────────────

@app.route('/api/schedules', methods=['GET'])
def get_all_schedules():
    """Return all departures grouped by operator and route."""
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT DISTINCT bs.bus_id, bs.arrival, bs.departure,
               b.bus_name, b.bus_number
        FROM bus_schedules bs
        JOIN buses b ON bs.bus_id = b.bus_id
        ORDER BY bs.bus_id, bs.departure
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/schedules/route/<int:route_id>', methods=['GET'])
def get_schedules_by_route(route_id):
    """All departures for a route — returns all bus schedules (route-independent)."""
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT DISTINCT bs.bus_id, bs.arrival, bs.departure,
               b.bus_name, b.bus_number
        FROM bus_schedules bs
        JOIN buses b ON bs.bus_id = b.bus_id
        ORDER BY bs.departure
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/schedules/bus/<bus_id>', methods=['GET'])
def get_schedules_by_bus(bus_id):
    """All departures for one bus_id."""
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT DISTINCT bs.arrival, bs.departure
        FROM bus_schedules bs
        WHERE bs.bus_id = ?
        ORDER BY bs.departure
    ''', (bus_id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# ─── SEARCH ──────────────────────────────────────────────────────────────────

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '').lower()
    if not query:
        return jsonify({'routes': [], 'buses': [], 'stops': []})

    conn = get_db_connection()

    routes = conn.execute('''
        SELECT * FROM routes
        WHERE LOWER(route_name) LIKE ? OR LOWER(start_point) LIKE ? OR LOWER(end_point) LIKE ?
    ''', (f'%{query}%',) * 3).fetchall()

    buses = conn.execute('''
        SELECT b.*, r.route_name
        FROM buses_with_route b
        JOIN routes r ON b.route_id = r.id
        WHERE LOWER(b.bus_id) LIKE ? OR LOWER(b.bus_name) LIKE ? OR LOWER(b.bus_number) LIKE ?
    ''', (f'%{query}%',) * 3).fetchall()

    # Return each stop with its own route_id and coordinates (no grouping)
    # Frontend filters by route when needed
    stops = conn.execute('''
        SELECT id, name, latitude, longitude, route_id, stop_order
        FROM stops WHERE LOWER(name) LIKE ?
        ORDER BY route_id, stop_order
    ''', (f'%{query}%',)).fetchall()

    conn.close()
    return jsonify({
        'routes': [dict(r) for r in routes],
        'buses':  [dict(b) for b in buses],
        'stops':  [dict(s) for s in stops],
    })

# ─── STOPS ───────────────────────────────────────────────────────────────────

@app.route('/api/stops', methods=['GET'])
def get_all_stops():
    conn  = get_db_connection()
    stops = conn.execute('SELECT * FROM stops').fetchall()
    conn.close()
    return jsonify([dict(s) for s in stops])


@app.route('/api/stops/<int:stop_id>', methods=['GET'])
def get_stop(stop_id):
    conn = get_db_connection()
    stop = conn.execute('SELECT * FROM stops WHERE id = ?', (stop_id,)).fetchone()
    conn.close()
    if stop is None:
        return jsonify({'error': 'Stop not found'}), 404
    return jsonify(dict(stop))

# ─── ACTIVE BUSES (only drivers on a live trip) ───────────────────────────────

@app.route('/api/active_buses', methods=['GET'])
def get_active_buses():
    """Return only buses where a driver updated position in last 30 minutes."""
    conn = get_db_connection()
    cutoff = _time.strftime('%Y-%m-%d %H:%M:%S', _time.gmtime(_time.time() - 1800))
    buses = conn.execute('''
        SELECT b.bus_id, b.bus_name, b.bus_number, b.route_id,
               r.route_name, r.start_point, r.end_point,
               bp.latitude, bp.longitude, bp.speed, bp.timestamp
        FROM bus_positions bp
        JOIN buses_with_route b  ON bp.bus_id   = b.bus_id
        JOIN routes r ON b.route_id  = r.id
        WHERE bp.timestamp >= ?
        ORDER BY bp.timestamp DESC
    ''', (cutoff,)).fetchall()
    conn.close()
    return jsonify([dict(b) for b in buses])

# ─── NEARBY ──────────────────────────────────────────────────────────────────

@app.route('/api/nearby', methods=['GET'])
def get_nearby_buses():
    lat    = request.args.get('lat',    type=float)
    lon    = request.args.get('lon',    type=float)
    radius = request.args.get('radius', 2.0, type=float)

    if lat is None or lon is None:
        return jsonify({'error': 'Latitude and longitude required'}), 400

    conn  = get_db_connection()
    buses = conn.execute('''
        SELECT b.*, r.route_name, r.start_point, r.end_point,
               bp.latitude, bp.longitude, bp.speed, bp.timestamp
        FROM buses_with_route b
        JOIN routes r ON b.route_id = r.id
        LEFT JOIN bus_positions bp ON b.bus_id = bp.bus_id
        WHERE bp.timestamp IS NOT NULL
    ''').fetchall()

    nearby = []
    for bus in buses:
        if bus['latitude'] and bus['longitude']:
            dist = calculate_distance(lat, lon, bus['latitude'], bus['longitude'])
            if dist <= radius:
                row = dict(bus)
                row['distance'] = round(dist, 2)
                nearby.append(row)

    conn.close()
    return jsonify(nearby)

# ─── TRACKING ────────────────────────────────────────────────────────────────

@app.route('/api/track/<bus_id>', methods=['GET'])
def track_bus(bus_id):
    conn = get_db_connection()

    bus = conn.execute('''
        SELECT b.*, r.route_name, r.start_point, r.end_point
        FROM buses_with_route b
        JOIN routes r ON b.route_id = r.id
        WHERE b.bus_id = ?
    ''', (bus_id,)).fetchone()

    if bus is None:
        conn.close()
        return jsonify({'error': 'Bus not found'}), 404

    position = conn.execute('''
        SELECT * FROM bus_positions
        WHERE bus_id = ?
        ORDER BY timestamp DESC LIMIT 1
    ''', (bus_id,)).fetchone()

    # Allow frontend to override route (buses run alternate routes daily)
    override_route_id = request.args.get('route_id', type=int)
    use_route_id = override_route_id if override_route_id else bus['route_id']

    stops = conn.execute('''
        SELECT * FROM stops
        WHERE route_id = ?
        ORDER BY stop_order
    ''', (use_route_id,)).fetchall()

    # Fetch today's schedule for this bus
    schedules = conn.execute('''
        SELECT DISTINCT departure FROM bus_schedules
        WHERE bus_id = ?
        ORDER BY departure
    ''', (bus_id,)).fetchall()

    conn.close()

    seen_stops = set()
    deduped_stops = []
    for s in stops:
        if s['name'] not in seen_stops:
            seen_stops.add(s['name'])
            deduped_stops.append(dict(s))

    bus_dict             = dict(bus)
    bus_dict['position'] = dict(position) if position else None
    bus_dict['stops']    = deduped_stops
    bus_dict['schedule'] = [s['departure'] for s in schedules]

    lat   = 12.9165
    lon   = 79.1325
    speed = 25
    if position:
        lat   = position['latitude']
        lon   = position['longitude']
        speed = position['speed'] if position['speed'] > 0 else 25

    seen_stops = set()
    eta_list = []
    nearest_idx  = None          # index of the stop closest to bus (current stop)
    nearest_dist = float('inf')

    # First pass — find which stop the bus is currently nearest to
    deduped_for_eta = []
    seen2 = set()
    for stop in stops:
        if stop['name'] not in seen2:
            seen2.add(stop['name'])
            deduped_for_eta.append(stop)

    for i, stop in enumerate(deduped_for_eta):
        d = calculate_distance(lat, lon, stop['latitude'], stop['longitude'])
        if d < nearest_dist:
            nearest_dist = d
            nearest_idx  = i

    # Second pass — build ETA list with status
    for i, stop in enumerate(deduped_for_eta):
        dist = calculate_distance(lat, lon, stop['latitude'], stop['longitude'])
        eta_min = calculate_eta(dist, speed)

        if i < nearest_idx:
            status = 'passed'       # bus already went past this stop
        elif i == nearest_idx:
            status = 'current'      # bus is at / nearest to this stop
        else:
            status = 'upcoming'     # bus hasn't reached yet

        eta_list.append({
            'stop_id':     stop['id'],
            'stop_name':   stop['name'],
            'stop_order':  stop['stop_order'],
            'eta_minutes': eta_min,
            'distance_km': round(dist, 2),
            'status':      status,
        })
    bus_dict['eta'] = eta_list

    return jsonify(bus_dict)

# ─── ETA FOR STOP ─────────────────────────────────────────────────────────────

@app.route('/api/eta/<int:stop_id>', methods=['GET'])
def get_eta_for_stop(stop_id):
    conn = get_db_connection()
    stop = conn.execute('SELECT * FROM stops WHERE id = ?', (stop_id,)).fetchone()
    if stop is None:
        conn.close()
        return jsonify({'error': 'Stop not found'}), 404

    buses = conn.execute('''
        SELECT b.*, bp.latitude, bp.longitude, bp.speed
        FROM buses_with_route b
        LEFT JOIN bus_positions bp ON b.bus_id = bp.bus_id
        WHERE b.route_id = ?
    ''', (stop['route_id'],)).fetchall()

    eta_list = []
    for bus in buses:
        if bus['latitude'] and bus['longitude']:
            dist  = calculate_distance(bus['latitude'], bus['longitude'],
                                       stop['latitude'], stop['longitude'])
            speed = bus['speed'] if bus['speed'] and bus['speed'] > 0 else 25
            eta_list.append({
                'bus_id':      bus['bus_id'],
                'bus_name':    bus['bus_name'],
                'bus_number':  bus['bus_number'],
                'eta_minutes': calculate_eta(dist, speed),
                'distance_km': round(dist, 2),
            })

    eta_list.sort(key=lambda x: x['eta_minutes'])
    conn.close()
    return jsonify({'stop': dict(stop), 'buses': eta_list})

# ─── UPDATE POSITION (Driver GPS) ────────────────────────────────────────────

@app.route('/api/update_position', methods=['POST'])
@jwt_required()
def update_position():
    data      = request.json
    bus_id    = data.get('bus_id')
    latitude  = data.get('latitude')
    longitude = data.get('longitude')
    speed     = data.get('speed', 0)

    if not bus_id or latitude is None or longitude is None:
        return jsonify({'error': 'Missing fields'}), 400

    conn = get_db_connection()
    existing = conn.execute('SELECT id FROM bus_positions WHERE bus_id = ?', (bus_id,)).fetchone()
    if existing:
        conn.execute(
            'UPDATE bus_positions SET latitude=?, longitude=?, speed=?, timestamp=CURRENT_TIMESTAMP WHERE bus_id=?',
            (latitude, longitude, speed, bus_id)
        )
    else:
        conn.execute(
            'INSERT INTO bus_positions (bus_id, latitude, longitude, speed) VALUES (?,?,?,?)',
            (bus_id, latitude, longitude, speed)
        )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Position updated'})

# ─── WEBSOCKET ────────────────────────────────────────────────────────────────

def simulate_bus_movement():
    while True:
        socketio.sleep(10)
        conn      = get_db_connection()
        positions = conn.execute('SELECT * FROM bus_positions').fetchall()

        for pos in positions:
            bus = conn.execute(
                'SELECT route_id FROM buses_with_route WHERE bus_id = ?', (pos['bus_id'],)
            ).fetchone()
            if bus:
                stops = conn.execute(
                    'SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order',
                    (bus['route_id'],)
                ).fetchall()
                current_order = pos['current_stop_id'] if pos['current_stop_id'] else 1
                next_order    = min(current_order + 1, len(stops))
                if next_order < len(stops):
                    nxt     = stops[next_order]
                    new_lat = pos['latitude']  + (nxt['latitude']  - pos['latitude'])  * 0.15
                    new_lon = pos['longitude'] + (nxt['longitude'] - pos['longitude']) * 0.15
                    conn.execute('''
                        UPDATE bus_positions
                        SET latitude = ?, longitude = ?, current_stop_id = ?,
                            speed = ?, timestamp = CURRENT_TIMESTAMP
                        WHERE bus_id = ?
                    ''', (new_lat, new_lon, nxt['id'], 20.0, pos['bus_id']))

        conn.commit()
        conn.close()
        socketio.emit('bus_update', {'message': 'Bus positions updated'})


@socketio.on('connect')
def handle_connect():
    emit('connected', {'data': 'Connected to NavBus server'})


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


@socketio.on('track_bus')
def handle_track_bus(data):
    bus_id = data.get('bus_id')
    if bus_id:
        conn     = get_db_connection()
        position = conn.execute('''
            SELECT bp.*, b.bus_name, b.bus_number, r.route_name
            FROM bus_positions bp
            JOIN buses_with_route b ON bp.bus_id = b.bus_id
            JOIN routes r ON b.route_id  = r.id
            WHERE bp.bus_id = ?
            ORDER BY bp.timestamp DESC LIMIT 1
        ''', (bus_id,)).fetchone()
        conn.close()
        if position:
            emit('bus_position', dict(position))


# ─── MAIN ────────────────────────────────────────────────────────────────────


# ─── PUSH NOTIFICATION SUBSCRIPTION ─────────────────────────────────────────
# Store subscriptions in memory (use DB in production)
push_subscriptions = {}

@app.route('/api/subscribe', methods=['POST'])
def subscribe():
    data = request.json
    user_id = data.get('user_id', 'anonymous')
    subscription = data.get('subscription')
    stop_name    = data.get('stop_name')
    bus_id       = data.get('bus_id')
    if not subscription:
        return jsonify({'error': 'No subscription'}), 400
    push_subscriptions[user_id] = {
        'subscription': subscription,
        'stop_name':    stop_name,
        'bus_id':       bus_id,
    }
    return jsonify({'status': 'subscribed'})

@app.route('/api/unsubscribe', methods=['POST'])
def unsubscribe():
    data    = request.json
    user_id = data.get('user_id', 'anonymous')
    push_subscriptions.pop(user_id, None)
    return jsonify({'status': 'unsubscribed'})

@app.route('/api/check_nearby_notification', methods=['POST'])
def check_nearby_notification():
    """
    Called by client periodically. Returns True if bus is within
    ~500m of the user's chosen stop so the frontend can fire a notification.
    """
    data      = request.json
    bus_id    = data.get('bus_id')
    stop_name = data.get('stop_name')
    if not bus_id or not stop_name:
        return jsonify({'notify': False})

    conn = get_db_connection()
    pos  = conn.execute(
        'SELECT latitude, longitude FROM bus_positions WHERE bus_id = ? ORDER BY timestamp DESC LIMIT 1',
        (bus_id,)
    ).fetchone()
    stop = conn.execute(
        'SELECT latitude, longitude FROM stops WHERE name = ? LIMIT 1',
        (stop_name,)
    ).fetchone()
    conn.close()

    if not pos or not stop:
        return jsonify({'notify': False})

    dist = calculate_distance(pos['latitude'], pos['longitude'],
                              stop['latitude'], stop['longitude'])
    # Notify if within 0.5 km
    return jsonify({'notify': dist <= 0.5, 'distance_km': round(dist, 2)})

# ─── CROWDSOURCING ────────────────────────────────────────────────────────────
#
#  Table: crowd_reports
#  Fields: id, bus_id, report_type, latitude, longitude, stop_name,
#          reported_by, confirmations, timestamp
#
#  report_type: 'location' | 'stop_departed' | 'delayed' | 'not_running'
#  Reports expire after 10 minutes if no new confirmations

CROWD_EXPIRY_SECONDS = 600  # 10 minutes

def ensure_all_tables():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role     TEXT NOT NULL DEFAULT 'passenger'
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS bus_positions (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            bus_id           TEXT NOT NULL,
            latitude         REAL NOT NULL,
            longitude        REAL NOT NULL,
            speed            REAL DEFAULT 0,
            current_stop_id  INTEGER,
            timestamp        DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

ensure_all_tables()
def ensure_crowd_table():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS crowd_reports (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            bus_id        TEXT NOT NULL,
            report_type   TEXT NOT NULL,
            latitude      REAL,
            longitude     REAL,
            stop_name     TEXT,
            reported_by   TEXT,
            confirmations INTEGER DEFAULT 1,
            timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

ensure_crowd_table()


@app.route('/api/crowd/report', methods=['POST'])
def crowd_report():
    """Passenger submits a location / stop / status report for a bus."""
    data        = request.json
    bus_id      = data.get('bus_id')
    report_type = data.get('report_type')   # 'location' | 'stop_departed' | 'delayed' | 'not_running'
    latitude    = data.get('latitude')
    longitude   = data.get('longitude')
    stop_name   = data.get('stop_name')
    reported_by = data.get('reported_by', 'anonymous')

    if not bus_id or not report_type:
        return jsonify({'error': 'Missing bus_id or report_type'}), 400

    conn = get_db_connection()

    # For location reports — weighted-average recent positions for accuracy
    if report_type == 'location' and latitude and longitude:
        # Insert first so it's included in the average
        conn.execute('''
            INSERT INTO crowd_reports (bus_id, report_type, latitude, longitude, stop_name, reported_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (bus_id, report_type, latitude, longitude, stop_name, reported_by))

        # Weighted average of all location reports in last 5 minutes
        avg_cutoff = _time.strftime('%Y-%m-%d %H:%M:%S', _time.gmtime(_time.time() - 300))
        recent = conn.execute('''
            SELECT latitude, longitude, confirmations FROM crowd_reports
            WHERE bus_id = ? AND report_type = 'location' AND timestamp >= ?
              AND latitude IS NOT NULL AND longitude IS NOT NULL
        ''', (bus_id, avg_cutoff)).fetchall()

        if recent:
            total_weight = sum(r['confirmations'] for r in recent)
            avg_lat = sum(r['latitude']  * r['confirmations'] for r in recent) / total_weight
            avg_lon = sum(r['longitude'] * r['confirmations'] for r in recent) / total_weight
            existing = conn.execute('SELECT id FROM bus_positions WHERE bus_id = ?', (bus_id,)).fetchone()
            if existing:
                conn.execute(
                    'UPDATE bus_positions SET latitude=?, longitude=?, speed=0, timestamp=CURRENT_TIMESTAMP WHERE bus_id=?',
                    (avg_lat, avg_lon, bus_id)
                )
            else:
                conn.execute(
                    'INSERT INTO bus_positions (bus_id, latitude, longitude, speed) VALUES (?,?,?,0)',
                    (bus_id, avg_lat, avg_lon)
                )

        conn.commit()
        conn.close()
        return jsonify({'message': 'Report submitted', 'bus_id': bus_id, 'type': report_type,
                        'averaged_from': len(recent) if recent else 1})

    # For all other report types (delayed, not_running, stop_departed)
    conn.execute('''
        INSERT INTO crowd_reports (bus_id, report_type, latitude, longitude, stop_name, reported_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (bus_id, report_type, latitude, longitude, stop_name, reported_by))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Report submitted', 'bus_id': bus_id, 'type': report_type})


@app.route('/api/crowd/confirm/<int:report_id>', methods=['POST'])
def crowd_confirm(report_id):
    """Another passenger confirms an existing crowd report (+1 its weight)."""
    conn = get_db_connection()
    conn.execute(
        'UPDATE crowd_reports SET confirmations = confirmations + 1, timestamp = CURRENT_TIMESTAMP WHERE id = ?',
        (report_id,)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Confirmed'})


@app.route('/api/crowd/<bus_id>', methods=['GET'])
def get_crowd_reports(bus_id):
    """Return all active (non-expired) crowd reports for a bus."""
    conn   = get_db_connection()
    cutoff = _time.strftime('%Y-%m-%d %H:%M:%S', _time.gmtime(_time.time() - CROWD_EXPIRY_SECONDS))
    reports = conn.execute('''
        SELECT id, report_type, latitude, longitude, stop_name,
               reported_by, confirmations, timestamp
        FROM crowd_reports
        WHERE bus_id = ? AND timestamp >= ?
        ORDER BY timestamp DESC
    ''', (bus_id, cutoff)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in reports])


@app.route('/api/crowd/status/<bus_id>', methods=['GET'])
def crowd_status(bus_id):
    """
    Returns the best available position for a bus + any active crowd alerts.

    source priority:
      'driver' → live GPS from driver (updated in last 5 min)
      'crowd'  → crowdsourced passenger location (updated in last 10 min)
      'schedule' → no live data, fall back to timetable
    """
    conn   = get_db_connection()
    cutoff = _time.strftime('%Y-%m-%d %H:%M:%S', _time.gmtime(_time.time() - CROWD_EXPIRY_SECONDS))

    # 1. Check for recent driver GPS (within last 5 minutes)
    driver_cutoff = _time.strftime('%Y-%m-%d %H:%M:%S', _time.gmtime(_time.time() - 300))
    driver_pos = conn.execute(
        'SELECT latitude, longitude, speed, timestamp FROM bus_positions WHERE bus_id = ? AND timestamp >= ?',
        (bus_id, driver_cutoff)
    ).fetchone()

    # 2. Best crowd location report (most confirmed, most recent)
    crowd_loc = conn.execute('''
        SELECT id, latitude, longitude, confirmations, reported_by, timestamp
        FROM crowd_reports
        WHERE bus_id = ? AND report_type = 'location' AND timestamp >= ?
        ORDER BY confirmations DESC, timestamp DESC LIMIT 1
    ''', (bus_id, cutoff)).fetchone()

    # 3. Most recent stop_departed report
    crowd_stop = conn.execute('''
        SELECT id, stop_name, confirmations, reported_by, timestamp
        FROM crowd_reports
        WHERE bus_id = ? AND report_type = 'stop_departed' AND timestamp >= ?
        ORDER BY confirmations DESC, timestamp DESC LIMIT 1
    ''', (bus_id, cutoff)).fetchone()

    # 4. Active delay / not_running alerts
    alerts = conn.execute('''
        SELECT id, report_type, confirmations, reported_by, timestamp
        FROM crowd_reports
        WHERE bus_id = ? AND report_type IN ('delayed','not_running') AND timestamp >= ?
        ORDER BY timestamp DESC
    ''', (bus_id, cutoff)).fetchall()

    conn.close()

    result = {
        'bus_id':         bus_id,
        'source':         'schedule',
        'position':       None,
        'crowd_location': None,
        'crowd_stop':     None,
        'alerts':         [dict(a) for a in alerts],
    }

    if driver_pos:
        result['source']   = 'driver'
        result['position'] = {
            'latitude':  driver_pos['latitude'],
            'longitude': driver_pos['longitude'],
            'speed':     driver_pos['speed'],
            'timestamp': driver_pos['timestamp'],
        }
    elif crowd_loc:
        result['source']   = 'crowd'
        result['position'] = {
            'latitude':     crowd_loc['latitude'],
            'longitude':    crowd_loc['longitude'],
            'speed':        0,
            'confirmations': crowd_loc['confirmations'],
            'reported_by':  crowd_loc['reported_by'],
            'timestamp':    crowd_loc['timestamp'],
            'report_id':    crowd_loc['id'],
        }

    if crowd_stop:
        result['crowd_stop'] = {
            'stop_name':     crowd_stop['stop_name'],
            'confirmations': crowd_stop['confirmations'],
            'reported_by':   crowd_stop['reported_by'],
            'timestamp':     crowd_stop['timestamp'],
            'report_id':     crowd_stop['id'],
        }

    return jsonify(result)


# ─── APP STARTUP / INIT ────────────────────────────────────────────────────────

_app_initialized = False

def prepare_app():
    global _app_initialized
    if _app_initialized:
        return
    _app_initialized = True
    print("Initialising database ...")
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("database_init", "database_init.py")
        db_mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(db_mod)
        db_mod.init_db()
        print("[SUCCESS] Database initialised")
    except Exception as e:
        print(f"[WARNING] database_init error: {e} - using existing database")
    
    # Start background tasks
    print("Starting bus simulation …")
    socketio.start_background_task(target=simulate_bus_movement)

# Run initialization immediately when the module is loaded (Gunicorn)
prepare_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"")
    print(f"  NavBus backend running!")
    print(f"  Open in browser: http://localhost:{port}")
    print(f"  API base:        http://localhost:{port}/api")
    print(f"")
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
