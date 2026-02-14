import 'dotenv/config'
import express from 'express'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { initDb, getDb } from './db.js'
import { checkText, checkImage } from './ai.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_PORT = Number(process.env.API_PORT || 15454)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite')
const COOKIE_NAME = 'haruhi_anon'
const COOKIE_SIG = 'haruhi_anon_sig'
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'dev-cookie-secret-change-me'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'CHANGE_THIS_PASSWORD_IN_ENV'

function b64url(buf) {
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function sign(val) {
  return b64url(crypto.createHmac('sha256', COOKIE_SECRET).update(String(val)).digest())
}
function parseCookies(header) {
  const out = {}
  const s = String(header || '')
  if (!s) return out
  const parts = s.split(';')
  for (const p of parts) {
    const i = p.indexOf('=')
    if (i < 0) continue
    const k = p.slice(0, i).trim()
    const v = p.slice(i + 1).trim()
    if (!k) continue
    out[k] = decodeURIComponent(v)
  }
  return out
}
function setAnonCookie(res, id) {
  const sig = sign(id)
  const common = `Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${encodeURIComponent(id)}; ${common}`,
    `${COOKIE_SIG}=${encodeURIComponent(sig)}; ${common}`
  ])
}
function clampInt(v, min, max, d) {
  const n = Number(v)
  if (!Number.isFinite(n)) return d
  return Math.max(min, Math.min(max, Math.floor(n)))
}
function safeText(v) { return String(v ?? '').trim() }
function safeJsonArr(s) {
  try {
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
function makeTagsNorm(tags) {
  const norm = (tags || []).map(t => String(t).toLowerCase()).join(' ')
  return norm ? ` ${norm} ` : ''
}
function normalizeTagsToArray(s) {
  const raw = String(s || '').trim()
  if (!raw) return []
  const parts = raw.split(/[\s,，]+/g).map(x => x.trim()).filter(Boolean)
  const out = []
  const seen = new Set()
  for (const t0 of parts) {
    const t = t0.startsWith('#') ? t0.slice(1).trim() : t0
    const k = t.toLowerCase()
    if (!t) continue
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}
function parseLicenses(raw) {
  const s = String(raw || '').trim()
  if (!s) return []
  try {
    const arr = JSON.parse(s)
    return Array.isArray(arr) ? arr.map(x => String(x).trim()).filter(Boolean) : []
  } catch {
    return []
  }
}

// 映射函数：处理单图和多图逻辑
function mapArtworkRow(r) {
  let images = safeJsonArr(r.images_json)

  if (images.length === 0 && r.file_path) {
    images = [{
      image_url: `uploads/${r.file_path}`,
      original_url: r.file_path_original ? `uploads/${r.file_path_original}` : `uploads/${r.file_path}`
    }]
  } else {
    images = images.map(img => ({
      image_url: img.path ? `uploads/${img.path}` : '',
      original_url: img.original ? `uploads/${img.original}` : (img.path ? `uploads/${img.path}` : '')
    }))
  }

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    uploader_name: r.uploader_name,
    uploader_uid: r.uploader_uid,
    uploader_avatar: r.uploader_avatar || '',
    source_type: r.source_type,
    content_type: r.content_type,
    tags: safeJsonArr(r.tags_json),
    licenses: safeJsonArr(r.licenses_json),
    origin_url: r.origin_url,
    created_at: r.created_at,
    reviewed_at: r.reviewed_at || null,
    review_note: r.review_note || '',
    status: r.status,
    like_total: Number(r.like_total || 0),
    image_url: r.file_path ? `uploads/${r.file_path}` : (images[0]?.image_url || ''),
    original_url: r.file_path_original ? `uploads/${r.file_path_original}` : (images[0]?.original_url || ''),
    images: images,
    ai_reason: r.ai_reason || ''
  }
}

function clampLen(s, m) { return String(s || '').slice(0, m) }

// --- multer setup ---
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const d = new Date()
    const folder = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const dir = path.join(uploadsDir, folder)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin'
    const safe = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
    cb(null, safe)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
})

const uploadFields = upload.fields([
  { name: 'images', maxCount: 20 },
  { name: 'originals', maxCount: 20 }
])

const avatarUpload = upload.single('avatar')

