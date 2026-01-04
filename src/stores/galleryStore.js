import { defineStore } from 'pinia'
import { api } from '../services/api.js'
import { seedArtworks } from '../mock/seedData.js'

function norm(s) { return String(s || '').toLowerCase() }
function includesWord(hay, q) { return norm(hay).includes(norm(q)) }

function filterLocal(items, { content = 'haruhi', sourceMode = 'all', q = '', searchField = 'all' }) {
  let arr = items.filter(x => x.status === 'approved')

  if (content === 'haruhi' || content === 'other') {
    arr = arr.filter(x => x.content_type === content)
  }

  if (sourceMode === 'personal' || sourceMode === 'network') {
    arr = arr.filter(x => x.source_type === sourceMode)
  }

  const qq = String(q || '').trim()
  if (qq) {
    arr = arr.filter(x => {
      const tags = Array.isArray(x.tags) ? x.tags.join(' ') : ''
      const title = x.title || ''
      const desc = x.description || ''
      const uid = x.uploader_uid || ''
      const name = x.uploader_name || ''

      if (searchField === 'title') return includesWord(title, qq)
      if (searchField === 'uid') return includesWord(uid, qq) || includesWord(name, qq)
      if (searchField === 'tag') return includesWord(tags, qq)

      return (
        includesWord(title, qq) ||
        includesWord(desc, qq) ||
        includesWord(tags, qq) ||
        includesWord(uid, qq) ||
        includesWord(name, qq)
      )
    })
  }

  return arr
}

function paginate(arr, page, pageSize) {
  const total = arr.length
  const start = (page - 1) * pageSize
  return { total, data: arr.slice(start, start + pageSize) }
}

// 本地稳定随机排序（fallback 用）
function stableRandKey(id, seed) {
  // 32-bit 线性同余
  const x = (Number(id) * 1103515245 + Number(seed)) >>> 0
  return x & 0x7fffffff
}

function applyLocalSort(arr, sortMode, seed) {
  const out = Array.isArray(arr) ? [...arr] : []
  if (sortMode === 'likes') {
    out.sort((a, b) => {
      const la = Number(a?.like_total || 0)
      const lb = Number(b?.like_total || 0)
      if (lb !== la) return lb - la
      const ta = String(a?.created_at || '')
      const tb = String(b?.created_at || '')
      if (tb !== ta) return tb.localeCompare(ta)
      return Number(b?.id || 0) - Number(a?.id || 0)
    })
    return out
  }
  if (sortMode === 'time') {
    out.sort((a, b) => {
      const ta = String(a?.created_at || '')
      const tb = String(b?.created_at || '')
      if (tb !== ta) return tb.localeCompare(ta)
      return Number(b?.id || 0) - Number(a?.id || 0)
    })
    return out
  }
  // random
  out.sort((a, b) => stableRandKey(a?.id || 0, seed) - stableRandKey(b?.id || 0, seed))
  return out
}

export const useGalleryStore = defineStore('gallery', {
  state: () => ({
    content: 'haruhi',
    sourceMode: 'all', // all | personal | network （balanced 若存在会按 all 处理）

    sortMode: 'random', // random | likes | time
    randomSeed: Number(localStorage.getItem('gallery_rand_seed') || 0) || ((Date.now() & 0x7fffffff) >>> 0),

    q: '',
    searchField: 'all',

    page: 1,
    limit: 12,

    loading: false,
    error: '',
    list: [],
    total: 0,
    hasMore: false,

    usingSeed: false,

    reqId: 0
  }),

  actions: {
    setFilters(patch) {
      if (patch.content !== undefined) this.content = patch.content
      if (patch.sourceMode !== undefined) this.sourceMode = patch.sourceMode
      if (patch.sortMode !== undefined) {
        this.sortMode = patch.sortMode
        if (patch.sortMode === 'random') {
          // 切回随机时也可刷新 seed，让用户感觉“换一批”
          this.randomSeed = ((Date.now() & 0x7fffffff) >>> 0)
          localStorage.setItem('gallery_rand_seed', String(this.randomSeed))
        }
      }
      if (patch.q !== undefined) this.q = patch.q
      if (patch.searchField !== undefined) this.searchField = patch.searchField
      if (patch.page !== undefined) this.page = patch.page
      if (patch.limit !== undefined) this.limit = patch.limit
    },

    async load() {
      const currentReqId = ++this.reqId
      this.loading = true
      this.error = ''
      this.usingSeed = false

      try {
        // ✅ 统一走后端排序（跨页）
        const params = {
          status: 'approved',
          content_type: this.content,
          q: this.q,
          searchField: this.searchField,
          page: this.page,
          pageSize: this.limit
        }

        // balanced 若存在，后端会当 all；这里也直接不传 source_type，保证全局排序正确
        if (this.sourceMode === 'personal' || this.sourceMode === 'network') {
          params.source_type = this.sourceMode
        }

        // ✅ sort 映射到后端：time | likes | random
        if (this.sortMode === 'likes') {
          params.sort = 'likes'
          params.order = 'desc'
        } else if (this.sortMode === 'time') {
          params.sort = 'time'
          params.order = 'desc'
        } else {
          params.sort = 'random'
          params.seed = this.randomSeed
        }

        const out = await api.artworksList(params)

        if (this.reqId !== currentReqId) return

        this.list = out.data || []
        this.total = Number(out.total || 0)
        this.hasMore = (this.page * this.limit) < this.total

        // Seed 兜底（同样支持跨页/排序）
        if (this.list.length === 0 && this.page === 1 && !String(this.q || '').trim() && this.total === 0) {
          const localAll = filterLocal(seedArtworks, {
            content: this.content,
            sourceMode: this.sourceMode,
            q: this.q,
            searchField: this.searchField
          })

          const sortedLocal = applyLocalSort(localAll, this.sortMode, this.randomSeed)
          const pg = paginate(sortedLocal, this.page, this.limit)

          this.list = pg.data
          this.total = pg.total
          this.hasMore = (this.page * this.limit) < this.total
          if (this.list.length > 0) this.usingSeed = true
        }

      } catch (e) {
        if (this.reqId !== currentReqId) return

        console.warn('API Error, falling back to seed data:', e)
        this.error = ''

        const localAll = filterLocal(seedArtworks, {
          content: this.content,
          sourceMode: this.sourceMode,
          q: this.q,
          searchField: this.searchField
        })

        const sortedLocal = applyLocalSort(localAll, this.sortMode, this.randomSeed)
        const pg = paginate(sortedLocal, this.page, this.limit)

        this.list = pg.data
        this.total = pg.total
        this.hasMore = (this.page * this.limit) < this.total
        this.usingSeed = true

      } finally {
        if (this.reqId === currentReqId) this.loading = false
      }
    },

    async likeArtwork(item) {
      if (!item) return
      const id = Number(item.id)

      const oldVal = item.like_total
      item.like_total = Number(oldVal || 0) + 1

      try {
        const out = await api.likeArtwork(id)
        if (out && out.totalLikes !== undefined) {
          item.like_total = Number(out.totalLikes)
        }
      } catch (e) {
        item.like_total = oldVal
        console.error('Like failed:', e)
      }
    }
  }
})
