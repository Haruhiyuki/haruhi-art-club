import { defineStore } from 'pinia'
import { api } from '../services/api.js'
import { seedArtworks } from '../mock/seedData.js'

function norm(s){ return String(s || '').toLowerCase() }
function includesWord(hay, q){
  return norm(hay).includes(norm(q))
}

function filterLocal(items, { content='haruhi', sourceMode='balanced', q='', searchField='all' }){
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
      // 简单的本地模拟搜索逻辑
      const tags = Array.isArray(x.tags) ? x.tags.join(' ') : ''
      const title = x.title || ''
      const desc = x.description || ''
      const uid = x.uploader_uid || ''
      const name = x.uploader_name || ''

      if(searchField === 'title') return includesWord(title, qq)
      if(searchField === 'uid') return includesWord(uid, qq) || includesWord(name, qq)
      if(searchField === 'tag') return includesWord(tags, qq)
      
      // all
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
    sourceMode: 'balanced',
    q: '',
    searchField: 'all', // 新增：搜索范围字段
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
      if(patch.searchField !== undefined) this.searchField = patch.searchField // 新增
      if(patch.page !== undefined) this.page = patch.page
      if(patch.pageSize !== undefined) this.pageSize = patch.pageSize
    },

    async load(){
      this.loading = true
      this.error = ''
      this.usingSeed = false

      try{
        // 公共参数，现在包含 searchField
        const commonParams = {
          q: this.q,
          searchField: this.searchField, 
          page: this.page 
        }

        // 1. 混合模式 (balanced)
        if(this.sourceMode === 'balanced'){
          const halfA = Math.floor(this.pageSize / 2)
          const halfB = this.pageSize - halfA

          const [p1, p2] = await Promise.all([
            api.artworksList({ status:'approved', content_type:this.content, source_type:'personal', ...commonParams, pageSize: halfA }),
            api.artworksList({ status:'approved', content_type:this.content, source_type:'network', ...commonParams, pageSize: halfB }),
          ])

          let merged = [...(p1.data||[]), ...(p2.data||[])]
          let total = Number(p1.total||0) + Number(p2.total||0)

          // 补齐逻辑
          if(merged.length < this.pageSize){
            const need = this.pageSize - merged.length
            if((p1.data||[]).length < halfA){
              const extra = await api.artworksList({
                status:'approved',
                content_type:this.content,
                source_type:'network',
                ...commonParams,
                page: this.page + 1,
                pageSize: need,
              })
              merged = merged.concat(extra.data || [])
              total = Math.max(total, Number(extra.total||0) + Number(p1.total||0))
            } else {
              const extra = await api.artworksList({
                status:'approved',
                content_type:this.content,
                source_type:'personal',
                ...commonParams,
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
            ...commonParams,
            pageSize: this.pageSize
          })
          this.list = out.data || []
          this.total = Number(out.total || 0)
        }

        // 3. Seed 兜底
        if(this.total === 0 && this.page === 1 && !this.q){
          const local = filterLocal(seedArtworks, { 
            content:this.content, 
            sourceMode:this.sourceMode, 
            q:this.q, 
            searchField:this.searchField 
          })
          const pg = paginate(local, this.page, this.pageSize)
          this.list = pg.data
          this.total = pg.total
          if(this.list.length > 0) this.usingSeed = true
        }

      }catch(e){
        console.warn('API Error, falling back to seed data:', e)
        this.error = e?.message || '加载失败'
        const local = filterLocal(seedArtworks, { 
          content:this.content, 
          sourceMode:this.sourceMode, 
          q:this.q,
          searchField:this.searchField
        })
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
      if(Number.isFinite(id) && id < 0){
        item.like_total = Number(item.like_total || 0) + 1
        return
      }
      const oldVal = item.like_total
      item.like_total = Number(oldVal || 0) + 1
      try {
        const out = await api.likeArtwork(id)
        item.like_total = Number(out.totalLikes)
      } catch(e){
        item.like_total = oldVal
        console.error('Like failed:', e)
      }
    }
  }
})