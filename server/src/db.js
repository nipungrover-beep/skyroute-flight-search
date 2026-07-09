import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbPath() {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, 'flights.sqlite');
}

export const db = new DatabaseSync(resolveDbPath());

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS airports (
      code TEXT PRIMARY KEY,
      city TEXT NOT NULL,
      name TEXT NOT NULL,
      state TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flight_number TEXT NOT NULL,
      airline TEXT NOT NULL,
      from_code TEXT NOT NULL REFERENCES airports(code),
      to_code TEXT NOT NULL REFERENCES airports(code),
      depart_time TEXT NOT NULL,
      arrive_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      stops INTEGER NOT NULL DEFAULT 0,
      price_economy INTEGER NOT NULL,
      price_business INTEGER NOT NULL,
      seats_economy INTEGER NOT NULL,
      seats_business INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_flights_route ON flights(from_code, to_code);

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL UNIQUE,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );
  `);
}
