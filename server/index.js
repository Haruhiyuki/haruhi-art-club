import express from 'express'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { initDb, getDb } from './db.js'

// =======================
// 基础工具
// =======================
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const API_PORT = Number(process.env.API_PORT || 15450)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.sqlite')

// Cookie 匿名识别（点赞/限额用）
const COOKIE_NAME = 'haruhi_anon'
const COOKIE_SIG = 'haruhi_anon_sig'
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'dev-cookie-secret-change-me'

function b64url(buf){
  return buf.toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')
}
function sign(val){
  return b64url(crypto.createHmac('sha256', COOKIE_SECRET).update(String(val)).digest())
}
function parseCookies(header){
  const out = {}
  const s = String(header || '')
  if(!s) return out
  const parts = s.split(';')
  for(const p of parts){
    const i = p.indexOf('=')
    if(i < 0) continue
    const k = p.slice(0,i).trim()
    const v = p.slice(i+1).trim()
    if(!k) continue
    out[k] = decodeURIComponent(v)
  }
  return out
}
function setAnonCookie(res, id){
  const sig = sign(id)
  const common = `Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${encodeURIComponent(id)}; ${common}`,
    `${COOKIE_SIG}=${encodeURIComponent(sig)}; ${common}`
  ])
}

function clampInt(v, min, max, d){
  const n = Number(v)
  if(!Number.isFinite(n)) return d
  return Math.max(min, Math.min(max, Math.floor(n)))
}
function safeText(v){ return String(v ?? '').trim() }
function safeJsonArr(s){
  try{
    const v = JSON.parse(s || '[]')
    return Array.isArray(v) ? v : []
  }catch{ return [] }
}
function makeLike(q){
  return `%${String(q || '').trim().replace(/[%_]/g, '')}%`
}
function makeTagsNorm(tags){
  const norm = (tags || []).map(t => String(t).toLowerCase()).join(' ')
  return norm ? ` ${norm} ` : ''
}
function normalizeTagsToArray(s){
  const raw = String(s || '').trim()
  if(!raw) return []
  const parts = raw.split(/[\s,，]+/g).map(x => x.trim()).filter(Boolean)
  const out = []
  const seen = new Set()
  for(const t0 of parts){
    const t = t0.startsWith('#') ? t0.slice(1).trim() : t0
    const k = t.toLowerCase()
    if(!t) continue
    if(seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}
function parseLicenses(raw){
  const s = String(raw || '').trim()
  if(!s) return []
  try{
    const arr = JSON.parse(s)
    if(Array.isArray(arr)){
      return arr.map(x => String(x).trim()).filter(Boolean)
    }
    return []
  }catch{
    return []
  }
}

function mapArtworkRow(r){
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
    image_url: r.file_path ? `/uploads/${r.file_path}` : ''
  }
}

// =======================
// multer（上传文件落到 server/uploads 下，并被 /uploads 静态服务）
// =======================
const uploadsDir = path.join(__dirname, 'uploads')
fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination(req, file, cb){
    const d = new Date()
    const folder = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const dir = path.join(uploadsDir, folder)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(req, file, cb){
    const ext = path.extname(file.originalname || '').toLowerCase() || '.bin'
    const safe = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
    cb(null, safe)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 } // 12MB
})

// =======================
// express app
// =======================
const app = express()

// ✅ 零依赖 CORS 兜底（一般走 Vite proxy 同源，不会触发）
app.use((req, res, next) => {
  const origin = req.headers.origin
  if(origin){
    const ok =
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)

    if(ok){
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
      if(req.method === 'OPTIONS') return res.status(204).end()
    }
  }
  next()
})

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// ✅ 匿名 Cookie（不登录也能识别同一用户：点赞限额用）
app.use((req, res, next) => {
  const c = parseCookies(req.headers.cookie || '')
  let id = c[COOKIE_NAME]
  const sig = c[COOKIE_SIG]
  const ok = id && sig && sign(id) === sig
  if(!ok){
    id = crypto.randomUUID()
    setAnonCookie(res, id)
  }
  req.anonId = id
  next()
})

