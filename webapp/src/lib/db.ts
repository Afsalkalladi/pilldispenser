import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'dispenser.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDb(db);
  }
  return db;
}

function initializeDb(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schedules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      hour        INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
      minute      INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 59),
      tray_a      INTEGER NOT NULL DEFAULT 0 CHECK (tray_a >= 0),
      tray_b      INTEGER NOT NULL DEFAULT 0 CHECK (tray_b >= 0),
      tray_c      INTEGER NOT NULL DEFAULT 0 CHECK (tray_c >= 0),
      tray_d      INTEGER NOT NULL DEFAULT 0 CHECK (tray_d >= 0),
      enabled     INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trays (
      id              TEXT PRIMARY KEY CHECK (id IN ('A','B','C','D')),
      label           TEXT NOT NULL,
      pill_count      INTEGER NOT NULL DEFAULT 30,
      capacity        INTEGER NOT NULL DEFAULT 30,
      low_threshold   INTEGER NOT NULL DEFAULT 5,
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dispense_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
      tray_a      INTEGER NOT NULL DEFAULT 0,
      tray_b      INTEGER NOT NULL DEFAULT 0,
      tray_c      INTEGER NOT NULL DEFAULT 0,
      tray_d      INTEGER NOT NULL DEFAULT 0,
      success     INTEGER NOT NULL,
      dispensed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vitals_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      heart_rate  INTEGER NOT NULL,
      spo2        INTEGER NOT NULL,
      safe        INTEGER NOT NULL,
      read_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT NOT NULL CHECK (type IN (
                    'vitals_unsafe','dispense_failure',
                    'sensor_error','tray_low','device_blocked'
                  )),
      message     TEXT NOT NULL,
      severity    TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS device_state (
      id                  INTEGER PRIMARY KEY CHECK (id = 1),
      state               TEXT NOT NULL DEFAULT 'STANDBY',
      device_time         TEXT NOT NULL DEFAULT (datetime('now')),
      state_entered_at    TEXT NOT NULL DEFAULT (datetime('now')),
      pending_schedule_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed trays if empty
  const trayCount = database.prepare('SELECT COUNT(*) as count FROM trays').get() as { count: number };
  if (trayCount.count === 0) {
    const insertTray = database.prepare(
      'INSERT INTO trays (id, label, pill_count, capacity, low_threshold) VALUES (?, ?, ?, ?, ?)'
    );
    insertTray.run('A', 'Tray A', 30, 30, 5);
    insertTray.run('B', 'Tray B', 30, 30, 5);
    insertTray.run('C', 'Tray C', 30, 30, 5);
    insertTray.run('D', 'Tray D', 30, 30, 5);
  }

  // Seed device state if empty
  const stateCount = database.prepare('SELECT COUNT(*) as count FROM device_state').get() as { count: number };
  if (stateCount.count === 0) {
    database.prepare(
      "INSERT INTO device_state (id, state, device_time, state_entered_at) VALUES (1, 'STANDBY', datetime('now'), datetime('now'))"
    ).run();
  }

  // Seed example schedules if empty
  const schedCount = database.prepare('SELECT COUNT(*) as count FROM schedules').get() as { count: number };
  if (schedCount.count === 0) {
    const insertSched = database.prepare(
      'INSERT INTO schedules (hour, minute, tray_a, tray_b, tray_c, tray_d) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertSched.run(8, 0, 2, 0, 1, 0);
    insertSched.run(14, 0, 0, 1, 0, 0);
    insertSched.run(20, 0, 1, 0, 0, 1);
  }
}
