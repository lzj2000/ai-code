import path from 'node:path'
import process from 'node:process'
import Database from 'better-sqlite3'

// 在 Vercel 环境下使用 /tmp 目录，否则使用当前目录
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'chat_history.db')
  : path.resolve(process.cwd(), 'chat_history.db')

// 确保目录存在（对于 /tmp）
// 注意：better-sqlite3 会自动创建文件，但不会创建父目录（/tmp 通常已存在）

const db = new Database(dbPath)

// 初始化 sessions 表
export function initSessionTable() {
  db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`).run()
}

export function createSession(id: string, name: string) {
  db.prepare('INSERT INTO sessions (id, name) VALUES (?, ?)').run(id, name)
}

export function getAllSessions() {
  return db.prepare('SELECT id, name, created_at FROM sessions ORDER BY created_at DESC').all()
}

export function updateSessionName(id: string, name: string) {
  db.prepare('UPDATE sessions SET name = ? WHERE id = ?').run(name, id)
}

export function deleteSession(id: string) {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

export default db
