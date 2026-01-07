import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

let _db = null

export function getDb(){
  if(!_db) throw new Error('DB not initialized')
  return _db
}

async function ensureColumn(db, table, colName, colDefSql){
  const info = await db.all(`PRAGMA table_info(${table})`)
  const exists = info.some(c => c.name === colName)
  if(!exists){
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDefSql}`)
  }
}

export async function initDb(dbPath){
  _db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  })

  await _db.exec(`PRAGMA foreign_keys=ON;`)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS creators (
      uid TEXT PRIMARY KEY,
      avatar_url TEXT,
      created_at TEXT
    );
  `)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS artworks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      uploader_name TEXT,
      uploader_uid TEXT,
      source_type TEXT,
      content_type TEXT,
      tags_json TEXT,
      tags_norm TEXT,
      origin_url TEXT,
      file_path TEXT,
      file_path_original TEXT, 
      status TEXT,
      review_note TEXT,
      reviewed_at TEXT,
      created_at TEXT,
      licenses_json TEXT,
      like_total INTEGER DEFAULT 0,
      images_json TEXT -- 新增：存储多张图片的 JSON 数组
    );
  `)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS points_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT,
      artwork_id INTEGER,
      points INTEGER,
      note TEXT,
      created_at TEXT,
      granted_at TEXT
    );
  `)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artwork_id INTEGER,
      anon_id TEXT,
      user_name TEXT,
      avatar_key INTEGER,
      body TEXT,
      like_total INTEGER DEFAULT 0,
      created_at TEXT,
      status TEXT DEFAULT 'public'
    );
  `)
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_art ON comments(artwork_id, datetime(created_at));`)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS likes_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anon_id TEXT,
      target_type TEXT,
      target_id INTEGER,
      day TEXT,
      count INTEGER,
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(anon_id, target_type, target_id, day)
    );
  `)
  await _db.exec(`CREATE INDEX IF NOT EXISTS idx_likes_target ON likes_daily(target_type, target_id, day);`)

  await _db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_code_hash TEXT UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at TEXT
    );
  `)

  // 自动补齐缺列
  await ensureColumn(_db, 'artworks', 'licenses_json', 'licenses_json TEXT')
  await ensureColumn(_db, 'artworks', 'like_total', 'like_total INTEGER DEFAULT 0')
  await ensureColumn(_db, 'artworks', 'reviewed_at', 'reviewed_at TEXT')
  await ensureColumn(_db, 'artworks', 'file_path_original', 'file_path_original TEXT')
  
  // 新增：多图存储字段
  await ensureColumn(_db, 'artworks', 'images_json', 'images_json TEXT')

  await ensureColumn(_db, 'comments', 'anon_id', 'anon_id TEXT')
  await ensureColumn(_db, 'comments', 'like_total', 'like_total INTEGER DEFAULT 0')
  await ensureColumn(_db, 'comments', 'status', "status TEXT DEFAULT 'public'")

  await ensureColumn(_db, 'members', 'is_active', 'is_active INTEGER DEFAULT 1')
  await ensureColumn(_db, 'members', 'created_at', 'created_at TEXT')

  return _db
}