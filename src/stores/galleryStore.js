import { defineStore } from 'pinia'
import { api } from '../services/api.js'
import { seedArtworks } from '../mock/seedData.js'

function norm(s){ return String(s || '').toLowerCase() }
function includesWord(hay, q){
  return norm(hay).includes(norm(q))
}

function filterLocal(items, { content='haruhi', sourceMode='balanced', q='' }){
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
      return (
        includesWord(x.title, qq) ||
        includesWord(x.description, qq) ||
        includesWord(tags, qq) ||
        includesWord(x.uploader_uid, qq)
      )
    })
  }

  // 默认按 created_at 倒序
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
    content: 'haruhi',          // haruhi|other
    sourceMode: 'balanced',     // balanced|personal|network
    q: '',
    page: 1,
    pageSize: 24,

    loading: false,
    error: '',
    list: [],
    total: 0,

    usingSeed: false,
  }),

  actions: {
    setFilters(patch){
      if(patch.content !== undefined) this.content = patch.content
      if(patch.sourceMode !== undefined) this.sourceMode = patch.sourceMode
      if(patch.q !== undefined) this.q = patch.q
      if(patch.page !== undefined) this.page = patch.page
      if(patch.pageSize !== undefined) this.pageSize = patch.pageSize
    },

    async load(){
      this.loading = true
      this.error = ''
      this.usingSeed = false

      try{
        // 1. 混合模式 (balanced)：前端拉取两路数据并合并
        if(this.sourceMode === 'balanced'){
          const halfA = Math.floor(this.pageSize / 2)
          const halfB = this.pageSize - halfA

          const base = { q: this.q, page: this.page, pageSize: halfA }
          const baseB = { q: this.q, page: this.page, pageSize: halfB }

          const [p1, p2] = await Promise.all([
            api.artworksList({ status:'approved', content_type:this.content, source_type:'personal', ...base }),
            api.artworksList({ status:'approved', content_type:this.content, source_type:'network', ...baseB }),
          ])

          let merged = [...(p1.data||[]), ...(p2.data||[])]
          let total = Number(p1.total||0) + Number(p2.total||0)

          // 补齐逻辑（如果一侧数据不足）
          if(merged.length < this.pageSize){
            const need = this.pageSize - merged.length
            // 如果个人作品少，用网络作品补
            if((p1.data||[]).length < halfA){
              const extra = await api.artworksList({
                status:'approved',
                content_type:this.content,
                source_type:'network',
                q: this.q,
                page: this.page + 1, // 简单起见，从下一页补（可能重，但保证能填满）
                pageSize: need,
              })
              merged = merged.concat(extra.data || [])
              total = Math.max(total, Number(extra.total||0) + Number(p1.total||0))
            } else {
              // 反之用个人作品补
              const extra = await api.artworksList({
                status:'approved',
                content_type:this.content,
                source_type:'personal',
                q: this.q,
                page: this.page + 1,
                pageSize: need,
              })
              merged = merged.concat(extra.data || [])
              total = Math.max(total, Number(extra.total||0) + Number(p2.total||0))
            }
          }

          merged.sort((a,b) => String(b.created_at||'').localeCompare(String(a.created_at||'')))
          this.list = merged.slice(0, this.pageSize)
          this.total = total
        } 
        // 2. 普通模式
        else {
          const out = await api.artworksList({
            status:'approved',
            content_type: this.content,
            source_type: this.sourceMode,
            q: this.q,
            page: this.page,
            pageSize: this.pageSize
          })
          this.list = out.data || []
          this.total = Number(out.total || 0)
        }

        // 3. Seed 兜底：如果后端完全没数据 (数据库是空的)，展示本地 mock 数据
        // 注意：只在第一页且 total 为 0 时触发
        if(this.total === 0 && this.page === 1 && !this.q){
          const local = filterLocal(seedArtworks, { content:this.content, sourceMode:this.sourceMode, q:this.q })
          const pg = paginate(local, this.page, this.pageSize)
          this.list = pg.data
          this.total = pg.total
          if(this.list.length > 0) this.usingSeed = true
        }

      }catch(e){
        console.warn('API Error, falling back to seed data:', e)
        this.error = e?.message || '加载失败'
        // 出错也尝试展示 Mock 数据
        const local = filterLocal(seedArtworks, { content:this.content, sourceMode:this.sourceMode, q:this.q })
        const pg = paginate(local, this.page, this.pageSize)
        this.list = pg.data
        this.total = pg.total
        this.usingSeed = true
      }finally{
        this.loading = false
      }
    },

    async likeArtwork(item){
      if(!item) return
      const id = Number(item.id)

      // 负数 ID 是 Mock 数据，仅本地更新
      if(Number.isFinite(id) && id < 0){
        item.like_total = Number(item.like_total || 0) + 1
        return
      }

      try {
        const out = await api.likeArtwork(id)
        item.like_total = Number(out.totalLikes || (Number(item.like_total||0)+1))
      } catch(e){
        // 忽略错误（如限额）
      }
    }
  }
})