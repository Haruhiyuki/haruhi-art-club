import { seedCreators, seedArtworks, seedComments } from '../mock/seedData.js'

function buildUrl(path, params){
  const url = new URL(path, window.location.origin)
  if(params && typeof params === 'object'){
    for(const [k, v] of Object.entries(params)){
      if(v === undefined || v === null) continue
      url.searchParams.set(k, String(v))
    }
  }
  return url.pathname + url.search
}

async function parseResponse(res){
  const ct = (res.headers.get('content-type') || '').toLowerCase()
  if(ct.includes('application/json')) return await res.json()
  const text = await res.text()
  try{ return JSON.parse(text) }catch{ return { ok:false, message: text || `HTTP ${res.status}` } }
}

async function request(method, path, { params, body, isForm, headers } = {}){
  const url = buildUrl(path, params)
   
  // ✅ 自动尝试从 localStorage 读取管理员密码
  const adminPw = localStorage.getItem('admin_pw')
  const authHeaders = adminPw ? { 'x-admin-password': adminPw } : {}

  const init = {
    method,
    credentials: 'include',
    headers: { 
      'Accept': 'application/json', 
      ...authHeaders, // 注入鉴权头
      ...(headers || {}) 
    }
  }

  if(method !== 'GET' && method !== 'HEAD'){
    if(isForm){
      init.body = body
    }else if(body !== undefined){
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
  }

  const res = await fetch(url, init)
  const data = await parseResponse(res)

  if(!res.ok || data?.ok === false){
    const msg = data?.message || `HTTP ${res.status}`
    throw new Error(`${res.status} ${msg}`)
  }
  return data
}

export const api = {
  // 基础健康检查
  async health(){
    return await request('GET', '/api/health')
  },

  // ===== 核心作品列表 (后端只做纯粹查询) =====
  async artworksList(params){
    return await request('GET', '/api/artworks', { params })
  },

  // ===== 创作者 =====
  async creatorProfile(uid){
    return await request('GET', `/api/creators/${encodeURIComponent(uid)}`)
  },
  async creatorWorks(params){
    const p = { ...params, status: 'approved', source_type: 'personal', uploader_uid: params.uid }
    return await request('GET', '/api/artworks', { params: p })
  },
  async verifyCreator(uid){
    return await request('GET', '/api/creators/verify', { params: { uid } })
  },

  // ===== 上传 =====
  async uploadArtwork(formData){
    return await request('POST', '/api/artworks', { body: formData, isForm: true })
  },

  // ===== 互动 (点赞/评论) =====
  async likeArtwork(artworkId){
    return await request('POST', `/api/likes/artwork/${encodeURIComponent(artworkId)}`, { body: {} })
  },
  async likeComment(commentId){
    return await request('POST', `/api/likes/comment/${encodeURIComponent(commentId)}`, { body: {} })
  },
  async listComments(artworkId){
    return await request('GET', '/api/comments', { params: { artwork_id: artworkId } })
  },
  async postComment({ artwork_id, user_name, body }){
    return await request('POST', '/api/comments', { body: { artwork_id, user_name, body } })
  },

  // ===== 管理后台 =====
  async adminPendingArtworks(){
    return await request('GET', '/api/admin/pending-artworks')
  },
  // ✅ 新增：获取审核记录 (历史归档)
  async adminAuditHistory(){
    return await request('GET', '/api/admin/audit-history')
  },
  async adminPointsLedger(){
    return await request('GET', '/api/admin/points-ledger')
  },
  async adminCreators(){
    return await request('GET', '/api/admin/creators')
  },
  async adminApproveArtwork(id, note=''){
    return await request('POST', `/api/admin/artworks/${encodeURIComponent(id)}/approve`, { body: { note } })
  },
  async adminRejectArtwork(id, note=''){
    return await request('POST', `/api/admin/artworks/${encodeURIComponent(id)}/reject`, { body: { note } })
  },
  async adminGrantPoints({ uid, artwork_id, points, note }){
    return await request('POST', '/api/admin/points/grant', { body: { uid, artwork_id, points, note } })
  },
  async adminAddCreator(body){
    return { ok: true } 
  },
  async adminImportCreators(list){
    return { ok: true }
  }
}