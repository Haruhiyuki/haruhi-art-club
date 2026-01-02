<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const isActive = (path) => {
  if (path === '/' && route.path.startsWith('/creator')) return true
  return route.path === path
}

const linkClass = (path) => ['navlink', isActive(path) ? 'on' : ''].join(' ')

function enterAdmin() {
  const pw = prompt('请输入管理后台密码：')
  if (!pw) return
  localStorage.setItem('admin_pw', pw)
  router.push('/admin')
}
</script>

<template>
  <div class="topbar__inner">
    <div class="brand" role="button" tabindex="0" @click="router.push('/')" @keydown.enter="router.push('/')">
      <div class="brand__mark" aria-hidden="true"></div>
      <div class="brand__text">
        <div class="brand__title">凉宫同好社 · 绘画部画廊</div>
        <div class="brand__sub">Haruhi Art Gallery</div>
      </div>
    </div>

    <nav class="nav">
      <RouterLink :class="linkClass('/')" to="/" data-sfx="click">画廊</RouterLink>

      <!-- ✅ 统一：投稿路由用 /upload（你现在能用的就是它） -->
      <RouterLink :class="linkClass('/upload')" to="/upload" data-sfx="click">投稿</RouterLink>

      <button class="adminBtn" type="button" @click="enterAdmin" data-sfx="click">
        管理后台
      </button>
    </nav>
  </div>
</template>

<style scoped>
.topbar__inner{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:12px 14px;
  border-radius:18px;
  background: rgba(255,255,255,.92);
  border: 1px solid rgba(0,0,0,.10);
  box-shadow: 0 18px 44px rgba(0,0,0,.08);
  backdrop-filter: blur(10px);
}

.brand{
  display:flex;
  align-items:center;
  gap:12px;
  cursor:pointer;
  user-select:none;
}
.brand__mark{
  width:38px;
  height:38px;
  border-radius:14px;
  background: linear-gradient(180deg, rgba(20,184,166,1), rgba(16,120,110,1));
  box-shadow: 0 14px 26px rgba(16,120,110,.22);
}
.brand__title{
  font-weight: 950;
  letter-spacing: .2px;
  line-height: 1.1;
}
.brand__sub{
  margin-top:2px;
  font-size: 12px;
  font-weight: 850;
  opacity: .72;
}

.nav{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}
.navlink{
  padding:8px 12px;
  border-radius: 999px;
  font-weight: 950;
  border:1px solid rgba(0,0,0,.10);
  background: rgba(255,255,255,.75);
  opacity:.88;
  transition: transform .12s ease, background .12s ease, opacity .12s ease;
}
.navlink:hover{ opacity:1; }
.navlink:active{ transform: scale(1.05); }
.navlink.on{
  background: rgba(0,0,0,.88);
  color:#fff;
  border-color: rgba(0,0,0,.88);
}

.adminBtn{
  padding:8px 12px;
  border-radius:999px;
  border:1px solid rgba(0,0,0,.12);
  background: linear-gradient(180deg, rgba(20,184,166,.95), rgba(16,120,110,.95));
  color:#fff;
  font-weight: 950;
  cursor:pointer;
  box-shadow: 0 10px 20px rgba(16,120,110,.18);
  transition: transform .12s ease;
}
.adminBtn:active{ transform: scale(1.05); }
</style>
