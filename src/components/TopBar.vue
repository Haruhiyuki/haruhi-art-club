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
      <RouterLink :class="linkClass('/upload')" to="/upload" data-sfx="click">投稿</RouterLink>
      <button class="adminBtn leaf-btn" type="button" @click="enterAdmin" data-sfx="click">
        后台
      </button>
    </nav>
  </div>
</template>

<style scoped>
.topbar__inner {
  /* --- 布局定位 (保留) --- */
  position: fixed; 
  top: 0;
  left: 0;
  right: 0; 
  height: 72px; 
  z-index: 999; 
  
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 24px;
  border-radius: 0; 

  /* --- 核心修改：视觉全透明 --- */
  background: transparent; /* 背景透明 */
  border: none;            /* 去掉边框 */
  box-shadow: none;        /* 去掉阴影/遮罩 */
  backdrop-filter: none;   /* 去掉毛玻璃，追求极致透视 */
  -webkit-backdrop-filter: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  color: #fff; 
  text-shadow: 0 2px 4px rgba(0,0,0,0.6);
  /* 手机端允许 logo 压缩空间，防止溢出 */
  flex-shrink: 1; 
  min-width: 0;
}

.brand__mark {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background-image: url('avatar.jpg');
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  background-color: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}

.brand__text {
  /* 确保文字在小屏幕下能截断而不是撑开 */
  min-width: 0;
  overflow: hidden;
}

.brand__title {
  font-weight: 950;
  letter-spacing: .5px;
  line-height: 1.1;
  font-size: 15px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.brand__sub {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 800;
  opacity: .95;
  letter-spacing: 0.5px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.nav {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-shrink: 0; /* 导航栏按钮不许压缩 */
}

.navlink {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 24px;
  font-weight: 900;
  font-size: 14px;
  letter-spacing: 1px;
  border-radius: 2px 20px 2px 20px;
  background: linear-gradient(135deg, #d9f99d 0%, #86efac 100%);
  color: #14532d;
  border: 1px solid rgba(255,255,255,0.5);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.navlink:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 8px 16px rgba(0,0,0,0.25); }
.navlink.on {
  background: linear-gradient(135deg, #bef264 0%, #4ade80 100%);
  color: #064e3b;
  text-shadow: 0 1px 0 rgba(255,255,255,0.3);
  transform: scale(1.1) rotate(-3deg);
  box-shadow: 0 6px 14px rgba(20, 200, 100, 0.4);
  z-index: 5;
}

.adminBtn {
  border: none; cursor: pointer; padding: 8px 20px; font-weight: 900; font-size: 13px;
  border-radius: 20px 2px 20px 2px;
  background: linear-gradient(135deg, #fdba74 0%, #fb923c 100%);
  color: #7c2d12;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transition: transform 0.2s ease;
}
.adminBtn:hover { transform: rotate(5deg) scale(1.1); }
.adminBtn:active { transform: scale(0.95); }

/* --- 手机端适配 --- */
@media (max-width: 768px) {
  .topbar__inner {
    padding: 0 16px;
  }
  
  .nav {
    gap: 12px; /* 缩小按钮间距 */
  }

  .navlink {
    padding: 6px 16px; /* 稍微缩小按钮尺寸 */
    font-size: 13px;
  }

  /* 手机端隐藏后台按钮 */
  .adminBtn {
    display: none;
  }
  
  /* 调整标题大小以适应小屏 */
  .brand__title {
    font-size: 13px;
  }
  .brand__sub {
    font-size: 10px;
  }
}
</style>