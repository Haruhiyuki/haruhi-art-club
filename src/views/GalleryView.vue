<template>
  <section class="container-card">
    <!-- 状态切换：普通模式显示筛选栏，标签模式显示标签抬头 -->
    <FilterPanel
      v-if="!activeTag"
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
        <h2 class="tag-title">标签：{{ activeTag }}</h2>
      </div>
      <button class="btn-return" @click="exitTagMode">
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
      @open="openItem"
      @like="likeItem"
      @tag="onTag"
    />

    <ArtworkModal
      v-model="modalOpen"
      :item="activeItem"
      @tag="onTag"
      @close="activeItem=null"
    />
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useGalleryStore } from '../stores/galleryStore.js'
import FilterPanel from '../components/FilterPanel.vue'
import ArtworkGrid from '../components/ArtworkGrid.vue'
import ArtworkModal from '../components/ArtworkModal.vue'

const store = useGalleryStore()
const route = useRoute()

const modalOpen = ref(false)
const activeItem = ref(null)
const activeTag = ref('')

function reload(){
  store.page = 1
  store.load()
}

function openItem(it){
  activeItem.value = it
  modalOpen.value = true
}

function likeItem(it){
  store.likeArtwork(it)
}

// 进入标签模式
function onTag(t){
  activeTag.value = t
  // 关键修复：点击标签时，强制指定搜索范围为 'tag'，避免模糊匹配到标题
  store.setFilters({ q: t, searchField: 'tag' })
  reload()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  modalOpen.value = false
}

// 退出标签模式
function exitTagMode(){
  activeTag.value = ''
  // 退出时重置为综合搜索
  store.setFilters({ q: '', searchField: 'all' })
  reload()
}

onMounted(() => {
  if(route.query.q) store.setFilters({ q: route.query.q })
  store.load()
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

/* 标签模式专用样式 */
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