// --- express app setup ---
const app = express()

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin) {
    const ok = /^https?:\/\/localhost(:\d+)?$/.test(origin) || /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
    if (ok) {
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
      if (req.method === 'OPTIONS') return res.status(204).end()
    }
  }
  next()
})

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.use((req, res, next) => {
  const c = parseCookies(req.headers.cookie || '')
  let id = c[COOKIE_NAME]
  const sig = c[COOKIE_SIG]
  const ok = id && sig && sign(id) === sig
  if (!ok) {
    id = crypto.randomUUID()
    setAnonCookie(res, id)
  }
  req.anonId = id
  next()
})

app.use('/api/uploads', express.static(uploadsDir))

app.get('/api/health', (req, res) => res.json({ ok: true }))

// 1. 积分排行榜
app.get('/api/points/leaderboard', async (req, res) => {
  const db = getDb()
  const page = clampInt(req.query.page, 1, 100, 1)
  const pageSize = 10
  const offset = (page - 1) * pageSize

  const rows = await db.all(`
    SELECT pl.uid, SUM(pl.points) as total, c.avatar_url
    FROM points_ledger pl
    LEFT JOIN creators c ON c.uid = pl.uid
    GROUP BY pl.uid
    ORDER BY total DESC
    LIMIT ? OFFSET ?
  `, [pageSize, offset])

  res.json({ ok: true, data: rows })
})

// 2. 积分查询
app.get('/api/points/history', async (req, res) => {
  const db = getDb()
  const uid = String(req.query.uid || '').trim()
  if (!uid) return res.json({ ok: false, message: 'Missing uid' })

  const totalRow = await db.get(`SELECT SUM(points) as total FROM points_ledger WHERE uid=?`, [uid])
  const total = Number(totalRow?.total || 0)

  const history = await db.all(`
    SELECT pl.points, pl.note, pl.created_at, a.title as artwork_title
    FROM points_ledger pl
    LEFT JOIN artworks a ON a.id = pl.artwork_id
    WHERE pl.uid=?
    ORDER BY datetime(pl.created_at) DESC
    LIMIT 50
  `, [uid])

  const creator = await db.get(`SELECT uid, avatar_url FROM creators WHERE uid=?`, [uid])

  res.json({ ok: true, total, history, creator })
})

// 3. 创作者模糊搜索
app.get('/api/creators/search', async (req, res) => {
  const db = getDb()
  const q = String(req.query.q || '').trim()
  if (!q) return res.json({ ok: true, data: [] })

  const like = `%${q}%`
  const rows = await db.all(`
    SELECT uid, avatar_url FROM creators
    WHERE uid LIKE ?
    LIMIT 8
  `, [like])

  res.json({ ok: true, data: rows })
})

