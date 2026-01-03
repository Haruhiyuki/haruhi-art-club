<template>
  <section class="container-card">
    <!-- 状态切换：普通模式显示筛选栏，标签/作者模式显示专属抬头 -->
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
        <!-- 这里可以放置加载状态或结果数量等信息 -->
        <span class="muted" v-if="store.usingSeed"></span>
      </div>
    </div>

    <div v-if="store.error" class="errorBox">{{ store.error }}</div>

    <ArtworkGrid
      v-else
      :items="store.list"
      @open="openItem"
      @like="likeItem"
      @tag="onTag"
      @author="onAuthor"
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
import { onMounted, ref, watch } from 'vue'
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
  // authorInfo: { uid, name }
  // 我们在 URL 里只存 uid，name 通过列表数据反查或临时显示
  router.push({ query: { ...route.query, author: authorInfo.uid, tag: undefined, artwork: undefined } })
}

// 3. 打开详情 -> 更新 URL
function openItem(it){
  router.push({ query: { ...route.query, artwork: it.id } })
}

// 4. 关闭详情 -> 更新 URL
function closeModal(){
  // 移除 artwork 参数
  const q = { ...route.query }
  delete q.artwork
  router.push({ query: q })
}

// 5. 退出特殊模式 -> 清空相关 URL 参数
function exitMode(){
  router.push({ query: {} }) // 回到纯净路径
}

// 监听路由变化，响应式更新视图状态 (支持浏览器后退/前进/分享链接)
watch(() => route.query, (q, oldQ) => {
  const newTag = q.tag
  const newAuthorUid = q.author
  const newArtworkId = q.artwork
  
  // A. 处理标签模式变化
  if (newTag && newTag !== activeTag.value) {
    activeTag.value = newTag
    activeAuthor.value = null
    store.setFilters({ q: newTag, searchField: 'tag' })
    reload()
  } else if (!newTag && activeTag.value) {
    activeTag.value = ''
    if (!newAuthorUid) { // 如果也不是作者模式，则重置回普通画廊
      store.setFilters({ q: '', searchField: 'all' })
      reload()
    }
  }

  // B. 处理作者模式变化
  if (newAuthorUid) {
    // 如果当前已经是该作者模式，不重复刷新
    if (!activeAuthor.value || activeAuthor.value.uid !== newAuthorUid) {
      activeAuthor.value = { uid: newAuthorUid, name: newAuthorUid } // 名字暂时用UID占位，稍后从列表修正
      activeTag.value = ''
      store.setFilters({ q: newAuthorUid, searchField: 'uid' })
      reload()
    }
  } else if (!newAuthorUid && activeAuthor.value) {
    activeAuthor.value = null
    if (!newTag) {
       store.setFilters({ q: '', searchField: 'all' })
       reload()
    }
  }

  // C. 处理详情弹窗变化
  if (newArtworkId) {
    // 尝试在当前列表中查找 (支持列表已加载的情况)
    const target = store.list.find(i => String(i.id) === String(newArtworkId))
    if (target) {
      activeItem.value = target
      modalOpen.value = true
    }
    // 如果列表中没找到（例如分享链接进来），需要等列表加载完再匹配，见下方 store.list 监听
  } else {
    modalOpen.value = false
    activeItem.value = null
  }
}, { immediate: true })

// 监听列表数据变化，用于修正作者名显示和处理深层链接的详情打开
watch(() => store.list, (list) => {
  if (!list || list.length === 0) return

  // 1. 修正作者名 (如果当前是作者模式且名字只是UID)
  if (activeAuthor.value && activeAuthor.value.name === activeAuthor.value.uid) {
    // 既然搜的是 UID，列表中第一个作品应该就是该作者的
    const first = list[0]
    if (first && first.uploader_name) {
      activeAuthor.value.name = first.uploader_name
    }
  }

  // 2. 尝试打开详情 (针对直接访问 ?artwork=xxx 的情况)
  const targetId = route.query.artwork
  if (targetId && !modalOpen.value) {
    const target = list.find(i => String(i.id) === String(targetId))
    if (target) {
      activeItem.value = target
      modalOpen.value = true
    }
  }
})

// 初始化
onMounted(() => {
  // 1. 如果 URL 带有查询参数 q (普通搜索分享)，同步到 store
  if (route.query.q) {
    store.setFilters({ q: route.query.q })
  }

  // 2. 判断是否需要初始加载
  // watch 只负责监听 tag 和 author 的变化并触发重载。
  // 如果当前 URL 没有 tag 也没有 author (例如只有 artwork 参数，或者纯净首页，或者只有 q)，
  // 则需要手动触发一次初始加载。
  const { tag, author } = route.query
  if (!tag && !author) {
    store.load()
  }
})
</script>

<style scoped>
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

/* 作者模式特殊样式 */
.author-title::before {
  content: '@'; /* 作者用 @ 符号 */
  color: #e9b5fd; /* 紫色 */
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