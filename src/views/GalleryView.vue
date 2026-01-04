<template>
  <section class="container-card">
    <FilterPanel
      v-if="!activeTag && !activeAuthor"
      :content="store.content"
      :sourceMode="store.sourceMode"
      :q="store.q"
      :searchField="store.searchField"
      @update:content="v => { store.setFilters({ content: v }); reload() }"
      @update:sourceMode="v => { store.setFilters({ sourceMode: v }); reload() }"
      @update:q="v => store.setFilters({ q: v })"
      @update:searchField="v => store.setFilters({ searchField: v })"
      @search="reload"
      @clear="store.setFilters({ searchField: 'all' })"
    />

    <div v-else class="tag-header">
      <div class="tag-info">
        <h2 v-if="activeTag" class="tag-title">标签：{{ activeTag }}</h2>
        <h2 v-else-if="activeAuthor" class="tag-title author-title">
          <span>作者：</span>
          <span class="highlight">{{ activeAuthor.name }}</span>
        </h2>
      </div>
      <button class="btn-return" @click="exitMode">
        <span class="icon">↩</span> 返回画廊
      </button>
    </div>

    <div class="statusRow">
      <div class="left">
        <span class="muted" v-if="store.usingSeed"></span>
      </div>
    </div>

    <div v-if="store.error" class="errorBox">{{ store.error }}</div>

    <ArtworkGrid
      v-else
      :items="store.list"
      :page="store.page"
      :hasMore="store.hasMore"
      :loading="store.loading"
      @open="openItem"
      @like="likeItem"
      @tag="onTag"
      @author="onAuthor"
      @prevPage="handlePrevPage"
      @nextPage="handleNextPage"
    />

    <ArtworkModal
      :model-value="modalOpen"
      :item="activeItem"
      @update:model-value="val => !val && closeModal()"
      @tag="onTag"
      @close="closeModal"
    />
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGalleryStore } from '../stores/galleryStore.js'
import FilterPanel from '../components/FilterPanel.vue'
import ArtworkGrid from '../components/ArtworkGrid.vue'
import ArtworkModal from '../components/ArtworkModal.vue'

const store = useGalleryStore()
const route = useRoute()
const router = useRouter()

const modalOpen = ref(false)
const activeItem = ref(null)
const activeTag = ref('')
const activeAuthor = ref(null) // { uid, name }