app.get('/api/artworks', async (req, res) => {
  const db = getDb()
  const status = String(req.query.status || 'approved')
  const content_type = String(req.query.content_type || 'all')
  const source_type = String(req.query.source_type || 'all')
  const uploader_uid = String(req.query.uploader_uid || '').trim()

  const sort = String(req.query.sort || 'time')

  const qRaw = String(req.query.q || '').trim()
  const searchField = String(req.query.searchField || 'all')
  const page = clampInt(req.query.page, 1, 9999, 1)
  const pageSize = clampInt(req.query.pageSize, 6, 60, 24)

  const params = []
  let where = `WHERE 1=1`

  if (status !== 'all') {
    where += ` AND a.status=?`
    params.push(status)
  }
  if (content_type !== 'all') {
    where += ` AND a.content_type=?`;
    params.push(content_type)
  }
  if (source_type !== 'all' && source_type !== 'balanced') {
    where += ` AND a.source_type=?`;
    params.push(source_type)
  }
  if (uploader_uid) {
    where += ` AND a.uploader_uid=?`;
    params.push(uploader_uid)
  }

  if (qRaw) {
    const qLower = qRaw.toLowerCase()
    const like = `%${qLower.replace(/[%_]/g, '')}%`

    if (searchField === 'title') {
      where += ` AND a.title LIKE ?`
      params.push(like)
    } else if (searchField === 'uid') {
      where += ` AND (a.uploader_uid LIKE ? OR a.uploader_name LIKE ?)`
      params.push(like, like)
    } else if (searchField === 'tag') {
      where += ` AND a.tags_norm LIKE ?`
      params.push(like)
    } else {
      where += ` AND (
        a.title LIKE ? OR
        a.description LIKE ? OR
        a.tags_norm LIKE ? OR
        a.uploader_uid LIKE ? OR
        a.uploader_name LIKE ?
      )`
      params.push(like, like, like, like, like)
    }
  }

  const totalRow = await db.get(`SELECT COUNT(1) AS c FROM artworks a ${where}`, params)
  const total = Number(totalRow?.c || 0)

  const offset = (page - 1) * pageSize

  let orderBy = `ORDER BY datetime(a.created_at) DESC, a.id DESC`
  const orderParams = []
  let seedUsed = null

  if (sort === 'likes') {
    orderBy = `ORDER BY COALESCE(a.like_total,0) DESC, datetime(a.created_at) DESC, a.id DESC`
  } else if (sort === 'time') {
    orderBy = `ORDER BY datetime(a.created_at) DESC, a.id DESC`
  } else if (sort === 'random') {
    const seedQ = req.query.seed
    if (seedQ !== undefined && seedQ !== null && String(seedQ).trim() !== '') {
      seedUsed = clampInt(seedQ, 0, 2147483647, 0)
    } else {
      const anonId = String(req.anonId || '0')
      const seedBuf = crypto.createHash('sha256').update(anonId).digest()
      seedUsed = (seedBuf.readUInt32LE(0) >>> 0) & 0x7fffffff
    }
    orderBy = `ORDER BY ((a.id + ?) * 1103515245) % 2147483647 ASC, a.id ASC`
    orderParams.push(seedUsed)
  }

  const rows = await db.all(
    `SELECT a.*, c.avatar_url AS uploader_avatar
     FROM artworks a
     LEFT JOIN creators c ON a.uploader_uid = c.uid
     ${where}
     ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, ...orderParams, pageSize, offset]
  )

  res.json({
    ok: true,
    data: rows.map(mapArtworkRow),
    total,
    sortUsed: sort,
    seedUsed,
    debugId: Date.now()
  })
})

app.get('/api/artworks/:id', async (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, message: 'Invalid ID' })

  const row = await db.get(
    `SELECT a.*, c.avatar_url AS uploader_avatar
     FROM artworks a
     LEFT JOIN creators c ON a.uploader_uid = c.uid
     WHERE a.id = ?`,
    [id]
  )

  if (!row) return res.status(404).json({ ok: false, message: 'Artwork not found' })

  if (row.status !== 'approved' && row.uploader_uid !== req.anonId) {
    return res.status(404).json({ ok: false, message: 'Artwork not found or restricted' })
  }

  res.json({ ok: true, data: mapArtworkRow(row) })
})

app.post('/api/artworks', uploadFields, async (req, res) => {
  const db = getDb()

  const displayFiles = req.files?.['images'] || []
  const originalFiles = req.files?.['originals'] || []

  if (displayFiles.length === 0) {
    return res.status(400).json({ ok: false, message: '缺少图片文件' })
  }

  const imagesList = []
  for (let i = 0; i < displayFiles.length; i++) {
    const disp = displayFiles[i]
    const orig = originalFiles[i] || disp

    const relDisp = path.relative(uploadsDir, disp.path).replace(/\\/g, '/')
    const relOrig = path.relative(uploadsDir, orig.path).replace(/\\/g, '/')

    imagesList.push({
      path: relDisp,
      original: relOrig
    })
  }

  const coverImage = imagesList[0]
  const imagesJson = JSON.stringify(imagesList)

  const title = safeText(req.body?.title)
  const description = safeText(req.body?.description)
  const uploader_name = safeText(req.body?.uploader_name)
  const uploader_uid = safeText(req.body?.uploader_uid)
  const source_type = safeText(req.body?.source_type) || 'network'
  const content_type = safeText(req.body?.content_type) || 'haruhi'
  const origin_url = safeText(req.body?.origin_url)

  if (!title) return res.status(400).json({ ok: false, message: '作品名称为必填' })

  const textCheck = await checkText(`${title}\n${description}`)
  const imageCheck = await checkImage(path.join(uploadsDir, coverImage.path))

  let finalStatus = 'approved'
  const aiReason = []

  if (!textCheck.safe) {
    finalStatus = 'flagged'
    aiReason.push(`文本: ${textCheck.reason}`)
  } else if (textCheck.reason === 'AI_API_ERROR' || textCheck.reason === 'AI_OFFLINE') {
    finalStatus = 'pending'
    aiReason.push('AI文本服务异常')
  }

  if (finalStatus !== 'flagged') {
    if (!imageCheck.safe) {
      finalStatus = 'flagged'
      aiReason.push(`封面图: ${imageCheck.reason}`)
    } else if (imageCheck.reason === 'AI_API_ERROR' || imageCheck.reason === 'AI_OFFLINE') {
      if (finalStatus === 'approved') finalStatus = 'pending'
      aiReason.push('AI视觉服务异常')
    }
  }

  const tagsArr = normalizeTagsToArray(req.body?.tags)
  const tags_json = JSON.stringify(tagsArr)
  const tags_norm = makeTagsNorm(tagsArr)
  const licensesArr = parseLicenses(req.body?.licenses)
  const licenses_json = JSON.stringify(licensesArr)

  const created_at = new Date().toISOString()
  const review_note = aiReason.join('; ')
  const reviewed_at = finalStatus === 'approved' ? created_at : null

  const result = await db.run(
    `INSERT INTO artworks
      (title, description, uploader_name, uploader_uid, source_type, content_type, tags_json, tags_norm, origin_url,
       file_path, file_path_original, status, review_note, reviewed_at, created_at, licenses_json, ai_reason, images_json)
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, uploader_name || null, uploader_uid || null, source_type, content_type, tags_json, tags_norm,
      origin_url || null, coverImage.path, coverImage.original, finalStatus, review_note, reviewed_at, created_at, licenses_json, review_note, imagesJson]
  )

  let pointsAdded = false
  if (finalStatus === 'approved' && source_type === 'personal' && uploader_uid) {
    let points = 0
    let note = ''
    if (content_type === 'haruhi') { points = 120; note = '投稿凉宫个人作品奖励' }
    else { points = 30; note = '投稿其他个人作品奖励' }

    if (points > 0) {
      try {
        await db.run(
          `INSERT INTO points_ledger(uid, artwork_id, points, note, created_at, granted_at) VALUES(?,?,?,?,?,?)`,
          [uploader_uid, result.lastID, points, note, created_at, created_at]
        )
        pointsAdded = true
      } catch (e) {
        console.error('Auto grant points failed:', e)
      }
    }
  }

  res.json({
    ok: true,
    status: finalStatus,
    pointsAdded,
    message: finalStatus === 'approved' ? '发布成功' : '提交成功，待审核'
  })
})

