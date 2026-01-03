import { createRouter, createWebHistory } from 'vue-router'

import GalleryView from '../views/GalleryView.vue'
import UploadView from '../views/UploadView.vue'
import AdminView from '../views/AdminView.vue'
import CreatorView from '../views/CreatorView.vue'
import LicenseView from '../views/LicenseView.vue' // 引入新页面

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'gallery', component: GalleryView },
    { path: '/upload', name: 'upload', component: UploadView },
    { path: '/admin', name: 'admin', component: AdminView },
    
    // 新增：授权查询页
    { path: '/license', name: 'license', component: LicenseView },

    // 作者页
    { path: '/creator/:uid', name: 'creator', component: CreatorView, props: true },

    // fallback
    { path: '/:pathMatch(.*)*', redirect: '/' }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router