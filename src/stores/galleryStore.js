import { defineStore } from 'pinia'
import { api } from '../services/api.js'
import { seedArtworks } from '../mock/seedData.js'

function norm(s){ return String(s || '').toLowerCase() }
function includesWord(hay, q){
  return norm(hay).includes(norm(q))
}

function filterLocal(items, { content='haruhi', sourceMode='all', q='', searchField='all' }){
  let arr = items.filter(x => x.status === 'approved')

  if(content === 'haruhi' || content === 'other'){
    arr = arr.filter(x => x.content_type === content)
  }

  if(sourceMode === 'personal' || sourceMode === 'network'){
    arr = arr.filter(x => x.source_type === sourceMode)
  }

  const qq = String(q || '').trim()
  if(qq){
    arr = arr.filter(x => {
      const tags = Array.isArray(x.tags) ? x.tags.join(' ') : ''
      const title = x.title || ''
      const desc = x.description || ''
      const uid = x.uploader_uid || ''
      const name = x.uploader_name || ''

      if(searchField === 'title') return includesWord(title, qq)
      if(searchField === 'uid') return includesWord(uid, qq) || includesWord(name, qq)
      if(searchField === 'tag') return includesWord(tags, qq)

      return (
        includesWord(title, qq) ||
        includesWord(desc, qq) ||
        includesWord(tags, qq) ||
        includesWord(uid, qq) ||
        includesWord(name, qq)
      )
    })
  }

  arr.sort((a,b) => String(b.created_at||'').localeCompare(String(a.created_at||'')))
  return arr
}

function paginate(arr, page, pageSize){
  const total = arr.length
  const start = (page - 1) * pageSize
  return { total, data: arr.slice(start, start + pageSize) }
}

export const useGalleryStore = defineStore('gallery', {
  state: () => ({
    content: 'haruhi',
    // ✅ 修复点：默认必须是 all（与你的 UI “全部”一致）
    sourceMode: 'all',

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

    // --- 请求计数器，解决竞态问题 ---
    reqId: 0
  }),

  actions: {
    setFilters(patch){
      if(patch.content !== undefined) this.content = patch.content
      if(patch.sourceMode !== undefined) this.sourceMode = patch.sourceMode
      if(patch.q !== undefined) this.q = patch.q
      if(patch.searchField !== undefined) this.searchField = patch.searchField
      if(patch.page !== undefined) this.page = patch.page
      if(patch.limit !== undefined) this.limit = patch.limit
    },

    async load(){
      const currentReqId = ++this.reqId

      this.loading = true
      this.error = ''
      this.usingSeed = false

      try{
        const commonParams = {
          q: this.q,
          searchField: this.searchField,
          page: this.page
        }

        let resultData = []
        let resultTotal = 0

        // --- 执行请求 ---
        if(this.sourceMode === 'balanced'){
          // 仍保留 balanced（如果你未来要用），但默认不会再走这里
          const halfA = Math.floor(this.limit / 2)
          const halfB = this.limit - halfA

          const [p1, p2] = await Promise.all([
            api.artworksList({
              status:'approved',
              content_type:this.content,
              source_type:'personal',
              ...commonParams,
              pageSize: halfA
            }),
            api.artworksList({
              status:'approved',
              content_type:this.content,
              source_type:'network',
              ...commonParams,
              pageSize: halfB
            }),
          ])

          if (this.reqId !== currentReqId) {
            console.log(`[GalleryStore] Ignored stale request #${currentReqId}`)
            return
          }

          let merged = [...(p1.data||[]), ...(p2.data||[])]
          merged.sort((a,b) => String(b.created_at||'').localeCompare(String(a.created_at||'')))

          resultData = merged
          resultTotal = Number(p1.total||0) + Number(p2.total||0)

        } else {
          // ✅ 修复点：all 模式不要传 source_type（让后端返回全量来源）
          const params = {
            status:'approved',
            content_type: this.content,
            ...commonParams,
            pageSize: this.limit
          }

          if(this.sourceMode === 'personal' || this.sourceMode === 'network'){
            params.source_type = this.sourceMode
          }

          const out = await api.artworksList(params)

          if (this.reqId !== currentReqId) {
            console.log(`[GalleryStore] Ignored stale request #${currentReqId}`)
            return
          }

          resultData = out.data || []
          resultTotal = Number(out.total || 0)
        }

        // --- 更新状态 ---
        this.list = resultData
        this.total = resultTotal

        if (this.total > 0) {
          this.hasMore = (this.page * this.limit) < this.total
        } else {
          this.hasMore = this.list.length >= this.limit
        }

        // Seed 兜底
        if(this.list.length === 0 && this.page === 1 && !this.q && this.total === 0){
          console.log('Using seed data fallback')
          const local = filterLocal(seedArtworks, {
            content:this.content,
            sourceMode:this.sourceMode,
            q:this.q,
            searchField:this.searchField
          })
          const pg = paginate(local, this.page, this.limit)

          this.list = pg.data
          this.total = pg.total
          this.hasMore = (this.page * this.limit) < this.total
          if(this.list.length > 0) this.usingSeed = true
        }

      }catch(e){
        if (this.reqId !== currentReqId) return

        console.warn('API Error, falling back to seed data:', e)
        this.error = ''

        const local = filterLocal(seedArtworks, {
          content:this.content,
          sourceMode:this.sourceMode,
          q:this.q,
          searchField:this.searchField
        })
        const pg = paginate(local, this.page, this.limit)

        this.list = pg.data
        this.total = pg.total
        this.hasMore = (this.page * this.limit) < this.total
        this.usingSeed = true

      }finally{
        if (this.reqId === currentReqId) {
          this.loading = false
        }
      }
    },

    async likeArtwork(item){
      if(!item) return
      const id = Number(item.id)
      if(Number.isFinite(id) && id < 0){
        item.like_total = Number(item.like_total || 0) + 1
        return
      }
      const oldVal = item.like_total
      item.like_total = Number(oldVal || 0) + 1
      try {
        const out = await api.likeArtwork(id)
        if(out && out.totalLikes !== undefined) {
          item.like_total = Number(out.totalLikes)
        }
      } catch(e){
        item.like_total = oldVal
        console.error('Like failed:', e)
      }
    }
  }
})