app.get('/api/creators/verify', async (req, res) => {
  const db = getDb()
  const uid = String(req.query.uid || '').trim()
  if (!uid) return res.json({ ok: true, exists: false })
  const row = await db.get(`SELECT uid, avatar_url FROM creators WHERE uid=?`, [uid])
  res.json({ ok: true, exists: !!row, creator: row || null })
})

app.get('/api/comments', async (req, res) => {
  const db = getDb()
  const artworkId = Number(req.query.artwork_id)
  if (!Number.isFinite(artworkId)) return res.status(400).json({ ok: false, message: 'artwork_id 无效' })
  const rows = await db.all(
    `SELECT id, artwork_id, user_name, avatar_key, body, like_total, created_at
     FROM comments
     WHERE artwork_id=? AND status='public'
     ORDER BY datetime(created_at) ASC`,
    [artworkId]
  )
  res.json({ ok: true, data: rows })
})

app.post('/api/comments', async (req, res) => {
  const db = getDb()
  const anonId = req.anonId || ''
  const artwork_id = Number(req.body?.artwork_id)
  const user_name = clampLen(req.body?.user_name, 24)
  const body = clampLen(req.body?.body, 800)

  if (!Number.isFinite(artwork_id)) return res.status(400).json({ ok: false, message: 'artwork_id 无效' })
  if (!user_name || !body) return res.status(400).json({ ok: false, message: '必填项缺失' })

  const check = await checkText(`${user_name}: ${body}`)
  let status = 'public'
  let aiReason = ''

  if (!check.safe) {
    status = 'flagged'
    aiReason = check.reason
  } else if (check.reason === 'AI_API_ERROR' || check.reason === 'AI_OFFLINE') {
    status = 'flagged'
    aiReason = 'AI服务不可用，转人工'
  }

  const avatar_key = crypto.randomInt(1, 13)
  const created_at = new Date().toISOString()

  const r = await db.run(
    `INSERT INTO comments(artwork_id, anon_id, user_name, avatar_key, body, like_total, created_at, status, ai_reason)
     VALUES(?,?,?,?,?,0,?,?,?)`,
    [artwork_id, anonId, user_name, avatar_key, body, created_at, status, aiReason]
  )

  if (status !== 'public') res.json({ ok: true, message: '评论包含敏感内容或需复核，已转入人工审核', flagged: true })
  else res.json({ ok: true, data: { id: r.lastID, artwork_id, user_name, avatar_key, body, like_total: 0, created_at } })
})

