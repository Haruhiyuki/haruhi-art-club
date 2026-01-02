import { createRouter, createWebHistory } from 'vue-router'

import GalleryView from '../views/GalleryView.vue'
import UploadView from '../views/UploadView.vue'
import AdminView from '../views/AdminView.vue'
import CreatorView from '../views/CreatorView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'gallery', component: GalleryView },
    { path: '/upload', name: 'upload', component: UploadView },
    { path: '/admin', name: 'admin', component: AdminView },

    // ✅ 作者页（修复你点作者ID空白的问题）
    { path: '/creator/:uid', name: 'creator', component: CreatorView, props: true },

    // fallback
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
