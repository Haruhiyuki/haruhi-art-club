import { seedCreators, seedArtworks, seedComments } from '../mock/seedData.js'

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

export const api = {
  health: () => request('GET', '/api/health'),

  // Public
  artworksList: (params) => request('GET', '/api/artworks', { params }),
  creatorProfile: (uid) => request('GET', `/api/creators/${encodeURIComponent(uid)}`),
  creatorWorks: (params) => request('GET', '/api/artworks', {
    params: { ...params, status: 'approved', source_type: 'personal', uploader_uid: params.uid }
  }),
  verifyCreator: (uid) => request('GET', '/api/creators/verify', { params: { uid } }),
  uploadArtwork: (formData) => request('POST', '/api/artworks', { body: formData, isForm: true }),

  // Interaction
  likeArtwork: (id) => request('POST', `/api/likes/artwork/${id}`, { body: {} }),
  likeComment: (id) => request('POST', `/api/likes/comment/${id}`, { body: {} }),
  listComments: (artworkId) => request('GET', '/api/comments', { params: { artwork_id: artworkId } }),
  postComment: (body) => request('POST', '/api/comments', { body }),

  // Admin - Artworks
  adminPendingArtworks: () => request('GET', '/api/admin/pending-artworks'),
  adminAuditHistory: () => request('GET', '/api/admin/audit-history'),
  adminApproveArtwork: (id, note) => request('POST', `/api/admin/artworks/${id}/approve`, { body: { note } }),
  adminRejectArtwork: (id, note) => request('POST', `/api/admin/artworks/${id}/reject`, { body: { note } }),
  adminUpdateArtworkStatus: (id, status) => request('POST', `/api/admin/artworks/${id}/status`, { body: { status } }),
  adminUpdateArtworkDetails: (id, data) => request('POST', `/api/admin/artworks/${id}/update`, { body: data }),
  adminDeleteArtwork: (id) => request('DELETE', `/api/admin/artworks/${id}`),

  // Admin - Comments
  adminListComments: (status) => request('GET', '/api/admin/comments', { params: { status } }),
  adminUpdateCommentStatus: (id, status) => request('POST', `/api/admin/comments/${id}/status`, { body: { status } }),
  adminDeleteComment: (id) => request('DELETE', `/api/admin/comments/${id}`),

  // Admin - Others
  adminPointsLedger: () => request('GET', '/api/admin/points-ledger'),
  adminCreators: () => request('GET', '/api/admin/creators'),
  adminAddCreator: (uid) => request('POST', '/api/admin/creators', { body: { uid } }),
  adminGrantPoints: (body) => request('POST', '/api/admin/points/grant', { body }),

    // Points & Leaderboard
  pointsLeaderboard: (page=1) => request('GET', '/api/points/leaderboard', { params: { page } }),
  pointsHistory: (uid) => request('GET', '/api/points/history', { params: { uid } }),
  searchCreators: (q) => request('GET', '/api/creators/search', { params: { q } })
}