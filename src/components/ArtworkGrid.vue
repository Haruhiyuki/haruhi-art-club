<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  // 兼容多种父组件传参命名
  items: { type: Array, default: undefined },
  artworks: { type: Array, default: undefined },
  list: { type: Array, default: undefined },
  data: { type: Array, default: undefined },

  // 兼容回调
  onOpen: { type: Function, default: null },
  onLike: { type: Function, default: null },
  onTag: { type: Function, default: null }
})

const emit = defineEmits([
  'open', 'like', 'tag',
  'select', 'itemClick', 'click', 'likeArtwork', 'tagClick'
])

const router = useRouter()

const list = computed(() => {
  return props.items ?? props.artworks ?? props.list ?? props.data ?? []
})

function imgSrc(item){
  return item?.image_url || item?.imageUrl || item?.url || ''
}

function isPersonal(item){
  return item?.source_type === 'personal'
}

function badgeText(item){
  return isPersonal(item) ? '个人作品' : '网络图片'
}

function badgeClass(item){
  return isPersonal(item) ? 'badge badge--personal' : 'badge badge--network'
}

function likeCount(item){
  return Number(item?.like_total || 0)
}

function displayUploader(item){
  const uid = (item?.uploader_uid || '').trim()
  const name = (item?.uploader_name || '').trim()
  if(uid) return uid
  if(name) return name
  return '匿名'
}

function isAuthorClickable(item){
  const uid = (item?.uploader_uid || '').trim()
  return !!uid && isPersonal(item)
}

function openCard(item){
  emit('open', item)
  // 兼容旧事件
  emit('select', item)
  emit('itemClick', item)
  emit('click', item)
}

function like(item, e){
  // 阻止冒泡，防止触发外层卡片的点击
  e?.stopPropagation?.()
  emit('like', item)
  emit('likeArtwork', item)
}

function goAuthor(item, e){
  e?.stopPropagation?.()
  const uid = (item?.uploader_uid || '').trim()
  if(!uid) return
  router.push(`/creator/${encodeURIComponent(uid)}`)
}

function clickTag(tag, item, e){
  e?.stopPropagation?.()
  emit('tag', tag)
  emit('tagClick', tag)
}
</script>

<template>
  <div class="gallery">
    <div class="grid">
      <article
        v-for="it in list"
        :key="it.id ?? it.file_path ?? it.title"
        class="art-card"
        role="button"
        tabindex="0"
        @click="openCard(it)"
        @keydown.enter="openCard(it)"
      >
        <div class="art-card__media">
          <img
            class="art-card__img"
            :src="imgSrc(it)"
            :alt="it.title || 'artwork'"
            loading="lazy"
          />
        </div>

        <div class="art-card__body">
          <div class="art-card__meta">
            <span :class="badgeClass(it)">{{ badgeText(it) }}</span>

            <button
              class="like-pill"
              type="button"
              @click.stop="(e) => like(it, e)"
              data-sfx="click"
              aria-label="点赞"
            >
              <svg class="heart" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 21s-7-4.6-9.4-8.7C.6 9.1 2.2 5.9 5.6 5.1c2-.5 4 .3 5.3 1.8 1.3-1.5 3.3-2.3 5.3-1.8 3.4.8 5 4 3 7.2C19 16.4 12 21 12 21z"
                  fill="currentColor"
                />
              </svg>
              <b>赞</b>
              <span class="count">{{ likeCount(it) }}</span>
            </button>
          </div>

          <div class="art-card__title">
            {{ it.title }}
          </div>

          <div class="byline">
            <span class="byline__k">上传者：</span>

            <a
              v-if="isAuthorClickable(it)"
              class="byline__a"
              href="javascript:void(0)"
              @click.stop="(e) => goAuthor(it, e)"
              data-sfx="click"
            >
              {{ displayUploader(it) }}
            </a>
            <span v-else class="byline__v">{{ displayUploader(it) }}</span>
          </div>

          <div class="tags" v-if="Array.isArray(it.tags) && it.tags.length">
            <button
              v-for="t in it.tags.slice(0, 6)"
              :key="t"
              class="tag-chip"
              type="button"
              @click.stop="(e) => clickTag(t, it, e)"
              data-sfx="click"
            >
              #{{ t }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* =========================
   核心主题配置
========================= */
.gallery {
  --bg-deep: #525289; 
  --glass-bg: rgba(30, 21, 21, 0.694); 
  --glass-border: rgba(151, 68, 68, 0.1);
  
  --neon-cyan: #00f2ff;
  --neon-purple: #e9b5fd;
  --neon-glow: rgba(0, 242, 255, 0.4);
  
  --text-main: rgba(255, 255, 255, 0.95);
  --text-muted: rgba(255, 255, 255, 0.55);

  --shadow-media: 0 10px 30px -5px rgba(0, 242, 255, 0.15); 

  width: min(1450px, calc(100% - 40px));
  margin: 60px auto 120px; 
}

/* =========================
   布局 Grid
========================= */
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 100px 50px;
}

@media (max-width: 1100px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 90px 30px;
  }
}

/* --- 手机端适配 (单列 + 紧凑) --- */
@media (max-width: 768px) {
  .grid {
    /* 强制单列 */
    grid-template-columns: 1fr;
    gap: 60px 0; /* 减小垂直间距 */
  }
  .gallery { width: calc(100% - 24px); } /* 稍微加宽一点显示区域 */
}

