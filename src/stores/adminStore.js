import { defineStore } from 'pinia'
import { api } from '../services/api.js'

export const useAdminStore = defineStore('admin', {
  state: () => ({
    pending: [],
    loading: false,
    error: ''
  }),

  actions: {
    async loadPending() {
      this.loading = true
      this.error = ''
      try {
        const out = await api.adminPendingArtworks()
        this.pending = out.data || []
      } catch (e) {
        this.error = e?.message || '加载失败'
      } finally {
        this.loading = false
      }
    },

    async approveArtwork(art, note = '') {
      await api.adminApproveArtwork(art.id, note)

      // 自动发分逻辑
      const shouldGrant = art?.source_type === 'personal' &&
        art?.content_type === 'haruhi' &&
        String(art?.uploader_uid || '').trim()

      if (shouldGrant) {
        try {
          await api.adminGrantPoints({
            uid: String(art.uploader_uid).trim(),
            artwork_id: Number(art.id),
            points: 20,
            note: '审核通过'
          })
        } catch (e) {
          console.warn('Grant points failed:', e)
        }
      }
      this.pending = this.pending.filter(p => p.id !== art.id)
    },

    async rejectArtwork(art, note = '') {
      await api.adminRejectArtwork(art.id, note)
      this.pending = this.pending.filter(p => p.id !== art.id)
    },

    // 从列表中移除（用于硬删除或状态变更后）
    removeItem(id) {
      this.pending = this.pending.filter(p => p.id !== id)
    }
  }
})