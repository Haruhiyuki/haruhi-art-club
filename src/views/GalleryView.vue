<template>
  <section class="container-card">
    <FilterPanel
      :content="store.content"
      :sourceMode="store.sourceMode"
      :q="store.q"
      @update:content="v => { store.setFilters({ content: v }); reload() }"
      @update:sourceMode="v => { store.setFilters({ sourceMode: v }); reload() }"
      @update:q="v => store.setFilters({ q: v })"
      @search="reload"
    />

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

function reload(){
  store.page = 1
  store.load()
}

function prevPage(){
  if(store.page > 1){
    store.page--
    store.load()
  }
}

function nextPage(){
  store.page++
  store.load()
}

function openItem(it){
  activeItem.value = it
  modalOpen.value = true
}

function likeItem(it){
  store.likeArtwork(it)
}

function onTag(t){
  store.setFilters({ q: t })
  reload()
}

onMounted(() => {
  if(route.query.q) store.setFilters({ q: route.query.q })
  store.load()
})
</script>

<style scoped>
.statusRow{ margin:14px 0; display:flex; justify-content:space-between; align-items:center; }
.left, .right{ display:flex; gap:10px; align-items:center; }
.btn-ghost{ padding:6px 12px; border:1px solid #ccc; background:transparent; border-radius:6px; cursor:pointer; }
.btn-ghost:disabled{ opacity:0.5; cursor:not-allowed; }
.errorBox{ padding:12px; background:#fee; color:red; border-radius:8px; }
.muted{ color:#999; font-size:12px; }
</style>