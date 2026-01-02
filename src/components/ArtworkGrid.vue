<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  // 兼容多种父组件传参命名：items / artworks / list / data
  items: { type: Array, default: undefined },
  artworks: { type: Array, default: undefined },
  list: { type: Array, default: undefined },
  data: { type: Array, default: undefined },

  // 兼容“老写法：传入回调函数”
  onOpen: { type: Function, default: null },
  onLike: { type: Function, default: null },
  onTag: { type: Function, default: null }
})

const emit = defineEmits([
  // 推荐事件（新）
  'open', 'like', 'tag',
  // 兼容事件（旧）
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
  emit('select', item)
  emit('itemClick', item)
  emit('click', item)
  if(typeof props.onOpen === 'function') props.onOpen(item)
}

function like(item, e){
  e?.stopPropagation?.()
  emit('like', item)
  emit('likeArtwork', item)
  if(typeof props.onLike === 'function') props.onLike(item)
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
  if(typeof props.onTag === 'function') props.onTag(tag, item)
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
        <!-- 预览图：上面不放任何文字/按钮，保持干净 -->
        <div class="art-card__media">
          <img
            class="art-card__img"
            :src="imgSrc(it)"
            :alt="it.title || 'artwork'"
            loading="lazy"
          />
        </div>

        <!-- 信息区：标签/点赞/来源 badge 全部在预览图下方 -->
        <div class="art-card__body">
          <div class="art-card__meta">
            <span :class="badgeClass(it)">{{ badgeText(it) }}</span>

            <button
              class="like-pill"
              type="button"
              @click="(e) => like(it, e)"
              data-sfx="click"
              aria-label="点赞"
            >
              <svg class="heart" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 21s-7-4.6-9.4-8.7C.6 9.1 2.2 5.9 5.6 5.1c2-.5 4 .3 5.3 1.8 1.3-1.5 3.3-2.3 5.3-1.8 3.4.8 5 4 3 7.2C19 16.4 12 21 12 21z"
                  fill="rgba(20, 184, 166, .95)"
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
            <span class="byline__k">上传者 / 作者：</span>

            <a
              v-if="isAuthorClickable(it)"
              class="byline__a"
              href="javascript:void(0)"
              @click="(e) => goAuthor(it, e)"
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
              @click="(e) => clickTag(t, it, e)"
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
   主题变量（局部兜底）
   你全局若已有变量，这里也能兼容
========================= */
.gallery{
  --teal: rgba(20,184,166,1);
  --tealDeep: rgba(16,120,110,1);
  --ink: rgba(18, 24, 28, .92);
  --muted: rgba(18, 24, 28, .62);
  --line: rgba(0,0,0,.10);

  /* 卡片面板质感 */
  --card: rgba(255,255,255,.78);
  --card2: rgba(255,255,255,.86);

  /* 3D 阴影（更像“浮在背景上”） */
  --shadowA: 0 18px 55px rgba(0,0,0,.10);
  --shadowB: 0 6px 16px rgba(0,0,0,.08);
  --inset: inset 0 1px 0 rgba(255,255,255,.70);

  width: min(1200px, calc(100% - 36px));
  margin: 18px auto 36px;
}

/* =========================
   Grid
========================= */
.grid{
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 1180px){
  .grid{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 860px){
  .grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 520px){
  .gallery{ width: calc(100% - 22px); }
  .grid{ grid-template-columns: 1fr; }
}

/* =========================
   Card 3D
========================= */
.art-card{
  background: linear-gradient(180deg, var(--card2), var(--card));
  border: 1px solid var(--line);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--shadowA), var(--inset);
  transform: translateZ(0);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  cursor: pointer;
  user-select: none;
  outline: none;
}

.art-card:hover{
  transform: translateY(-3px);
  box-shadow: 0 26px 70px rgba(0,0,0,.14), var(--inset);
  border-color: rgba(20,184,166,.35);
}

.art-card:active{
  transform: translateY(-1px) scale(.995);
}

.art-card:focus-visible{
  box-shadow: 0 0 0 4px rgba(20,184,166,.16), var(--shadowB), var(--inset);
  border-color: rgba(20,184,166,.48);
}

/* =========================
   Media
========================= */
.art-card__media{
  position: relative;
  aspect-ratio: 4 / 3;
  background:
    radial-gradient(120% 120% at 20% 0%, rgba(20,184,166,.10), transparent 40%),
    linear-gradient(180deg, rgba(0,0,0,.05), rgba(0,0,0,.02));
  overflow: hidden;
}

.art-card__img{
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transform: scale(1.001);
  transition: transform .24s ease, filter .24s ease;
  filter: saturate(1.02) contrast(1.02);
}

/* hover 放大预览图（你想要的“鼠标放到预览图上还会放大”） */
.art-card:hover .art-card__img{
  transform: scale(1.06);
  filter: saturate(1.05) contrast(1.04);
}

/* =========================
   Body layout
========================= */
.art-card__body{
  padding: 12px 12px 14px;
  display: grid;
  gap: 10px;
}

/* 顶部 meta 行：badge + like */
.art-card__meta{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 30px;
}

/* 标题 */
.art-card__title{
  font-weight: 950;
  color: var(--ink);
  letter-spacing: .2px;
  line-height: 1.22;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 作者/上传者 */
.byline{
  font-size: 12px;
  color: var(--muted);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: baseline;
}
.byline__k{ opacity: .78; font-weight: 850; }
.byline__v{ font-weight: 900; color: rgba(18,24,28,.78); }
.byline__a{
  font-weight: 950;
  color: rgba(16,120,110,.96);
  text-decoration: none;
  border-bottom: 1px dashed rgba(16,120,110,.35);
}
.byline__a:hover{
  color: rgba(20,184,166,1);
  border-bottom-color: rgba(20,184,166,.55);
}

/* tags */
.tags{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 2px;
}

/* =========================
   Badge（不遮挡预览图：在图片下方）
   网络：天蓝色；个人：粉紫色
========================= */
.badge{
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-weight: 950;
  font-size: 12px;
  letter-spacing: .2px;
  border: 1px solid rgba(0,0,0,.10);
  box-shadow: 0 8px 18px rgba(0,0,0,.06);
  background: rgba(255,255,255,.86);
  white-space: nowrap;
}

.badge--network{
  color: rgba(0, 140, 255, .95);
  border-color: rgba(0, 140, 255, .22);
  background: linear-gradient(180deg, rgba(235, 247, 255, .95), rgba(255,255,255,.85));
}

.badge--personal{
  color: rgba(175, 90, 210, .95);
  border-color: rgba(175, 90, 210, .22);
  background: linear-gradient(180deg, rgba(250, 238, 255, .95), rgba(255,255,255,.85));
}

/* =========================
   Like pill（下方信息区，轻量但有反馈）
========================= */
.like-pill{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(20,184,166,.22);
  background: linear-gradient(180deg, rgba(255,255,255,.90), rgba(255,255,255,.78));
  box-shadow: 0 10px 22px rgba(0,0,0,.06);
  cursor: pointer;
  font-weight: 950;
  color: rgba(16,120,110,.95);
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
}

.like-pill .heart{ width: 16px; height: 16px; }
.like-pill b{ font-weight: 950; }
.like-pill .count{
  font-weight: 950;
  color: rgba(18,24,28,.80);
  min-width: 18px;
  text-align: right;
}

.like-pill:hover{
  border-color: rgba(20,184,166,.40);
  box-shadow: 0 16px 34px rgba(0,0,0,.10);
}

.like-pill:active{
  transform: scale(1.06);
}

/* =========================
   Tag chip（可点击、蓝色提示）
========================= */
.tag-chip{
  border: 1px solid rgba(0,0,0,.10);
  background: rgba(255,255,255,.82);
  border-radius: 999px;
  padding: 6px 10px;
  font-weight: 950;
  font-size: 12px;
  color: rgba(25,110,255,.95);
  cursor: pointer;
  transition: transform .12s ease, background .12s ease, border-color .12s ease;
}

.tag-chip:hover{
  background: rgba(25,110,255,.08);
  border-color: rgba(25,110,255,.22);
}

.tag-chip:active{
  transform: scale(1.08);
}
</style>
