import { seedCreators, seedArtworks, seedComments } from '../mock/seedData.js'
const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api'

function buildUrl(path, params) {
  const url = new URL(path, window.location.origin)
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }
  return url.pathname + url.search
}

async function request(method, path, { params, body, isForm, headers } = {}) {
  const url = buildUrl(path, params)
  // 获取已存储的密码以用于 header
  const adminPw = localStorage.getItem('admin_pw')
  const authHeaders = adminPw ? { 'x-admin-password': adminPw } : {}

  const init = {
    method,
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      ...authHeaders,
      ...(headers || {})
    }
  }

  if (method !== 'GET' && method !== 'HEAD') {
    if (isForm) init.body = body
    else if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
  }

  const res = await fetch(url, init)
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error(`HTTP ${res.status}`)
  }

  if (!res.ok || data?.ok === false) throw new Error(data?.message || `HTTP ${res.status}`)
  return data
}

// Helper to fix image paths
function transformArtwork(a) {
  if (!a) return a
  // If it's a relative path starting with uploads/, prepend API_PREFIX
  if (a.image_url && !a.image_url.startsWith('http') && !a.image_url.startsWith('/')) {
    a.image_url = `${API_PREFIX}/${a.image_url}`
  }
  if (a.original_url && !a.original_url.startsWith('http') && !a.original_url.startsWith('/')) {
    a.original_url = `${API_PREFIX}/${a.original_url}`
  }
  // Check uploader_avatar just in case, though it might be external
  if (a.uploader_avatar && !a.uploader_avatar.startsWith('http') && !a.uploader_avatar.startsWith('/')) {
    a.uploader_avatar = `${API_PREFIX}/${a.uploader_avatar}`
  }
  return a
}

export const api = {
  health: () => request('GET', `${API_PREFIX}/health`),

  // Public
  artworksList: async (params) => {
    const data = await request('GET', `${API_PREFIX}/artworks`, { params })
    if (data.data) data.data = data.data.map(transformArtwork)
    return data
  },
  creatorProfile: (uid) => request('GET', `${API_PREFIX}/creators/${encodeURIComponent(uid)}`),
  creatorWorks: async (params) => {
    const data = await request('GET', `${API_PREFIX}/artworks`, {
      params: { ...params, status: 'approved', source_type: 'personal', uploader_uid: params.uid }
    })
    if (data.data) data.data = data.data.map(transformArtwork)
    return data
  },
  verifyCreator: (uid) => request('GET', `${API_PREFIX}/creators/verify`, { params: { uid } }),
  uploadArtwork: (formData) => request('POST', `${API_PREFIX}/artworks`, { body: formData, isForm: true }),

  // Interaction
  likeArtwork: (id) => request('POST', `${API_PREFIX}/likes/artwork/${id}`, { body: {} }),
  likeComment: (id) => request('POST', `${API_PREFIX}/likes/comment/${id}`, { body: {} }),
  listComments: (artworkId) => request('GET', `${API_PREFIX}/comments`, { params: { artwork_id: artworkId } }),
  postComment: (body) => request('POST', `${API_PREFIX}/comments`, { body }),

  // Admin - Auth (新增)
  adminVerify: (password) => request('POST', `${API_PREFIX}/admin/verify`, { body: { password } }),

  // Admin - Artworks
  adminPendingArtworks: async () => {
    const data = await request('GET', `${API_PREFIX}/admin/pending-artworks`)
    if (data.data) data.data = data.data.map(transformArtwork)
    return data
  },
  adminAuditHistory: async () => {
    const data = await request('GET', `${API_PREFIX}/admin/audit-history`)
    if (data.data) data.data = data.data.map(transformArtwork)
    return data
  },
  adminApproveArtwork: (id, note) => request('POST', `${API_PREFIX}/admin/artworks/${id}/approve`, { body: { note } }),
  adminRejectArtwork: (id, note) => request('POST', `${API_PREFIX}/admin/artworks/${id}/reject`, { body: { note } }),
  adminUpdateArtworkStatus: (id, status) => request('POST', `${API_PREFIX}/admin/artworks/${id}/status`, { body: { status } }),
  adminUpdateArtworkDetails: (id, data) => request('POST', `${API_PREFIX}/admin/artworks/${id}/update`, { body: data }),
  adminDeleteArtwork: (id) => request('DELETE', `${API_PREFIX}/admin/artworks/${id}`),

  // Admin - Comments
  adminListComments: (status) => request('GET', `${API_PREFIX}/admin/comments`, { params: { status } }),
  adminUpdateCommentStatus: (id, status) => request('POST', `${API_PREFIX}/admin/comments/${id}/status`, { body: { status } }),
  adminDeleteComment: (id) => request('DELETE', `${API_PREFIX}/admin/comments/${id}`),

  // Admin - Others
  adminPointsLedger: () => request('GET', `${API_PREFIX}/admin/points-ledger`),
  adminCreators: async () => {
    const data = await request('GET', `${API_PREFIX}/admin/creators`)
    if (data.data) {
      data.data = data.data.map(c => {
        if (c.avatar_url && !c.avatar_url.startsWith('http')) c.avatar_url = `${API_PREFIX}/${c.avatar_url}`
        return c
      })
    }
    return data
  },
  adminAddCreator: (uid) => request('POST', `${API_PREFIX}/admin/creators`, { body: { uid } }),
  adminGrantPoints: (body) => request('POST', `${API_PREFIX}/admin/points/grant`, { body }),

  // Points & Leaderboard
  pointsLeaderboard: async (page = 1) => {
    const data = await request('GET', `${API_PREFIX}/points/leaderboard`, { params: { page } })
    if (data.data) {
      data.data = data.data.map(c => {
        if (c.avatar_url && !c.avatar_url.startsWith('http')) c.avatar_url = `${API_PREFIX}/${c.avatar_url}`
        return c
      })
    }
    return data
  },
  pointsHistory: (uid) => request('GET', `${API_PREFIX}/points/history`, { params: { uid } }),
  searchCreators: async (q) => {
    const data = await request('GET', `${API_PREFIX}/creators/search`, { params: { q } })
    if (data.data) {
      data.data = data.data.map(c => {
        if (c.avatar_url && !c.avatar_url.startsWith('http')) c.avatar_url = `${API_PREFIX}/${c.avatar_url}`
        return c
      })
    }
    return data
  }
}