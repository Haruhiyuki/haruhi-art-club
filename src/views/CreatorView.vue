<template>
  <div class="panel" style="padding:20px;">
    <div class="head">
      <div class="info">
        <div class="avatar-box">
          <img v-if="profile?.avatar_url" :src="profile.avatar_url" />
        </div>
        <div>
          <h1 class="uid">{{ uid }}</h1>
          <p class="sub">创作者个人主页</p>
        </div>
      </div>
      <button class="btn-ghost" @click="router.push('/')">返回画廊</button>
    </div>

    <div class="hr"></div>

    <div v-if="loading" class="muted">加载中...</div>
    <div v-else>
      <div v-if="works.length === 0" class="muted">暂无通过审核的作品</div>
      <ArtworkGrid v-else :items="works" @open="openItem" @like="likeItem" />
    </div>

    <ArtworkModal v-model="modalOpen" :item="activeItem" @close="activeItem=null" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api'
import ArtworkGrid from '../components/ArtworkGrid.vue'
import ArtworkModal from '../components/ArtworkModal.vue'

const route = useRoute()
const router = useRouter()
const uid = computed(() => route.params.uid)

const loading = ref(true)
const profile = ref(null)
const works = ref([])
const modalOpen = ref(false)
const activeItem = ref(null)

async function load(){
  if(!uid.value) return
  loading.value = true
  try {
    const p = await api.creatorProfile(uid.value)
    profile.value = p.data
    const w = await api.creatorWorks({ uid: uid.value })
    works.value = w.data || []
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function openItem(it){
  activeItem.value = it
  modalOpen.value = true
}

async function likeItem(it){
  await api.likeArtwork(it.id)
  it.like_total++
}

watch(uid, load, { immediate:true })
</script>

<style scoped>
.head{ display:flex; justify-content:space-between; align-items:center; }
.info{ display:flex; align-items:center; gap:16px; }
.avatar-box{ width:64px; height:64px; border-radius:50%; overflow:hidden; background:#eee; border:1px solid #ddd; }
.avatar-box img{ width:100%; height:100%; object-fit:cover; }
.uid{ font-size:24px; font-weight:bold; }
.sub{ color:#666; }
.hr{ height:1px; background:#eee; margin:20px 0; }
.btn-ghost{ padding:6px 12px; border:1px solid #ccc; background:#fff; border-radius:6px; cursor:pointer; }
.muted{ color:#999; padding:20px 0; }
</style>