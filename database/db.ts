import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the database directory exists
const DB_DIR = path.join(path.resolve(__dirname, ".."), "data");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, "workspaces.db");
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(DB_PATH);

// Promisify database methods
const runAsync = (sql: string, params: any[] = []) => {
  return new Promise<RunResult>((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const allAsync = (sql: string, params: any[] = []) => {
  return new Promise<any[]>((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

const getAsync = (sql: string, params: any[] = []) => {
  return new Promise<any>((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

// Initialize database tables
function initDatabase() {
  // Create workspaces table
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create chat_history table
    db.run(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
      )
    `);
  });
}

// Initialize the database
initDatabase();

// Define types for database operations
export interface RunResult {
  lastID: number;
  changes: number;
}

// Create a wrapper to provide similar API to better-sqlite3
const dbWrapper = {
  prepare: (sql: string) => {
    return {
      run: (...params: any[]): Promise<RunResult> =>
        runAsync(sql, ...params) as Promise<RunResult>,
      all: (...params: any[]): Promise<any[]> =>
        allAsync(sql, ...params) as Promise<any[]>,
      get: (...params: any[]): Promise<any> => getAsync(sql, ...params),
    };
  },
  exec: (sql: string): Promise<void> => runAsync(sql).then(() => {}),
};

export { dbWrapper as db };