async function likeTarget({ db, anonId, targetType, targetId }) {
  const day = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()
  await db.exec('BEGIN')
  try {
    const table = targetType === 'artwork' ? 'artworks' : 'comments'
    const exists = await db.get(`SELECT id FROM ${table} WHERE id=?`, [targetId])
    if (!exists) { await db.exec('ROLLBACK'); return { status: 404, body: { ok: false } } }

    const row = await db.get(
      `SELECT id, count FROM likes_daily WHERE anon_id=? AND target_type=? AND target_id=? AND day=?`,
      [anonId, targetType, targetId, day]
    )
    const used = Number(row?.count || 0)
    if (used >= 10) { await db.exec('ROLLBACK'); return { status: 429, body: { ok: false, message: '上限' } } }

    if (row) await db.run(`UPDATE likes_daily SET count=count+1, updated_at=? WHERE id=?`, [now, row.id])
    else await db.run(
      `INSERT INTO likes_daily(anon_id, target_type, target_id, day, count, created_at, updated_at)
       VALUES(?,?,?,?,1,?,?)`,
      [anonId, targetType, targetId, day, now, now]
    )

    await db.run(`UPDATE ${table} SET like_total=COALESCE(like_total,0)+1 WHERE id=?`, [targetId])
    const updated = await db.get(`SELECT like_total FROM ${table} WHERE id=?`, [targetId])
    await db.exec('COMMIT')
    return { status: 200, body: { ok: true, totalLikes: Number(updated?.like_total || 0) } }
  } catch {
    await db.exec('ROLLBACK')
    return { status: 500, body: { ok: false } }
  }
}

app.post('/api/likes/artwork/:id', async (req, res) => {
  const out = await likeTarget({ db: getDb(), anonId: req.anonId, targetType: 'artwork', targetId: Number(req.params.id) })
  res.status(out.status).json(out.body)
})
app.post('/api/likes/comment/:id', async (req, res) => {
  const out = await likeTarget({ db: getDb(), anonId: req.anonId, targetType: 'comment', targetId: Number(req.params.id) })
  res.status(out.status).json(out.body)
})

// === 管理员中间件 ===
function requireAdmin(req, res, next) {
  const expected = String(ADMIN_PASSWORD || '').trim()
  if (!expected) return res.status(500).json({ ok: false, message: 'Server configuration error' })
  if ((req.header('x-admin-password') || '') !== expected) return res.status(401).json({ ok: false })
  next()
}

app.post('/api/admin/verify', (req, res) => {
  const input = String(req.body.password || '').trim()
  const expected = String(ADMIN_PASSWORD || '').trim()
  if (!expected) return res.status(500).json({ ok: false, message: 'Server admin password not configured' })
  if (input === expected) {
    res.json({ ok: true })
  } else {
    res.status(401).json({ ok: false, message: 'Invalid password' })
  }
})

// Admin API
app.get('/api/admin/pending-artworks', requireAdmin, async (req, res) => {
  const db = getDb()
  const rows = await db.all(
    `SELECT a.*, c.avatar_url AS uploader_avatar
     FROM artworks a
     LEFT JOIN creators c ON c.uid=a.uploader_uid
     WHERE a.status IN ('pending', 'flagged')
     ORDER BY datetime(a.created_at) DESC`
  )
  res.json({ ok: true, data: rows.map(mapArtworkRow) })
})

app.get('/api/admin/audit-history', requireAdmin, async (req, res) => {
  const db = getDb()
  const rows = await db.all(
    `SELECT a.*, c.avatar_url AS uploader_avatar
     FROM artworks a
     LEFT JOIN creators c ON c.uid=a.uploader_uid
     WHERE a.status IN ('approved', 'rejected', 'hidden')
     ORDER BY datetime(a.reviewed_at) DESC, datetime(a.created_at) DESC
     LIMIT 500`
  )
  res.json({ ok: true, data: rows.map(mapArtworkRow) })
})

