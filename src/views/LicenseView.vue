<template>
  <div class="page-container">
    <div class="header">
      <div class="title-group">
        <h1>特别授权查询</h1>
        <p class="subtitle">仅展示对应援团/社团有额外授权许可的个人作品</p>
      </div>
      <div class="decoration">
        <!-- 简单的装饰图标 -->
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      数据加载中...
    </div>

    <div v-else-if="list.length === 0" class="empty-state">
      暂无包含特别授权的作品
    </div>

    <div v-else class="license-table">
      <!-- 表头 -->
      <div class="row header-row">
        <div class="col-img">预览</div>
        <div class="col-info">作品信息</div>
        <div class="col-auth">作者</div>
        <div class="col-lic">授权详情</div>
      </div>

      <!-- 列表内容 -->
      <div 
        v-for="item in list" 
        :key="item.id" 
        class="row item-row"
        @click="openItem(item)"
        role="button"
        tabindex="0"
      >
        <div class="col-img">
          <div class="thumb-box">
            <img :src="item.image_url" loading="lazy" alt="" />
          </div>
        </div>
        
        <div class="col-info">
          <div class="art-title">{{ item.title }}</div>
          <div class="art-desc">{{ truncate(item.description, 30) }}</div>
        </div>

        <div class="col-auth">
          <div class="auth-name">{{ item.uploader_name || '匿名' }}</div>
          <div class="auth-uid">{{ item.uploader_uid }}</div>
        </div>

        <div class="col-lic">
          <div class="lic-tags">
            <span v-for="tag in getGroupLicenses(item)" :key="tag" class="lic-tag">
              {{ tag }}
            </span>
          </div>
        </div>
        
        <!-- 悬停时的箭头提示 -->
        <div class="arrow-hint">➔</div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <ArtworkModal
      v-model="modalOpen"
      :item="activeItem"
      @close="activeItem = null"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../services/api.js'
import ArtworkModal from '../components/ArtworkModal.vue'

const list = ref([])
const loading = ref(true)
const modalOpen = ref(false)
const activeItem = ref(null)

// 获取数据：只拉取 source_type='personal' 的作品，然后在前端筛选有 GROUP 授权的
async function loadData() {
  loading.value = true
  try {
    // 假设一次拉取较多数据进行筛选，实际项目中可能需要后端支持专门的筛选参数
    const res = await api.artworksList({ 
      source_type: 'personal', 
      status: 'approved',
      pageSize: 100 
    })
    
    const rawList = res.data || []
    
    // 筛选逻辑：licenses 数组中包含以 "GROUP:" 开头的项
    list.value = rawList.filter(item => {
      const licenses = Array.isArray(item.licenses) ? item.licenses : []
      return licenses.some(l => l.startsWith('GROUP:'))
    })

  } catch (e) {
    console.error('Load failed', e)
  } finally {
    loading.value = false
  }
}

// 提取 GROUP 授权文本
function getGroupLicenses(item) {
  const licenses = Array.isArray(item.licenses) ? item.licenses : []
  return licenses
    .filter(l => l.startsWith('GROUP:'))
    .map(l => l.replace('GROUP:', ''))
}

function truncate(str, len) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '...' : str
}

function openItem(item) {
  activeItem.value = item
  modalOpen.value = true
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 40px auto;
  /* 增加内边距以适应背景框 */
  padding: 40px; 
  min-height: 80vh;
  
  /* --- 新增：背景蒙版样式 --- */
  background: rgba(30, 41, 59, 0.75); /* 深蓝灰色半透明背景 */
  backdrop-filter: blur(16px);        /* 毛玻璃效果 */
  -webkit-backdrop-filter: blur(16px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.title-group h1 {
  font-size: 32px;
  font-weight: 900;
  color: #fff;
  margin: 0 0 8px 0;
  letter-spacing: 1px;
}

.subtitle {
  color: rgba(255,255,255,0.7); /* 稍微调亮一点 */
  font-size: 14px;
}

/* --- 列表样式 --- */
.license-table {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.row {
  display: grid;
  /* 定义列宽：图 80px | 信息 自适应 | 作者 150px | 授权 40% */
  grid-template-columns: 80px 1fr 150px 2fr; 
  align-items: center;
  gap: 20px;
  padding: 12px 20px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.header-row {
  background: rgba(0,0,0,0.2);
  font-weight: 700;
  color: rgba(255,255,255,0.6);
  font-size: 13px;
  padding: 10px 20px;
}

.item-row {
  background: rgba(255,255,255,0.08); /* 稍微增加不透明度 */
  border: 1px solid rgba(255,255,255,0.05);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  height: 84px; /* 固定高度，但不至于太高 */
}

.item-row:hover {
  background: rgba(255,255,255,0.15);
  transform: translateX(4px);
  border-color: rgba(255,255,255,0.3);
}

/* 图片列 */
.col-img {
  display: flex;
  align-items: center;
}
.thumb-box {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(255,255,255,0.1);
}
.thumb-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 信息列 */
.col-info {
  overflow: hidden;
}
.art-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.art-desc {
  font-size: 12px;
  color: rgba(255,255,255,0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 作者列 */
.auth-name {
  font-weight: 600;
  color: #a5b4fc;
}
.auth-uid {
  font-size: 12px;
  color: rgba(255,255,255,0.4);
  font-family: monospace;
}

/* 授权列 */
.col-lic {
  display: flex;
  align-items: center;
}
.lic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 60px; /* 防止过多溢出 */
  overflow: hidden;
}
.lic-tag {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #6ee7b7;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.2;
}

/* 箭头提示 */
.arrow-hint {
  position: absolute;
  right: 20px;
  opacity: 0;
  color: rgba(255,255,255,0.5);
  font-size: 20px;
  transition: all 0.2s;
}
.item-row:hover .arrow-hint {
  opacity: 1;
  transform: translateX(5px);
}

/* 状态提示 */
.loading-state, .empty-state {
  text-align: center;
  padding: 60px;
  color: rgba(255,255,255,0.6);
  font-size: 16px;
  background: rgba(0,0,0,0.2);
  border-radius: 12px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .page-container {
    /* 调整外边距：顶部避开导航，左右留出空隙显示圆角背景 */
    margin: 80px 12px 30px;
    padding: 20px 12px; 
  }

  .row {
    grid-template-columns: 60px 1fr;
    grid-template-areas: 
      "img info"
      "img lic";
    gap: 8px 12px;
    height: auto;
    padding: 16px;
  }
  
  .header-row { display: none; } /* 手机端隐藏表头 */
  
  .col-img { grid-area: img; }
  .col-info { grid-area: info; }
  .col-lic { grid-area: lic; }
  
  .col-auth { 
    display: none; /* 手机端空间不足，暂隐藏作者，弹窗里有 */
  }
  
  .lic-tags {
    flex-wrap: nowrap;
    overflow-x: auto; /* 允许横向滚动 */
    padding-bottom: 4px;
  }
  .lic-tag {
    white-space: nowrap;
  }
  
  .arrow-hint { display: none; }
}
</style>