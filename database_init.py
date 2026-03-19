import sqlite3

def init_db():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    print("Checking and updating schema...")

    # ─── KEEP USERS (preserves accounts across restarts) ─────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role     TEXT NOT NULL DEFAULT 'passenger'
        )""")

    # ─── DROP & RECREATE all data tables fresh ────────────────────────────────
    cursor.execute("DROP TABLE IF EXISTS bus_schedules")
    cursor.execute("DROP TABLE IF EXISTS bus_positions")
    cursor.execute("DROP TABLE IF EXISTS crowd_reports")
    cursor.execute("DROP TABLE IF EXISTS bus_route_assignments")
    cursor.execute("DROP TABLE IF EXISTS stops")
    cursor.execute("DROP TABLE IF EXISTS buses")
    cursor.execute("DROP TABLE IF EXISTS routes")

    # ─── ROUTES ───────────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE routes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            route_name  TEXT NOT NULL,
            start_point TEXT NOT NULL,
            end_point   TEXT NOT NULL
        )""")

    # ─── STOPS ────────────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE stops (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id   INTEGER NOT NULL,
            name       TEXT NOT NULL,
            latitude   REAL NOT NULL,
            longitude  REAL NOT NULL,
            stop_order INTEGER NOT NULL,
            FOREIGN KEY (route_id) REFERENCES routes(id)
        )""")

    # ─── BUSES ────────────────────────────────────────────────────────────────
    # No route_id here — a bus is just a vehicle.
    # Which route(s) it runs is defined in bus_route_assignments below.
    cursor.execute("""
        CREATE TABLE buses (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            bus_id     TEXT UNIQUE NOT NULL,
            bus_name   TEXT NOT NULL,
            bus_number TEXT NOT NULL
        )""")

    # ─── BUS ↔ ROUTE ASSIGNMENTS ──────────────────────────────────────────────
    # One bus can be assigned to multiple routes.
    # start_time / end_time / interval are per-assignment (can differ per route).
    cursor.execute("""
        CREATE TABLE bus_route_assignments (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            bus_id           TEXT NOT NULL,
            route_id         INTEGER NOT NULL,
            start_time       TEXT NOT NULL,
            end_time         TEXT NOT NULL,
            interval_minutes INTEGER DEFAULT 90,
            UNIQUE (bus_id, route_id),
            FOREIGN KEY (bus_id)   REFERENCES buses(bus_id),
            FOREIGN KEY (route_id) REFERENCES routes(id)
        )""")

    # ─── BUS SCHEDULES ────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE bus_schedules (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            bus_id    TEXT NOT NULL,
            arrival   TEXT NOT NULL,
            departure TEXT NOT NULL,
            FOREIGN KEY (bus_id) REFERENCES buses(bus_id)
        )""")

    # ─── BUS POSITIONS ────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE bus_positions (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            bus_id          TEXT UNIQUE NOT NULL,
            latitude        REAL,
            longitude       REAL,
            speed           REAL DEFAULT 0,
            current_stop_id INTEGER,
            timestamp       DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bus_id) REFERENCES buses(bus_id)
        )""")

    # ─── CROWD REPORTS ────────────────────────────────────────────────────────
    cursor.execute("""
        CREATE TABLE crowd_reports (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            bus_id        TEXT NOT NULL,
            report_type   TEXT NOT NULL,
            latitude      REAL,
            longitude     REAL,
            stop_name     TEXT,
            reported_by   TEXT DEFAULT 'anonymous',
            confirmations INTEGER DEFAULT 1,
            timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP
        )""")

    # ═════════════════════════════════════════════════════════════════════════
    # DATA
    # ═════════════════════════════════════════════════════════════════════════

    # ─── ROUTES ───────────────────────────────────────────────────────────────
    cursor.executemany(
        'INSERT INTO routes (id, route_name, start_point, end_point) VALUES (?, ?, ?, ?)',
        [
            (1, 'Bagayam - Katpadi (Via Polytechnic)', 'Bagayam', 'Katpadi'),
            (2, 'Bagayam - Katpadi (Via Otteri)',      'Bagayam', 'Katpadi'),
            (3, 'Katpadi - Bagayam (Via Polytechnic)', 'Katpadi', 'Bagayam'),
            (4, 'Katpadi - Bagayam (Via Otteri)',      'Katpadi', 'Bagayam'),
        ]
    )

    # ─── STOPS ────────────────────────────────────────────────────────────────
    cursor.executemany(
        'INSERT INTO stops (route_id, name, latitude, longitude, stop_order) VALUES (?, ?, ?, ?, ?)',
        [
            # ── Route 1 — Via Polytechnic (23 stops) ─────────────────────────
            (1, 'Bagayam Stop',                 12.879701908033898, 79.13441872009273,  1),
            (1, 'CMC Stop',                     12.879197802568617, 79.13007326645157,  2),
            (1, 'Polytechnic Stop',             12.878791307669816, 79.12490556824608,  3),
            (1, 'Female Jail Stop',             12.883328754719894, 79.12276275352771,  4),
            (1, 'Thorapadi Central Jail Stop',  12.887945277893868, 79.12222447928264,  5),
            (1, 'MGR Statue Stop',              12.890633472197994, 79.12300867856696,  6),
            (1, 'Thorapadi Stop',               12.892551816683273, 79.12489216781579,  7),
            (1, 'Allapuram Stop',               12.895228424633233, 79.12790270672754,  8),
            (1, 'Toll Gate Stop',               12.899697689611463, 79.13104182515550,  9),
            (1, 'Roundana Stop',                12.901490825230864, 79.13141296780185, 10),
            (1, 'Lakshmi Theatre Stop',         12.902779667081761, 79.13172931529897, 11),
            (1, 'Cantonment Stop',              12.911048454464556, 79.13053306640445, 12),
            (1, 'Raja Theatre Stop',            12.914859693143715, 79.13244118666111, 13),
            (1, 'Vellore Old Bus Stand',        12.919930120429873, 79.13203321182841, 14),
            (1, 'CMC Main Campus Stop',         12.924574060366844, 79.13328529547623, 15),
            (1, 'Pachaiyappas Stop',            12.928535675317270, 79.13375190366622, 16),
            (1, 'Vellore New Bus Stand',        12.934309624740797, 79.13579644363381, 17),
            (1, 'Viruthampattu Stop',           12.946504519367330, 79.13698440685489, 18),
            (1, 'Silk Mill Stop',               12.949768295683402, 79.13700534261544, 19),
            (1, 'Oda Pillaiyar Stop',           12.958886638736615, 79.13720229773925, 20),
            (1, 'Chittoor Stop',                12.966008130206870, 79.13721467294967, 21),
            (1, 'Katpadi Railway Station Stop', 12.971220245857092, 79.13702758912079, 22),
            (1, 'Katpadi Junction',             12.973381819569266, 79.13676859782886, 23),

            # ── Route 2 — Via Otteri (20 stops) ──────────────────────────────
            (2, 'Bagayam Stop',                 12.880092211281418, 79.13458853229598,  1),
            (2, 'Otteri Stop',                  12.884407017959660, 79.13556661494079,  2),
            (2, 'Virupachipuram Stop',          12.890130060452744, 79.13577410553080,  3),
            (2, 'Sainathapuram Stop',           12.896923068075761, 79.13515272394497,  4),
            (2, 'DKM College Stop',             12.899601511867923, 79.13511072989195,  5),
            (2, 'Sankaranpalayam Stop',         12.903915227677738, 79.13552573444551,  6),
            (2, 'Velapaadi Stop',               12.904744344543005, 79.13575212249438,  7),
            (2, 'SP Bungalow Stop',             12.905825703645592, 79.13446459228895,  8),
            (2, 'Eye Hospital Stop',            12.913070987406813, 79.13307871740251,  9),
            (2, 'Raja Theatre Stop',            12.914836610716229, 79.13243183807666, 10),
            (2, 'Vellore Old Bus Stand',        12.919930120429873, 79.13203321182841, 11),
            (2, 'CMC Main Campus Stop',         12.924574060366844, 79.13328529547623, 12),
            (2, 'Pachaiyappas Stop',            12.928535675317270, 79.13375190366622, 13),
            (2, 'Vellore New Bus Stand',        12.934309624740797, 79.13579644363381, 14),
            (2, 'Viruthampattu Stop',           12.946504519367330, 79.13698440685489, 15),
            (2, 'Silk Mill Stop',               12.949768295683402, 79.13700534261544, 16),
            (2, 'Oda Pillaiyar Stop',           12.958886638736615, 79.13720229773925, 17),
            (2, 'Chittoor Stop',                12.966008130206870, 79.13721467294967, 18),
            (2, 'Katpadi Railway Station Stop', 12.971220245857092, 79.13702758912079, 19),
            (2, 'Katpadi Junction',             12.973381819569266, 79.13676859782886, 20),

            # ── Route 3 — Katpadi → Bagayam (Via Polytechnic, 17 stops) ─────
            (3, 'Katpadi Junction',             12.973386446015695, 79.13676470172632,  1),
            (3, 'Katpadi Railway Station',      12.971220328234741, 79.13717771924989,  2),
            (3, 'Arigar Anna Bus Stop',         12.966511721951592, 79.13739795944582,  3),
            (3, 'Silk Mill Bus Stop',           12.949761022108207, 79.13716879807392,  4),
            (3, 'Viruthampattu',                12.944942996549148, 79.13709847227749,  5),
            (3, 'Vellore New Bus Stand',        12.934739338371882, 79.13792589008159,  6),
            (3, 'Thottapalayam',                12.929184169587025, 79.13342931208162,  7),
            (3, 'CMC Main Campus',              12.925309532085983, 79.13341978648562,  8),
            (3, 'Vellore Old Bus Stand',        12.921585851131923, 79.13218993298820,  9),
            (3, 'Raja Theatre',                 12.915263689265748, 79.13273151675000, 10),
            (3, 'Voorhees College',             12.910305988025620, 79.13197450274359, 11),
            (3, 'Toll Gate',                    12.900156149603820, 79.13309554736620, 12),
            (3, 'Allapuram',                    12.895584295451856, 79.12838080248572, 13),
            (3, 'Thorapadi Jail Bus Stop',      12.887873401606692, 79.12233171635906, 14),
            (3, 'Female Jail',                  12.883372781230600, 79.12289542060184, 15),
            (3, 'Polytechnic',                  12.879981049622927, 79.12446830316603, 16),
            (3, 'Bagayam',                      12.880092211281418, 79.13458853229598, 17),

            # ── Route 4 — Katpadi → Bagayam (Via Otteri, 18 stops) ───────────
            (4, 'Katpadi Junction',             12.973381819569266, 79.13676859782886,  1),
            (4, 'Katpadi Railway Station',      12.971220328234741, 79.13717771924989,  2),
            (4, 'Arigar Anna Bus Stop',         12.966511721951592, 79.13739795944582,  3),
            (4, 'Silk Mill',                    12.949761022108207, 79.13716879807392,  4),
            (4, 'Viruthampattu',                12.944942996549148, 79.13709847227749,  5),
            (4, 'Vellore New Bus Stand',        12.934739338371882, 79.13792589008159,  6),
            (4, 'Thottapalayam',                12.929184169587025, 79.13342931208162,  7),
            (4, 'CMC Main Campus',              12.925309532085983, 79.13341978648562,  8),
            (4, 'Vellore Old Bus Stand',        12.921585851131923, 79.13218993298820,  9),
            (4, 'Raja Theatre',                 12.915263689265748, 79.13273151675000, 10),
            (4, 'Eye Hospital',                 12.912820129940764, 79.13315090650437, 11),
            (4, 'SP Bungalow',                  12.906036885196265, 79.13436135484301, 12),
            (4, 'Velapaadi',                    12.905274001268992, 79.13584858030187, 13),
            (4, 'DKM College',                  12.899727820874588, 79.13517891561759, 14),
            (4, 'Sainathapuram',                12.897010385313662, 79.13522901798254, 15),
            (4, 'Virupachipuram',               12.889696392387950, 79.13587854153290, 16),
            (4, 'Otteri',                       12.884240873962595, 79.13572212629434, 17),
            (4, 'Bagayam',                      12.880161852557402, 79.13477537217757, 18),
        ]
    )

    # ─── BUSES (vehicles only — no route info here) ───────────────────────────
    # All 32 buses serve both Route 1 and Route 2 — driver chooses each trip.
    cursor.executemany(
        'INSERT INTO buses (bus_id, bus_name, bus_number) VALUES (?, ?, ?)',
        [
            ('TA',    'KV1 - T A',       'TA'),
            ('TB',    'KV1 - T B',       'TB'),
            ('TC',    'KV1 - T C',       'TC'),
            ('TD',    'KV1 - T D',       'TD'),
            ('TE',    'KV1 - T E',       'TE'),
            ('AAA',   'KV1 - AAA',       'AAA'),
            ('TF',    'KV1 - T F',       'TF'),
            ('SABS',  'SABS/SKBS',       'SABS'),
            ('SKBS',  'SKBS/SABS',       'SKBS'),
            ('TG',    'KV1 - T G',       'TG'),
            ('SKS',   'SKS/VSM',         'SKS/VSM'),
            ('SLSMT', 'SLSMT/LKM',       'SLSMT'),
            ('LKM',   'LKM/SLSMT',       'LKM'),
            ('VGT',   'VGT/Dhanapathy',  'VGT'),
            ('DVGT',  'Dhanapathy/VGT',  'DVGT'),
            ('SRI',   'Sri/Devi',        'SRI'),
            ('DEVI',  'Devi/Sri',        'DEVI'),
            ('TKT',   'TKT/SKMS',        'TKT'),
            ('SKMS',  'SKMS/TKT',        'SKMS'),
            ('TN',    'KV1 - T N',       'TN'),
            ('TEDR',  'T E/DR',          'TE/DR'),
            ('DRTE',  'DR/T E',          'DR/TE'),
            ('BAL',   'Balaganesar',     'BAL'),
            ('TEX1',  'KV1 - T EX1',     'TEX1'),
            ('VSM',   'VSM/SKS',         'VSM'),
            ('TH',    'KV1 - T H',       'TH'),
            ('SRINI', 'Srinivasa',       'SRINI'),
            ('TO',    'KV1 - T O',       'TO'),
            ('T2R',   'KV1 - T 2R',      'T2R'),
            ('TI',    'KV1 - T I',       'TI'),
            ('TM',    'KV1 - T M',       'TM'),
            ('T2GA',  'KV1 - T 2GA',     'T2GA'),
        ]
    )

    # ─── BUS ↔ ROUTE ASSIGNMENTS ──────────────────────────────────────────────
    # ALL buses run BOTH Route 1 and Route 2 — driver picks the route each trip.
    # Every bus appears twice: once for route_id=1, once for route_id=2.
    # start_time = earliest departure, end_time = last departure from schedule.
    assignments = []
    all_buses_times = [
        # (bus_id, start_time, end_time)
        ('TA',    '05:00', '20:02'),
        ('TB',    '05:05', '20:09'),
        ('TC',    '05:10', '20:16'),
        ('TD',    '05:15', '20:23'),
        ('TE',    '05:20', '20:30'),
        ('AAA',   '05:23', '20:33'),
        ('TF',    '05:25', '21:24'),
        ('SABS',  '05:30', '20:30'),
        ('SKBS',  '05:35', '20:35'),
        ('TG',    '05:40', '20:27'),
        ('SKS',   '05:45', '20:45'),
        ('SLSMT', '05:50', '20:50'),
        ('LKM',   '05:55', '20:55'),
        ('VGT',   '06:00', '21:00'),
        ('DVGT',  '06:05', '21:05'),
        ('SRI',   '06:10', '21:10'),
        ('DEVI',  '06:15', '21:15'),
        ('TKT',   '06:20', '21:20'),
        ('SKMS',  '06:25', '21:25'),
        ('TN',    '10:35', '19:48'),
        ('TEDR',  '05:18', '20:27'),
        ('DRTE',  '05:21', '20:31'),
        ('BAL',   '05:23', '20:33'),
        ('TEX1',  '05:40', '19:47'),
        ('VSM',   '05:40', '20:40'),
        ('TH',    '05:38', '21:20'),
        ('SRINI', '05:58', '21:42'),
        ('TO',    '05:53', '21:15'),
        ('T2R',   '06:10', '10:37'),
        ('TI',    '06:18', '21:08'),
        ('TM',    '08:23', '20:35'),
        ('T2GA',  '08:42', '21:55'),
    ]
    for bus_id, start, end in all_buses_times:
        assignments.append((bus_id, 1, start, end, 90))  # Bagayam → Katpadi Via Polytechnic
        assignments.append((bus_id, 2, start, end, 90))  # Bagayam → Katpadi Via Otteri
        assignments.append((bus_id, 3, start, end, 90))  # Katpadi → Bagayam Via Polytechnic
        assignments.append((bus_id, 4, start, end, 90))  # Katpadi → Bagayam Via Otteri

    cursor.executemany(
        'INSERT INTO bus_route_assignments (bus_id, route_id, start_time, end_time, interval_minutes) VALUES (?, ?, ?, ?, ?)',
        assignments
    )

    # ─── SCHEDULES ────────────────────────────────────────────────────────────
    # Schedules are per-bus only — no route_id.
    # The driver selects the route at trip start; schedule times are the same.
    schedules = []
    def add(bus_id, times):
        for arr, dep in times:
            schedules.append((bus_id, arr, dep))

    add('TA',    [('05:00','05:00'),('06:30','06:30'),('08:00','08:00'),('09:30','09:30'),('11:00','11:00'),('12:30','12:30'),('14:00','14:00'),('15:30','15:30'),('17:00','17:00'),('18:30','18:30'),('20:02','20:02')])
    add('TB',    [('05:05','05:05'),('06:35','06:35'),('08:05','08:05'),('09:35','09:35'),('11:05','11:05'),('12:35','12:35'),('14:05','14:05'),('15:35','15:35'),('17:05','17:05'),('18:35','18:35'),('20:09','20:09')])
    add('TC',    [('05:10','05:10'),('06:40','06:40'),('08:10','08:10'),('09:40','09:40'),('11:10','11:10'),('12:40','12:40'),('14:10','14:10'),('15:40','15:40'),('17:10','17:10'),('18:40','18:40'),('20:16','20:16')])
    add('TD',    [('05:15','05:15'),('06:45','06:45'),('08:15','08:15'),('09:45','09:45'),('11:15','11:15'),('12:45','12:45'),('14:15','14:15'),('15:45','15:45'),('17:15','17:15'),('18:45','18:45'),('20:23','20:23')])
    add('TE',    [('05:20','05:20'),('06:50','06:50'),('08:20','08:20'),('09:50','09:50'),('11:20','11:20'),('12:50','12:50'),('14:20','14:20'),('15:50','15:50'),('17:20','17:20'),('18:50','18:50'),('20:30','20:30')])
    add('AAA',    [('05:23','05:23'),('06:53','06:53'),('08:23','08:23'),('09:53','09:53'),('11:23','11:23'),('12:53','12:53'),('14:23','14:23'),('15:53','15:53'),('17:23','17:23'),('18:53','18:53'),('20:33','20:33')])
    add('TF',    [('05:25','05:33'),('07:03','07:07'),('08:37','08:39'),('10:22','10:22'),('11:53','12:03'),('13:42','13:42'),('15:22','15:24'),('16:54','16:54'),('18:24','18:24'),('21:24','21:24')])
    add('SABS',    [('05:30','05:30'),('07:00','07:00'),('08:30','08:30'),('10:00','10:00'),('11:30','11:30'),('13:00','13:00'),('14:30','14:30'),('16:00','16:00'),('17:30','17:30'),('19:00','19:00'),('20:30','20:30')])
    add('SKBS',    [('05:35','05:35'),('07:05','07:05'),('08:35','08:35'),('10:05','10:05'),('11:35','11:35'),('13:05','13:05'),('14:35','14:35'),('16:05','16:05'),('17:35','17:35'),('19:05','19:05'),('20:35','20:35')])
    add('TG',    [('05:40','05:43'),('09:47','09:52'),('11:23','11:23'),('14:41','14:59'),('18:57','18:57'),('20:27','20:27')])
    add('SKS',    [('05:45','05:45'),('07:15','07:15'),('08:45','08:45'),('10:15','10:15'),('11:45','11:45'),('13:15','13:15'),('14:45','14:45'),('16:15','16:15'),('17:45','17:45'),('19:15','19:15'),('20:45','20:45')])
    add('SLSMT',    [('05:50','05:50'),('07:20','07:20'),('08:50','08:50'),('10:20','10:20'),('11:50','11:50'),('13:20','13:20'),('14:50','14:50'),('16:20','16:20'),('17:50','17:50'),('19:20','19:20'),('20:50','20:50')])
    add('LKM',    [('05:55','05:55'),('07:25','07:25'),('08:55','08:55'),('10:25','10:25'),('11:55','11:55'),('13:25','13:25'),('14:55','14:55'),('16:25','16:25'),('17:55','17:55'),('19:25','19:25'),('20:55','20:55')])
    add('VGT',    [('06:00','06:00'),('07:30','07:30'),('09:00','09:00'),('10:30','10:30'),('12:00','12:00'),('13:30','13:30'),('15:00','15:00'),('16:30','16:30'),('18:00','18:00'),('19:30','19:30'),('21:00','21:00')])
    add('DVGT',    [('06:05','06:05'),('07:35','07:35'),('09:05','09:05'),('10:35','10:35'),('12:05','12:05'),('13:35','13:35'),('15:05','15:05'),('16:35','16:35'),('18:05','18:05'),('19:35','19:35'),('21:05','21:05')])
    add('SRI',    [('06:10','06:10'),('07:40','07:40'),('09:10','09:10'),('10:40','10:40'),('12:10','12:10'),('13:40','13:40'),('15:10','15:10'),('16:40','16:40'),('18:10','18:10'),('19:40','19:40'),('21:10','21:10')])
    add('DEVI',    [('06:15','06:15'),('07:45','07:45'),('09:15','09:15'),('10:45','10:45'),('12:15','12:15'),('13:45','13:45'),('15:15','15:15'),('16:45','16:45'),('18:15','18:15'),('19:45','19:45'),('21:15','21:15')])
    add('TKT',    [('06:20','06:20'),('07:50','07:50'),('09:20','09:20'),('10:50','10:50'),('12:20','12:20'),('13:50','13:50'),('15:20','15:20'),('16:50','16:50'),('18:20','18:20'),('19:50','19:50'),('21:20','21:20')])
    add('SKMS',    [('06:25','06:25'),('07:55','07:55'),('09:25','09:25'),('10:55','10:55'),('12:25','12:25'),('13:55','13:55'),('15:25','15:25'),('16:55','16:55'),('18:25','18:25'),('19:55','19:55'),('21:25','21:25')])
    add('TN',    [('10:35','10:49'),('13:49','13:49'),('15:19','15:19'),('16:49','16:49'),('19:48','19:48')])

    # Route 2
    add('TEDR',    [('05:18','05:18'),('06:48','06:48'),('08:18','08:18'),('09:48','09:48'),('11:18','11:18'),('12:48','12:48'),('14:18','14:18'),('15:48','15:48'),('17:18','17:18'),('18:48','18:48'),('20:27','20:27')])
    add('DRTE',    [('05:21','05:21'),('06:51','06:51'),('08:21','08:21'),('09:51','09:51'),('11:21','11:21'),('12:51','12:51'),('14:21','14:21'),('15:51','15:51'),('17:21','17:21'),('18:51','18:51'),('20:31','20:31')])
    add('BAL',    [('05:23','05:23'),('06:53','06:53'),('08:23','08:23'),('09:53','09:53'),('11:23','11:23'),('12:53','12:53'),('14:23','14:23'),('15:53','15:53'),('17:23','17:23'),('18:53','18:53'),('20:33','20:33')])
    add('TEX1',    [('05:40','05:42'),('06:53','06:54'),('09:28','09:29'),('10:51','10:51'),('12:01','12:42'),('13:52','13:52'),('15:16','15:16'),('16:47','16:47'),('18:01','18:01'),('19:47','19:47')])
    add('VSM',    [('05:40','05:40'),('07:10','07:10'),('08:40','08:40'),('10:10','10:10'),('11:40','11:40'),('13:10','13:10'),('14:40','14:40'),('16:10','16:10'),('17:40','17:40'),('19:10','19:10'),('20:40','20:40')])
    add('TH',    [('05:38','05:48'),('07:19','07:19'),('10:38','10:38'),('14:28','14:28'),('19:38','19:38'),('21:18','21:20')])
    add('SRINI',    [('05:58','05:58'),('07:53','07:53'),('09:28','09:28'),('11:13','11:13'),('12:58','12:58'),('14:43','14:43'),('16:28','16:28'),('18:18','18:18'),('19:58','19:58'),('21:42','21:42')])
    add('TO',    [('05:53','06:08'),('13:03','13:08'),('14:38','14:38'),('16:08','16:12'),('17:48','17:49'),('19:22','19:33'),('21:12','21:15')])
    add('T2R',    [('06:10','06:12'),('10:32','10:37')])
    add('TI',    [('06:18','06:18'),('07:49','07:49'),('10:02','10:08'),('11:47','11:47'),('13:17','13:17'),('14:47','14:47'),('16:17','16:17'),('17:46','17:46'),('19:17','19:17'),('21:08','21:08')])
    add('TM',    [('08:23','08:23'),('09:53','09:54'),('11:22','11:22'),('14:22','14:22'),('15:52','15:52'),('17:22','17:22'),('18:52','18:52'),('20:22','20:35')])
    add('T2GA',    [('08:42','08:47'),('13:17','13:27'),('17:47','17:52'),('19:47','19:52'),('21:52','21:55')])

    cursor.executemany(
        'INSERT INTO bus_schedules (bus_id, arrival, departure) VALUES (?, ?, ?)',
        schedules
    )

    # ─── COMPATIBILITY VIEW ───────────────────────────────────────────────────
    # Makes buses appear to have route_id/start_time/end_time so all existing
    # app.py queries work with zero changes.
    # When a bus runs both routes it appears once per route in this view.
    cursor.execute("DROP VIEW IF EXISTS buses_with_route")
    cursor.execute("""
        CREATE VIEW buses_with_route AS
        SELECT
            b.id,
            b.bus_id,
            b.bus_name,
            b.bus_number,
            a.route_id,
            a.start_time,
            a.end_time,
            a.interval_minutes
        FROM buses b
        JOIN bus_route_assignments a ON b.bus_id = a.bus_id
    """)

    conn.commit()
    conn.close()
    print("[SUCCESS] Database initialised — schema and data refreshed.")

if __name__ == '__main__':
    init_db()