app.post('/api/admin/artworks/:id/approve', requireAdmin, async (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const note = String(req.body?.note || '').trim()
  const now = new Date().toISOString()
  const art = await db.get(`SELECT * FROM artworks WHERE id=?`, [id])
  if (!art) return res.status(404).json({ ok: false })
  await db.run(`UPDATE artworks SET status='approved', review_note=?, reviewed_at=? WHERE id=?`, [note, now, id])
  if (art.source_type === 'personal' && art.uploader_uid) {
    const exists = await db.get(`SELECT 1 FROM points_ledger WHERE artwork_id=?`, [id])
    if (!exists) {
      let points = 0
      let pNote = ''
      if (art.content_type === 'haruhi') { points = 120; pNote = '投稿凉宫个人作品奖励 (人工复核)' }
      else { points = 30; pNote = '投稿其他个人作品奖励 (人工复核)' }
      if (points > 0) {
        try {
          await db.run(
            `INSERT INTO points_ledger(uid, artwork_id, points, note, created_at, granted_at) VALUES(?,?,?,?,?,?)`,
            [art.uploader_uid, id, points, pNote, art.created_at, now]
          )
        } catch (e) {
          console.error('Manual approval grant points failed:', e)
        }
      }
    }
  }
  res.json({ ok: true })
})

app.post('/api/admin/artworks/:id/reject', requireAdmin, async (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const note = String(req.body?.note || '').trim()
  await db.run(`UPDATE artworks SET status='rejected', review_note=?, reviewed_at=? WHERE id=?`, [note, new Date().toISOString(), id])
  res.json({ ok: true })
})
app.post('/api/admin/artworks/:id/status', requireAdmin, async (req, res) => {
  const db = getDb()
  const status = req.body?.status
  if (['hidden', 'approved', 'flagged'].includes(status)) {
    await db.run(`UPDATE artworks SET status=? WHERE id=?`, [status, Number(req.params.id)])
    res.json({ ok: true })
  } else res.status(400).json({ ok: false })
})
app.post('/api/admin/artworks/:id/update', requireAdmin, async (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const { title, description, tags } = req.body
  const tagsArr = normalizeTagsToArray(tags)
  const tags_json = JSON.stringify(tagsArr)
  const tags_norm = makeTagsNorm(tagsArr)
  await db.run(`UPDATE artworks SET title=?, description=?, tags_json=?, tags_norm=? WHERE id=?`,
    [title, description, tags_json, tags_norm, id]
  )
  res.json({ ok: true })
})
app.delete('/api/admin/artworks/:id', requireAdmin, async (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const row = await db.get(`SELECT file_path, file_path_original, images_json FROM artworks WHERE id=?`, [id])
  if (row) {
    const filesToDelete = []
    if (row.file_path) filesToDelete.push(row.file_path)
    if (row.file_path_original) filesToDelete.push(row.file_path_original)

    try {
      const imgs = JSON.parse(row.images_json || '[]')
      imgs.forEach(img => {
        if (img.path) filesToDelete.push(img.path)
        if (img.original) filesToDelete.push(img.original)
      })
    } catch { }

    filesToDelete.forEach(f => {
      const p = path.join(uploadsDir, f)
      if (fs.existsSync(p)) try { fs.unlinkSync(p) } catch { }
    })
  }
  await db.run(`DELETE FROM artworks WHERE id=?`, [id])
  await db.run(`DELETE FROM comments WHERE artwork_id=?`, [id])
  await db.run(`DELETE FROM likes_daily WHERE target_type='artwork' AND target_id=?`, [id])
  res.json({ ok: true })
})

app.get('/api/admin/comments', requireAdmin, async (req, res) => {
  const db = getDb()
  const status = req.query.status || 'flagged'
  let sql = `SELECT * FROM comments WHERE 1=1`
  const params = []
  if (status !== 'all') { sql += ` AND status=?`; params.push(status) }
  sql += ` ORDER BY datetime(created_at) DESC LIMIT 200`
  const rows = await db.all(sql, params)
  res.json({ ok: true, data: rows })
})
app.post('/api/admin/comments/:id/status', requireAdmin, async (req, res) => {
  const db = getDb()
  const status = req.body.status
  await db.run(`UPDATE comments SET status=? WHERE id=?`, [status, Number(req.params.id)])
  res.json({ ok: true })
})
app.delete('/api/admin/comments/:id', requireAdmin, async (req, res) => {
  const db = getDb()
  await db.run(`DELETE FROM comments WHERE id=?`, [Number(req.params.id)])
  res.json({ ok: true })
})