// --- 翻页处理 ---
function handlePrevPage() {
  if (store.page > 1) {
    store.page--
    store.load()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function handleNextPage() {
  if (store.hasMore) {
    store.page++
    store.load()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// --- 响应式 PageSize 逻辑 ---
// allowedToReload: 初始化时设为 false，防止在 onMounted 里重复触发
function updatePageSize(allowedToReload = true) {
  const isMobile = window.innerWidth <= 768
  const targetSize = isMobile ? 8 : 12
  
  if (store.limit !== targetSize) {
    store.limit = targetSize
    // 只有非初始化阶段，尺寸变化才触发重载
    if (allowedToReload) {
      reload()
    }
  }
}

function reload(){
  store.page = 1
  store.load()
}

function likeItem(it){
  store.likeArtwork(it)
}

// ---------------------------------------------------------
// URL 驱动的核心逻辑
// ---------------------------------------------------------

// 1. 进入标签模式 -> 更新 URL
function onTag(t){
  router.push({ query: { ...route.query, tag: t, author: undefined, artwork: undefined } })
}

// 2. 进入作者模式 -> 更新 URL
function onAuthor(authorInfo){
  router.push({ query: { ...route.query, author: authorInfo.uid, tag: undefined, artwork: undefined } })
}

// 3. 打开详情 -> 更新 URL
function openItem(it){
  router.push({ query: { ...route.query, artwork: it.id } })
}

// 4. 关闭详情 -> 更新 URL
function closeModal(){
  const q = { ...route.query }
  delete q.artwork
  router.push({ query: q })
}

// 5. 退出特殊模式 -> 清空相关 URL 参数
function exitMode(){
  router.push({ query: {} }) 
}

// --- 核心：将路由解析逻辑提取出来 ---
function syncStateFromRoute(q) {
  const newTag = q.tag
  const newAuthorUid = q.author
  const newArtworkId = q.artwork
  
  let needsReload = false

  // A. 处理标签模式变化
  if (newTag && newTag !== activeTag.value) {
    activeTag.value = newTag
    activeAuthor.value = null
    store.setFilters({ q: newTag, searchField: 'tag' })
    needsReload = true
  } else if (!newTag && activeTag.value) {
    activeTag.value = ''
    // 如果也没有作者，则回到默认搜索
    if (!newAuthorUid) {
      store.setFilters({ q: '', searchField: 'all' })
      needsReload = true
    }
  }

  // B. 处理作者模式变化
  if (newAuthorUid) {
    if (!activeAuthor.value || activeAuthor.value.uid !== newAuthorUid) {
      activeAuthor.value = { uid: newAuthorUid, name: newAuthorUid }
      activeTag.value = ''
      store.setFilters({ q: newAuthorUid, searchField: 'uid' })
      needsReload = true
    }
  } else if (!newAuthorUid && activeAuthor.value) {
    activeAuthor.value = null
    if (!newTag) {
       store.setFilters({ q: '', searchField: 'all' })
       needsReload = true
    }
  }

  // C. 处理详情弹窗
  if (newArtworkId) {
    const target = store.list.find(i => String(i.id) === String(newArtworkId))
    if (target) {
      activeItem.value = target
      modalOpen.value = true
    }
  } else {
    modalOpen.value = false
    activeItem.value = null
  }

  // 如果是在初始化时调用，或者参数确实变了，执行加载
  // 注意：如果 q.q 存在 (普通搜索)，也需要设置
  if(q.q && q.q !== store.q){
     store.setFilters({ q: q.q })
     needsReload = true
  }

  // 返回是否需要加载，供调用者判断（虽然这里大部分情况直接 reload 也行）
  return needsReload
}

// 监听路由变化 (注意：immediate: false，由 onMounted 手动触发第一次)
watch(() => route.query, (newQ) => {
  const shouldLoad = syncStateFromRoute(newQ)
  if(shouldLoad) reload()
}, { immediate: false })


// 监听列表数据变化 (修正作者名/打开详情)
watch(() => store.list, (list) => {
  if (!list || list.length === 0) return

  if (activeAuthor.value && activeAuthor.value.name === activeAuthor.value.uid) {
    const first = list[0]
    if (first && first.uploader_name) {
      activeAuthor.value.name = first.uploader_name
    }
  }

  const targetId = route.query.artwork
  if (targetId && !modalOpen.value) {
    const target = list.find(i => String(i.id) === String(targetId))
    if (target) {
      activeItem.value = target
      modalOpen.value = true
    }
  }
})

// --- 初始化顺序修复 ---
onMounted(() => {
  // 1. 先确定尺寸 (更新 store.limit)，但不触发 reload
  updatePageSize(false)

  // 2. 再根据 URL 设置 Filter
  const needsReload = syncStateFromRoute(route.query)

  // 3. 最后统一加载一次
  // 如果 syncStateFromRoute 认为需要 reload，或者当前列表为空，则加载
  if (needsReload || store.list.length === 0) {
    reload()
  }

  // 4. 绑定监听
  window.addEventListener('resize', () => updatePageSize(true))
})

onUnmounted(() => {
  window.removeEventListener('resize', () => updatePageSize(true))
})
</script>

<style scoped>
/* 样式保持不变，直接复用你之前的即可 */
.container-card {
  max-width: 1450px;
  margin: 0 auto;
}

.statusRow{ margin:14px 0; display:flex; justify-content:space-between; align-items:center; }
.left{ display:flex; gap:10px; align-items:center; }
.errorBox{ padding:12px; background:#fee; color:red; border-radius:8px; }
.muted{ color:#999; font-size:12px; }

/* 标签/作者模式专用样式 */
.tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
  margin-bottom: 20px;
  border-bottom: 1px dashed rgba(0,0,0,0.08);
  animation: fadeIn 0.4s ease;
}

.tag-title {
  font-size: 26px;
  font-weight: 950;
  color: #1a1a1a;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.tag-title::before {
  content: '#';
  color: var(--neon-cyan, #00f2ff);
  font-size: 32px;
  font-weight: 300;
  transform: translateY(-2px);
}

.author-title::before {
  content: '@'; 
  color: #e9b5fd; 
}
.author-title .highlight {
  color: #1a1a1a;
}

.btn-return {
  padding: 10px 20px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 99px;
  cursor: pointer;
  font-weight: 800;
  color: #555;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.03);
}

.btn-return:hover {
  background: #fff;
  color: #000;
  border-color: #ccc;
  transform: translateX(-4px);
  box-shadow: 0 6px 15px rgba(0,0,0,0.08);
}

.btn-return:active {
  transform: translateX(-4px) scale(0.96);
}

.icon { 
  font-size: 18px; 
  line-height: 1;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .tag-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 0;
  }
  .btn-return {
    width: 100%;
    justify-content: center;
  }
}
</style>