// uploads static
app.use('/uploads', express.static(uploadsDir))

// health
app.get('/api/health', (req, res) => res.json({ ok: true }))

// =======================
// 公共：artworks 列表（后端仅做“查询与返回”）
// =======================
app.get('/api/artworks', async (req, res) => {
  const db = getDb()
  const status = String(req.query.status || 'approved') // approved|pending|rejected|all
  const content_type = String(req.query.content_type || 'all') // haruhi|other|all
  const source_type = String(req.query.source_type || 'all') // personal|network|all
  const uploader_uid = String(req.query.uploader_uid || '').trim()
  const q = String(req.query.q || '').trim()
  const page = clampInt(req.query.page, 1, 9999, 1)
  const pageSize = clampInt(req.query.pageSize, 6, 60, 24)

  const params = []
  let where = `WHERE 1=1`

  if(status !== 'all'){
    where += ` AND a.status=?`
    params.push(status)
  }
  if(content_type !== 'all'){
    where += ` AND a.content_type=?`
    params.push(content_type)
  }
  if(source_type !== 'all'){
    where += ` AND a.source_type=?`
    params.push(source_type)
  }
  if(uploader_uid){
    where += ` AND a.uploader_uid=?`
    params.push(uploader_uid)
  }
  if(q){
    const like = makeLike(q)
    where += ` AND (a.title LIKE ? OR a.description LIKE ? OR a.tags_norm LIKE ? OR a.uploader_uid LIKE ?)`
    params.push(like, like, ` %${q.toLowerCase()} % `, like)
  }

  const totalRow = await db.get(`SELECT COUNT(1) AS c FROM artworks a ${where}`, params)
  const total = Number(totalRow?.c || 0)

  const offset = (page - 1) * pageSize
  const rows = await db.all(
    `SELECT a.*, c.avatar_url AS uploader_avatar
     FROM artworks a
     LEFT JOIN creators c ON c.uid=a.uploader_uid
     ${where}
     ORDER BY datetime(a.created_at) DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  )

  res.json({ ok:true, data: rows.map(mapArtworkRow), total })
})

// 兼容你现有前端：/api/gallery（前端 store 会做 balanced 混合，后端这里只做普通列表）
app.get('/api/gallery', async (req, res) => {
  // 前端仍可能传：content / sourceMode / q / page / pageSize
  const content = String(req.query.content || 'haruhi') // haruhi|other
  const sourceMode = String(req.query.sourceMode || 'balanced') // balanced|personal|network
  const q = String(req.query.q || '').trim()
  const page = clampInt(req.query.page, 1, 9999, 1)
  const pageSize = clampInt(req.query.pageSize, 6, 48, 24)

  // sourceMode=balanced 时，后端不做混合（由前端 store 处理）
  const source_type = (sourceMode === 'personal' || sourceMode === 'network') ? sourceMode : 'all'
  const content_type = (content === 'haruhi' || content === 'other') ? content : 'all'

  req.query.status = 'approved'
  req.query.content_type = content_type
  req.query.source_type = source_type
  req.query.q = q
  req.query.page = page
  req.query.pageSize = pageSize

  // 直接复用 /api/artworks 的处理逻辑
  return app._router.handle(req, res, () => {})
})

// =======================
// 上传投稿：只做数据写入（pending）
// =======================
app.post('/api/artworks', upload.single('image'), async (req, res) => {
  const db = getDb()

  if(!req.file){
    return res.status(400).json({ ok:false, message:'缺少图片文件' })
  }

  const title = safeText(req.body?.title)
  const description = safeText(req.body?.description)

  const uploader_name = safeText(req.body?.uploader_name)
  const uploader_uid = safeText(req.body?.uploader_uid)
  const source_type = safeText(req.body?.source_type) || 'network' // personal|network
  const content_type = safeText(req.body?.content_type) || 'haruhi' // haruhi|other
  const origin_url = safeText(req.body?.origin_url)

  const tagsArr = normalizeTagsToArray(req.body?.tags)
  const tags_json = JSON.stringify(tagsArr)
  const tags_norm = makeTagsNorm(tagsArr)

  const licensesArr = parseLicenses(req.body?.licenses)
  const licenses_json = JSON.stringify(licensesArr)

  if(!title || !description){
    return res.status(400).json({ ok:false, message:'作品名称与描述为必填' })
  }

  // ✅ 数据约束仍建议保留（这是“数据有效性”，不是业务混合逻辑）
  if(source_type === 'personal'){
    if(!uploader_uid){
      return res.status(400).json({ ok:false, message:'个人作品必须填写唯一ID' })
    }
    const creator = await db.get(`SELECT uid FROM creators WHERE uid=?`, [uploader_uid])
    if(!creator){
      return res.status(400).json({ ok:false, message:'唯一ID不存在（请先导入创作者名单）' })
    }
  }

  // file_path：相对 uploadsDir 的路径
  const rel = path.relative(uploadsDir, req.file.path).replace(/\\/g, '/')
  const created_at = new Date().toISOString()

  await db.run(
    `INSERT INTO artworks
      (title, description, uploader_name, uploader_uid, source_type, content_type, tags_json, tags_norm, origin_url, file_path, status, review_note, created_at, licenses_json)
     VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)`,
    [
      title,
      description,
      uploader_name || null,
      uploader_uid || null,
      source_type,
      content_type,
      tags_json,
      tags_norm,
      origin_url || null,
      rel,
      created_at,
      licenses_json
    ]
  )

  res.json({ ok:true })
})

// =======================
// creators（读取/校验）
// =======================
app.get('/api/creators/verify', async (req, res) => {
  const db = getDb()
  const uid = String(req.query.uid || '').trim()
  if(!uid) return res.json({ ok: true, exists: false })

  const row = await db.get(`SELECT uid, avatar_url, created_at FROM creators WHERE uid=?`, [uid])
  res.json({ ok: true, exists: !!row, creator: row || null })
})

app.get('/api/creators/:uid', async (req, res) => {
  const db = getDb()
  const uid = String(req.params.uid || '').trim()
  const row = await db.get(`SELECT uid, avatar_url, created_at FROM creators WHERE uid=?`, [uid])
  if(!row) return res.status(404).json({ ok: false, message: '创作者不存在' })
  res.json({ ok: true, data: row })
})

app.get('/api/creators/:uid/works', async (req, res) => {
  // 直接复用 artworks 列表：approved + personal + uploader_uid
  req.query.status = 'approved'
  req.query.source_type = 'personal'
  req.query.uploader_uid = req.params.uid
  req.query.content_type = String(req.query.content || 'all') // all|haruhi|other
  return app._router.handle(req, res, () => {})
})

// =======================
// comments（读取/写入）
// =======================
app.get('/api/comments', async (req, res) => {
  const db = getDb()
  const artworkId = Number(req.query.artwork_id)
  if(!Number.isFinite(artworkId)) return res.status(400).json({ ok:false, message:'artwork_id 无效' })

  const rows = await db.all(
    `SELECT id, artwork_id, user_name, avatar_key, body, like_total, created_at
     FROM comments
     WHERE artwork_id=? AND status='public'
     ORDER BY datetime(created_at) ASC`,
    [artworkId]
  )

  res.json({ ok:true, data: rows.map(r => ({
    id: r.id,
    artwork_id: r.artwork_id,
    user_name: r.user_name,
    avatar_key: r.avatar_key,
    body: r.body,
    like_total: Number(r.like_total || 0),
    created_at: r.created_at
  }))})
})

function clampLen(s, max){
  const t = String(s || '').trim()
  return t.length > max ? t.slice(0, max) : t
}

app.post('/api/comments', async (req, res) => {
  const db = getDb()
  const anonId = req.anonId || ''

  const artwork_id = Number(req.body?.artwork_id)
  if(!Number.isFinite(artwork_id)) return res.status(400).json({ ok:false, message:'artwork_id 无效' })

  const user_name = clampLen(req.body?.user_name, 24)
  const body = clampLen(req.body?.body, 800)

  if(!user_name) return res.status(400).json({ ok:false, message:'临时ID不能为空' })
  if(!body) return res.status(400).json({ ok:false, message:'评论内容不能为空' })

  const art = await db.get(`SELECT id FROM artworks WHERE id=? AND status='approved'`, [artwork_id])
  if(!art) return res.status(404).json({ ok:false, message:'作品不存在或未公开' })

  const avatar_key = crypto.randomInt(1, 13) // 1..12
  const created_at = new Date().toISOString()

  const r = await db.run(
    `INSERT INTO comments(artwork_id, anon_id, user_name, avatar_key, body, like_total, created_at, status)
     VALUES(?,?,?,?,?,0,?,'public')`,
    [artwork_id, anonId, user_name, avatar_key, body, created_at]
  )

  res.json({
    ok:true,
    data: { id: r.lastID, artwork_id, user_name, avatar_key, body, like_total: 0, created_at }
  })
})

// =======================
// likes（这里建议仍留在后端：属于数据一致性与限额）
// =======================
function dayKey(){
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

async function likeTarget({ db, anonId, targetType, targetId }){
  const day = dayKey()
  const now = new Date().toISOString()

  await db.exec('BEGIN')
  try{
    if(targetType === 'artwork'){
      const a = await db.get(`SELECT id, like_total FROM artworks WHERE id=? AND status='approved'`, [targetId])
      if(!a){
        await db.exec('ROLLBACK')
        return { status: 404, body: { ok:false, message:'作品不存在或未公开' } }
      }
    }else if(targetType === 'comment'){
      const c = await db.get(`SELECT id, like_total FROM comments WHERE id=? AND status='public'`, [targetId])
      if(!c){
        await db.exec('ROLLBACK')
        return { status: 404, body: { ok:false, message:'评论不存在或未公开' } }
      }
    }else{
      await db.exec('ROLLBACK')
      return { status: 400, body: { ok:false, message:'targetType 无效' } }
    }

    const row = await db.get(
      `SELECT id, count FROM likes_daily
       WHERE anon_id=? AND target_type=? AND target_id=? AND day=?`,
      [anonId, targetType, targetId, day]
    )

    const used = Number(row?.count || 0)
    if(used >= 10){
      await db.exec('ROLLBACK')
      return { status: 429, body: { ok:false, message:'今日已达上限', remainingToday: 0, todayCount: used } }
    }

    if(row){
      await db.run(`UPDATE likes_daily SET count=count+1, updated_at=? WHERE id=?`, [now, row.id])
    }else{
      await db.run(
        `INSERT INTO likes_daily(anon_id, target_type, target_id, day, count, created_at, updated_at)
         VALUES(?,?,?,?,1,?,?)`,
        [anonId, targetType, targetId, day, now, now]
      )
    }

    if(targetType === 'artwork'){
      await db.run(`UPDATE artworks SET like_total=COALESCE(like_total,0)+1 WHERE id=?`, [targetId])
      const a2 = await db.get(`SELECT like_total FROM artworks WHERE id=?`, [targetId])
      await db.exec('COMMIT')
      return { status: 200, body: { ok:true, totalLikes: Number(a2?.like_total || 0), todayCount: used + 1, remainingToday: 10 - (used + 1) } }
    }else{
      await db.run(`UPDATE comments SET like_total=COALESCE(like_total,0)+1 WHERE id=?`, [targetId])
      const c2 = await db.get(`SELECT like_total FROM comments WHERE id=?`, [targetId])
      await db.exec('COMMIT')
      return { status: 200, body: { ok:true, totalLikes: Number(c2?.like_total || 0), todayCount: used + 1, remainingToday: 10 - (used + 1) } }
    }
  }catch{
    await db.exec('ROLLBACK')
    return { status: 500, body: { ok:false, message:'点赞失败' } }
  }
}

app.post('/api/likes/artwork/:id', async (req, res) => {
  const db = getDb()
  const anonId = req.anonId || ''
  const targetId = Number(req.params.id)
  if(!Number.isFinite(targetId)) return res.status(400).json({ ok:false, message:'id 无效' })

  const out = await likeTarget({ db, anonId, targetType: 'artwork', targetId })
  res.status(out.status).json(out.body)
})

app.post('/api/likes/comment/:id', async (req, res) => {
  const db = getDb()
  const anonId = req.anonId || ''
  const targetId = Number(req.params.id)
  if(!Number.isFinite(targetId)) return res.status(400).json({ ok:false, message:'id 无效' })

  const out = await likeTarget({ db, anonId, targetType: 'comment', targetId })
  res.status(out.status).json(out.body)
})

// =======================
// 管理后台：只做状态变更与读写（积分逻辑移到前端 store）
// =======================
function requireAdminIfConfigured(req, res, next){
  const expected = String(process.env.ADMIN_PASSWORD || '').trim()
  if(!expected) return next() // 未设置则不启用鉴权（兼容你现在的开发阶段）
  const got = req.header('x-admin-password') || ''
  if(got !== expected) return res.status(401).json({ ok:false, message:'未通过管理后台鉴权' })
  next()
}

app.get('/api/admin/pending-artworks', requireAdminIfConfigured, async (req, res) => {
  const db = getDb()
  const rows = await db.all(
    `SELECT a.*, c.avatar_url AS uploader_avatar
     FROM artworks a
     LEFT JOIN creators c ON c.uid=a.uploader_uid
     WHERE a.status='pending'
     ORDER BY datetime(a.created_at) DESC`
  )
  res.json({ ok:true, data: rows.map(mapArtworkRow) })
})

// ✅ 新增：审核记录 (audit history)
app.get('/api/admin/audit-history', requireAdminIfConfigured, async (req, res) => {
  const db = getDb()
  const rows = await db.all(
    `SELECT a.*, c.avatar_url AS uploader_avatar
     FROM artworks a
     LEFT JOIN creators c ON c.uid=a.uploader_uid
     WHERE a.status IN ('approved', 'rejected')
     ORDER BY datetime(a.reviewed_at) DESC, datetime(a.created_at) DESC
     LIMIT 500` // 限制数量，防止数据过多
  )
  res.json({ ok:true, data: rows.map(mapArtworkRow) })
})

app.get('/api/admin/artworks', requireAdminIfConfigured, async (req, res) => {
  // 复用 /api/artworks：管理员需要 all 状态
  req.query.status = String(req.query.status || 'all')
  return app._router.handle(req, res, () => {})
})

app.post('/api/admin/artworks/:id/approve', requireAdminIfConfigured, async (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  if(!Number.isFinite(id)) return res.status(400).json({ ok:false, message:'id 无效' })

  const note = String(req.body?.note || '').trim()
  const now = new Date().toISOString()

  const art = await db.get(`SELECT id FROM artworks WHERE id=?`, [id])
  if(!art) return res.status(404).json({ ok:false, message:'作品不存在' })

  await db.run(
    `UPDATE artworks SET status='approved', review_note=?, reviewed_at=? WHERE id=?`,
    [note, now, id]
  )

  // ✅ 不再在后端发积分（积分规则由前端 store 决定）
  res.json({ ok:true })
})

app.post('/api/admin/artworks/:id/reject', requireAdminIfConfigured, async (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  if(!Number.isFinite(id)) return res.status(400).json({ ok:false, message:'id 无效' })

  const note = String(req.body?.note || '').trim()
  const now = new Date().toISOString()

  const art = await db.get(`SELECT id FROM artworks WHERE id=?`, [id])
  if(!art) return res.status(404).json({ ok:false, message:'作品不存在' })

  await db.run(
    `UPDATE artworks SET status='rejected', review_note=?, reviewed_at=? WHERE id=?`,
    [note, now, id]
  )

  res.json({ ok:true })
})

app.get('/api/admin/points-ledger', requireAdminIfConfigured, async (req, res) => {
  const db = getDb()
  const rows = await db.all(
    `SELECT pl.uid, pl.points, pl.granted_at, a.title AS artwork_title
     FROM points_ledger pl
     LEFT JOIN artworks a ON a.id=pl.artwork_id
     WHERE pl.granted_at IS NOT NULL
     ORDER BY datetime(pl.granted_at) DESC`
  )
  res.json({
    ok:true,
    data: rows.map(r => ({
      uid: r.uid,
      points: Number(r.points || 0),
      granted_at: r.granted_at,
      artwork_title: r.artwork_title || ''
    }))
  })
})

app.get('/api/admin/creators', requireAdminIfConfigured, async (req, res) => {
  const db = getDb()
  const rows = await db.all(`SELECT uid, avatar_url, created_at FROM creators ORDER BY datetime(created_at) DESC`)
  res.json({ ok:true, data: rows })
})

// ✅ 给前端 store 用：发放积分（只做插入与去重）
app.post('/api/admin/points/grant', requireAdminIfConfigured, async (req, res) => {
  const db = getDb()
  const uid = String(req.body?.uid || '').trim()
  const artwork_id = Number(req.body?.artwork_id)
  const points = Number(req.body?.points || 0)
  const note = String(req.body?.note || '').trim()

  if(!uid) return res.status(400).json({ ok:false, message:'uid 必填' })
  if(!Number.isFinite(artwork_id)) return res.status(400).json({ ok:false, message:'artwork_id 无效' })
  if(!Number.isFinite(points) || points === 0) return res.status(400).json({ ok:false, message:'points 无效' })

  const now = new Date().toISOString()

  const existed = await db.get(
    `SELECT id FROM points_ledger WHERE uid=? AND artwork_id=? AND points=?`,
    [uid, artwork_id, points]
  )
  if(existed){
    return res.json({ ok:true, inserted:false })
  }

  await db.run(
    `INSERT INTO points_ledger(uid, artwork_id, points, note, created_at, granted_at)
     VALUES(?,?,?,?,?,?)`,
    [uid, artwork_id, points, note || '', now, now]
  )
  res.json({ ok:true, inserted:true })
})

// =======================
// 会员校验（保留）
// =======================
function sha256(text){
  return crypto.createHash('sha256').update(text).digest('hex')
}
function hashMemberId(memberId, salt){
  const s = salt || ''
  return sha256(`${s}::${memberId}`)
}

app.post('/api/members/verify', async (req, res) => {
  const { memberId } = req.body || {}
  const id = String(memberId || '').trim()
  if(!id) return res.json({ ok:true, isMember:false })

  const salt = process.env.MEMBER_ID_SALT || ''
  const h = hashMemberId(id, salt)
  const db = getDb()
  const row = await db.get(
    `SELECT id, is_active FROM members WHERE member_code_hash = ? LIMIT 1`,
    [h]
  )
  const isMember = !!row && Number(row.is_active) === 1
  res.json({ ok:true, isMember })
})

// =======================
// 启动
// =======================
await initDb(DB_PATH)

app.listen(API_PORT, '127.0.0.1', () => {
  console.log(`[api] listening on http://127.0.0.1:${API_PORT}`)
})