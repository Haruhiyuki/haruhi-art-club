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

  const adminPw = localStorage.getItem('admin_pw')
  const authHeaders = adminPw ? { 'x-admin-password': adminPw } : {}

  const init = {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...authHeaders,
      ...(headers || {}),
    },
  }

  if (method !== 'GET' && method !== 'HEAD') {
    if (isForm) {
      // For FormData, do not set Content-Type header manually; browser does it
      init.body = body
    } else if (body !== undefined) {
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

// 辅助函数：修复图片路径
function fixPath(p) {
  if (!p) return ''
  if (p.startsWith('http') || p.startsWith('blob:') || p.startsWith('data:')) return p
  if (!p.startsWith('/')) return `${API_PREFIX}/${p}`
  return p
}

function transformArtwork(a) {
  if (!a) return a

  // 修复单图路径
  a.image_url = fixPath(a.image_url)
  a.original_url = fixPath(a.original_url)
  a.uploader_avatar = fixPath(a.uploader_avatar)

  // 修复多图数组路径
  if (Array.isArray(a.images)) {
    a.images = a.images.map(img => ({
      ...img,
      image_url: fixPath(img.image_url),
      original_url: fixPath(img.original_url)
    }))
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
  getArtwork: async (id) => {
    const data = await request('GET', `${API_PREFIX}/artworks/${id}`)
    if (data.data) data.data = transformArtwork(data.data)
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

  // Admin - Auth
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

  // Admin - Creators & Points
  adminPointsLedger: () => request('GET', `${API_PREFIX}/admin/points-ledger`),
  adminCreators: async () => {
    const data = await request('GET', `${API_PREFIX}/admin/creators`)
    if (data.data) {
      data.data = data.data.map(c => {
        c.avatar_url = fixPath(c.avatar_url)
        return c
      })
    }
    return data
  },
  adminAddCreator: (uid) => request('POST', `${API_PREFIX}/admin/creators`, { body: { uid } }),

  // 新增：更新创作者信息（支持传 FormData 包含头像文件）
  adminUpdateCreator: (uid, formData) => request('POST', `${API_PREFIX}/admin/creators/${encodeURIComponent(uid)}/update`, { body: formData, isForm: true }),

  // 新增：删除创作者
  adminDeleteCreator: (uid) => request('DELETE', `${API_PREFIX}/admin/creators/${encodeURIComponent(uid)}`),

  adminGrantPoints: (body) => request('POST', `${API_PREFIX}/admin/points/grant`, { body }),

  // Points & Leaderboard
  pointsLeaderboard: async (page = 1) => {
    const data = await request('GET', `${API_PREFIX}/points/leaderboard`, { params: { page } })
    if (data.data) {
      data.data = data.data.map(c => {
        c.avatar_url = fixPath(c.avatar_url)
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
        c.avatar_url = fixPath(c.avatar_url)
        return c
      })
    }
    return data
  }
}