// 修改：返回数据中包含 QQ
app.get('/api/admin/creators', requireAdmin, async (req, res) => {
  res.json({ ok: true, data: await getDb().all(`SELECT uid, avatar_url, created_at, qq FROM creators ORDER BY datetime(created_at) DESC`) })
})
app.post('/api/admin/creators', requireAdmin, async (req, res) => {
  const db = getDb()
  const uid = String(req.body.uid).trim()
  if (uid && !(await db.get(`SELECT uid FROM creators WHERE uid=?`, [uid]))) {
    await db.run(`INSERT INTO creators(uid, avatar_url, created_at) VALUES(?,'',?)`, [uid, new Date().toISOString()])
  }
  res.json({ ok: true })
})

// 修改：支持更新 QQ
app.post('/api/admin/creators/:uid/update', requireAdmin, avatarUpload, async (req, res) => {
  const db = getDb()
  const oldUid = req.params.uid
  const newUid = safeText(req.body.new_uid)
  const qq = safeText(req.body.qq) // 获取 QQ 参数

  if (!oldUid) return res.status(400).json({ ok: false, message: 'Missing param' })

  const creator = await db.get(`SELECT * FROM creators WHERE uid=?`, [oldUid])
  if (!creator) return res.status(404).json({ ok: false, message: 'Creator not found' })

  let finalUid = oldUid

  // 开启事务处理
  await db.run('BEGIN TRANSACTION')
  try {
    // 1. 如果 UID 变更，更新所有相关表
    if (newUid && newUid !== oldUid) {
      // 检查新 UID 是否已存在
      const conflict = await db.get(`SELECT 1 FROM creators WHERE uid=?`, [newUid])
      if (conflict) {
        throw new Error(`UID "${newUid}" already exists`)
      }

      await db.run(`UPDATE creators SET uid=? WHERE uid=?`, [newUid, oldUid])
      await db.run(`UPDATE artworks SET uploader_uid=? WHERE uploader_uid=?`, [newUid, oldUid])
      await db.run(`UPDATE points_ledger SET uid=? WHERE uid=?`, [newUid, oldUid])

      finalUid = newUid
    }

    // 2. 更新 QQ
    await db.run(`UPDATE creators SET qq=? WHERE uid=?`, [qq, finalUid])

    // 3. 如果有头像上传
    if (req.file) {
      const relPath = path.relative(uploadsDir, req.file.path).replace(/\\/g, '/')
      const avatarUrl = `uploads/${relPath}`
      await db.run(`UPDATE creators SET avatar_url=? WHERE uid=?`, [avatarUrl, finalUid])
    }

    await db.run('COMMIT')
    res.json({ ok: true })
  } catch (e) {
    await db.run('ROLLBACK')
    res.status(500).json({ ok: false, message: e.message })
  }
})

// 新增：删除创作者
app.delete('/api/admin/creators/:uid', requireAdmin, async (req, res) => {
  const db = getDb()
  const uid = req.params.uid
  await db.run(`DELETE FROM creators WHERE uid=?`, [uid])
  res.json({ ok: true })
})

app.get('/api/admin/points-ledger', requireAdmin, async (req, res) => {
  const rows = await getDb().all(`SELECT pl.uid, pl.points, pl.granted_at, pl.note, a.title AS artwork_title FROM points_ledger pl LEFT JOIN artworks a ON a.id=pl.artwork_id ORDER BY datetime(pl.granted_at) DESC`)
  res.json({ ok: true, data: rows })
})
app.post('/api/admin/points/grant', requireAdmin, async (req, res) => {
  const { uid, artwork_id, points, note } = req.body
  await getDb().run(`INSERT INTO points_ledger(uid, artwork_id, points, note, created_at, granted_at) VALUES(?,?,?,?,?,?)`,
    [uid, artwork_id, points, note, new Date().toISOString(), new Date().toISOString()]
  )
  res.json({ ok: true })
})

await initDb(DB_PATH)

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ ok: false, message: '文件大小超过限制 (100MB)' })
    }
  }
  console.error('Unhandled error:', err)
  res.status(500).json({ ok: false, message: 'Internal Server Error' })
})

app.listen(API_PORT, '127.0.0.1', () => {
  console.log(`[api] listening on http://127.0.0.1:${API_PORT}`)
})