/* =========================
   Card: 3D 底座
========================= */
@keyframes breathe-glow {
  0%, 100% { box-shadow: 0 0 15px rgba(0, 242, 255, 0.1), inset 0 0 20px rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.1); }
  50% { box-shadow: 0 0 25px rgba(188, 19, 254, 0.25), inset 0 0 10px rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.3); }
}

.art-card {
  position: relative;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  
  backdrop-filter: blur(12px) saturate(1.5); 
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
  
  transform-style: preserve-3d; 
  
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  animation: breathe-glow 6s infinite ease-in-out;
  
  cursor: pointer;
  outline: none;
  overflow: visible; 
  
  padding-bottom: 12px; 
  
  width: 100%;
  max-width: 380px; 
  margin: 0 auto; 
  
  transform: translateZ(0);
}

.art-card:hover {
  transform: translateY(-10px) scale(1.02) rotateX(2deg);
  z-index: 20; 
}

.art-card:focus-visible {
  border-color: var(--neon-cyan);
  box-shadow: 0 0 0 2px var(--neon-cyan);
}

/* =========================
   Media: 悬浮图片层 (Z=24px)
========================= */
@keyframes float-img {
  0%, 100% { transform: translateZ(24px) translateY(-20px) scale(1.02); }
  50% { transform: translateZ(24px) translateY(-26px) scale(1.02); } 
}

.art-card__media {
  position: relative;
  aspect-ratio: 4 / 3;
  width: 110%; 
  margin-left: -5%; 
  margin-top: -15%; 
  border-radius: 20px;
  background: #000;
  overflow: hidden;
  
  transform-style: preserve-3d;
  transform: translateZ(24px) translateY(-20px) scale(1.02);
  
  box-shadow: var(--shadow-media), 0 25px 50px rgba(0,0,0,0.5);
  animation: float-img 8s ease-in-out infinite;
  transition: box-shadow 0.3s ease;
  border: 1px solid rgba(255,255,255,0.15);
  backface-visibility: hidden;
}

.art-card:hover .art-card__media {
  box-shadow: 0 30px 80px rgba(0, 242, 255, 0.4), 0 0 0 1px rgba(255,255,255,0.4);
}

.art-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scale(1.02);
  transition: transform 0.5s ease;
}

.art-card:hover .art-card__img {
  transform: scale(1.1);
}

/* =========================
   Body Layout
========================= */
.art-card__body {
  padding: 18px 20px 8px; 
  display: grid;
  gap: 6px;
  
  transform: translateZ(10px);
  transform-style: preserve-3d;
}

/* 手机端进一步紧凑化 */
@media (max-width: 768px) {
  .art-card__body {
    padding: 12px 16px 6px; /* 减少内边距 */
    gap: 4px; /* 极小间距 */
  }
  .art-card {
    padding-bottom: 8px; /* 减少底部留白 */
  }
}

.art-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
  
  position: relative;
  transform: translateZ(30px); 
}

/* =========================
   Typography
========================= */
.art-card__title {
  font-family: sans-serif;
  font-weight: 700;
  color: var(--text-main);
  font-size: 22px; 
  line-height: 1.1;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 手机端标题稍微缩小一点，避免太满 */
@media (max-width: 768px) {
  .art-card__title {
    font-size: 20px;
  }
}

.byline {
  font-size: 15px; 
  line-height: 1.2;
  color: var(--text-muted);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: baseline;
  
  transform: translateZ(30px);
}
.byline__k { opacity: 0.6; }
.byline__v { color: rgb(255, 255, 255); }
.byline__a {
  color: var(--neon-cyan);
  text-decoration: none;
  border-bottom: 1px dashed rgba(110, 203, 208, 0.3);
  text-shadow: 0 0 8px var(--neon-glow);
  transition: all 0.2s;
  cursor: pointer;
}
.byline__a:hover {
  color: #fff;
  border-bottom-color: #fff;
  text-shadow: 0 0 12px var(--neon-cyan);
}

/* =========================
   组件：Badge
========================= */
.badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  backdrop-filter: blur(4px);
  border: 1px solid transparent;
}

.badge--network {
  background: rgba(180, 180, 180, 0.1);
  color: var(--neon-cyan);
  border-color: rgba(29, 170, 178, 0.3);
  box-shadow: 0 0 10px rgba(0, 242, 255, 0.1);
}

.badge--personal {
  background: rgba(188, 19, 254, 0.1);
  color: var(--neon-purple);
  border-color: rgba(188, 19, 254, 0.3);
  box-shadow: 0 0 10px rgba(188, 19, 254, 0.1);
}

/* =========================
   组件：Like Pill
========================= */
.like-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.721);
  border: 1px solid rgba(255,255,255,0.1);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.3s ease;
  pointer-events: auto;
}

.like-pill .heart { 
  width: 16px; 
  height: 16px; 
  color: #ff4757;
  filter: drop-shadow(0 0 5px #ff4757);
}
.like-pill b { display: none; }
.like-pill .count { font-family: monospace; font-size: 14px; }

.like-pill:hover {
  background: rgb(105, 216, 244);
  border-color: #ff4757;
  box-shadow: 0 0 15px rgba(255, 71, 87, 0.3);
}
.like-pill:active { transform: scale(0.95); }

/* =========================
   组件：Tag Chip
========================= */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  transform: translateZ(30px);
}

.tag-chip {
  background: rgba(255, 255, 255, 0.827);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 99px;
  padding: 4px 10px;
  font-size: 13px;
  color: solid(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.tag-chip:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border-color: rgba(255,255,255,0.3);
  text-shadow: 0 0 5px rgba(255,255,255,0.5);
}
</style>