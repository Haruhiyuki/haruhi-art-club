<template>
  <div v-if="visible" class="garden-overlay" @click.self="close">
    <section class="garden-modal" role="dialog" aria-modal="true">
      
      <div class="deco-vine"></div>
      <div class="deco-flower"></div>

      <div class="modal__media">
        <img :src="imgSrc" :alt="art?.title || 'artwork'" />
      </div>

      <div class="modal__side">
        <div class="modal__head">
          <h2>{{ art?.title }}</h2>
          <div class="actions">
            <!-- 下载按钮：绑定动态文件名 -->
            <a 
              v-if="originalUrl" 
              :href="originalUrl" 
              :download="downloadFilename"
              class="icon-btn download-btn" 
              title="下载原图"
              data-sfx="click"
              @click.stop
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </a>
            <button class="icon-btn" type="button" @click="close" data-sfx="click">✕</button>
          </div>
        </div>

        <div class="kv">
          <b>上传者</b>
          <div>{{ art?.uploader_uid || art?.uploader_name || '匿名' }}</div>

          <b>上传时间</b>
          <div>{{ art?.created_at ? new Date(art.created_at).toLocaleString() : '-' }}</div>

          <b>作品描述</b>
          <div class="small-muted">{{ art?.description || '（无）' }}</div>
        </div>

        <div v-if="tags.length" class="tags" style="margin: 8px 0 0;">
          <button
            v-for="t in tags"
            :key="t"
            class="tag-chip"
            type="button"
            @click="clickTag(t)"
            data-sfx="click"
          >
            #{{ t }}
          </button>
        </div>

        <div class="sep"></div>

        <div>
          <div class="small-muted" style="font-weight: 950; color:var(--accent);">授权许可 (网络/公开)</div>
          <div v-if="publicLicenses.length === 0" class="small-muted">（未勾选任何网络公开授权）</div>
          <ul v-else class="license-list">
            <li v-for="x in publicLicenses" :key="x">{{ x }}</li>
          </ul>
        </div>

        <div class="sep"></div>

        <div>
          <div class="small-muted" style="font-weight: 950; color:var(--accent);">评论</div>

          <div v-if="loadingComments" class="small-muted" style="margin-top: 6px;">风正在传送回音…</div>

          <div v-else style="display:flex; flex-direction:column; gap:10px; margin-top: 10px;">
            <div v-if="comments.length === 0" class="small-muted">暂无回音，在此刻留下你的足迹吧～</div>

            <div
              v-for="c in comments"
              :key="c.id"
              class="panel comment-card"
            >
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="font-weight:950; color:var(--text-deep);">
                  {{ c.user_name }}
                  <span class="small-muted" style="font-weight:400; font-family:serif; margin-left:6px; font-style:italic;">
                    {{ c.created_at ? new Date(c.created_at).toLocaleString() : '' }}
                  </span>
                </div>

                <button class="like-pill" type="button" @click="() => likeComment(c)" data-sfx="click">
                  <svg class="heart" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 21s-7-4.6-9.4-8.7C.6 9.1 2.2 5.9 5.6 5.1c2-.5 4 .3 5.3 1.8 1.3-1.5 3.3-2.3 5.3-1.8 3.4.8 5 4 3 7.2C19 16.4 12 21 12 21z"
                      fill="currentColor"/>
                  </svg>
                  <span class="count">{{ Number(c.like_total || 0) }}</span>
                </button>
              </div>

              <div style="margin-top:8px; font-weight:500; line-height:1.6; color:var(--text-main);">
                {{ c.body }}
              </div>
            </div>
          </div>

          <div class="sep"></div>

          <div class="panel input-panel">
            <div class="small-muted" style="font-weight: 950; margin-bottom:8px; color:var(--accent);">讲两句？</div>

            <div class="search input-row" style="margin-bottom:10px;">
              <span class="hint">署名</span>
              <input v-model="commentName" placeholder="无需登录，但可不要冒充别人哦！" />
            </div>

            <div class="search input-row" style="height:auto; padding: 10px 12px;">
              <textarea
                v-model="commentBody"
                rows="3"
                placeholder="下面我来简单喵两句.."
                style="width:100%; border:none; outline:none; background:transparent; resize: vertical; font-weight:500;"
              ></textarea>
            </div>

            <div style="margin-top:10px; display:flex; justify-content:flex-end;">
              <button class="btn btn--accent" type="button" @click="postComment" :aria-disabled="posting ? 'true':'false'" data-sfx="click">
                {{ posting ? '传送中…' : '发送' }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { api } from '../services/api.js'

const props = defineProps({
  // 兼容两种写法：
  modelValue: { type: Boolean, default: undefined }, // v-model
  open: { type: Boolean, default: undefined },       // :open
  item: { type: Object, default: null },             // :item
  artwork: { type: Object, default: null }           // :artwork
})

const emit = defineEmits(['update:modelValue', 'close', 'tag', 'like'])

const visible = computed(() => {
  if(props.modelValue !== undefined) return !!props.modelValue
  if(props.open !== undefined) return !!props.open
  return false
})

const art = computed(() => props.item || props.artwork || null)

const imgSrc = computed(() => {
  const a = art.value
  if(!a) return ''
  // 优先显示压缩图，如果没有则显示原图
  return a.image_url || a.imageUrl || a.url || ''
})

const originalUrl = computed(() => {
  const a = art.value
  // 后端返回的 original_url，或者是 url
  return a?.original_url || a?.originalUrl || a?.url || ''
})

// --- 新增：生成下载文件名 ---
const downloadFilename = computed(() => {
  const a = art.value
  if(!a) return 'artwork.jpg'

  // 1. 时间：格式化为 YYYYMMDD
  let dateStr = '00000000'
  if(a.created_at) {
    const d = new Date(a.created_at)
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dateStr = `${y}${m}${day}`
  }

  // 2. 作者：优先取名字，没有则取 UID，再没有则匿名
  let author = (a.uploader_name || a.uploader_uid || '匿名').trim()
  
  // 3. 标题
  let title = (a.title || '作品').trim()

  // 净化文件名 (移除非法字符如 / \ : * ? " < > | )
  const safe = (s) => String(s).replace(/[\\/:*?"<>|]/g, '_').trim()
  
  // 组合：时间-作者-标题
  const baseName = `${dateStr}-${safe(author)}-${safe(title)}`

  // 4. 后缀名 (从 url 提取)
  let ext = 'jpg'
  const url = originalUrl.value
  if(url){
    // 移除 query string
    const cleanUrl = url.split(/[?#]/)[0]
    const parts = cleanUrl.split('.')
    if(parts.length > 1) ext = parts[parts.length - 1]
  }

  return `${baseName}.${ext}`
})

const isWebP = computed(() => imgSrc.value.toLowerCase().includes('.webp'))

const tags = computed(() => Array.isArray(art.value?.tags) ? art.value.tags : [])

const publicLicenses = computed(() => {
  const all = Array.isArray(art.value?.licenses) ? art.value.licenses : []
  return all
    .filter(l => l.startsWith('NET:'))
    .map(l => l.replace('NET:', ''))
})

const comments = ref([])
const loadingComments = ref(false)
const commentName = ref('')
const commentBody = ref('')
const posting = ref(false)

function close(){
  emit('update:modelValue', false)
  emit('close')
}

async function loadComments(){
  if(!art.value?.id) return
  loadingComments.value = true
  try{
    const r = await api.listComments(art.value.id)
    comments.value = r.data || []
  }catch{
    comments.value = []
  }finally{
    loadingComments.value = false
  }
}

async function postComment(){
  if(!art.value?.id) return
  const name = commentName.value.trim()
  const body = commentBody.value.trim()
  if(!name || !body) return

  posting.value = true
  try{
    await api.postComment({ artwork_id: art.value.id, user_name: name, body })
    commentBody.value = ''
    await loadComments()
  }finally{
    posting.value = false
  }
}

async function likeComment(c){
  try{
    await api.likeComment(c.id)
    c.like_total = Number(c.like_total || 0) + 1
  }catch(e){ }
}

function clickTag(t){
  emit('tag', t)
  close()
}

watch(visible, (v) => {
  if(v){
    loadComments()
    document.documentElement.style.overflow = 'hidden'
  }else{
    document.documentElement.style.overflow = ''
  }
})

onMounted(() => {
  if(visible.value) loadComments()
})
</script>

<style scoped>
/* =========================
   主题变量定义
========================= */
.garden-overlay {
  --mist-bg: #f4f6f9; 
  --vine-green: #6b8c85; 
  --flower-purple: #bfa2db; 
  --flower-pink: #f3d1dc; 
  --accent: #7a8b99; 
  
  --text-deep: #434d58; 
  --text-main: #5d6d7e; 
  
  --paper-texture: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  
  position: fixed;
  inset: 0;
  background: rgba(20, 25, 35, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.garden-modal {
  width: 90vw;
  height: 85vh;
  max-width: 1100px;
  position: relative;
  background: linear-gradient(135deg, #fffcf9 0%, #f7f9fc 100%);
  overflow: visible;
  border: 4px double rgba(107, 140, 133, 0.2); 
  border-radius: 20px;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  display: grid;
  grid-template-columns: 1fr 380px;
}

.garden-modal::before {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: 24px;
  border: 2px solid transparent;
  background: linear-gradient(45deg, var(--vine-green), transparent 40%, transparent 60%, var(--vine-green)) border-box; 
  -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.5;
  pointer-events: none;
  z-index: 10;
}

.deco-flower {
  position: absolute;
  top: -20px;
  left: -20px;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle at 40% 40%, var(--flower-purple), transparent 70%);
  filter: blur(20px);
  opacity: 0.6;
  z-index: 11;
  pointer-events: none;
}

.deco-vine {
  position: absolute;
  bottom: -30px;
  right: -30px;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, var(--vine-green), transparent 70%);
  filter: blur(30px);
  opacity: 0.4;
  z-index: 11;
  pointer-events: none;
}

@media (max-width: 800px){
  .garden-modal{ grid-template-columns: 1fr; grid-template-rows: 40vh 1fr; height:90vh; }
  .garden-modal::before { display: none; }
}

.modal__media {
  background: rgba(240, 242, 245, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border-radius: 16px 0 0 16px;
}

.modal__media::after {
  content: "";
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 20px rgba(107, 140, 133, 0.1);
  pointer-events: none;
}

.modal__media img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  mix-blend-mode: multiply; 
  filter: contrast(1.02);
}

.modal__side {
  display: flex; flex-direction: column;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(10px);
  padding: 24px;
  overflow-y: auto;
  border-left: 1px solid rgba(107, 140, 133, 0.1);
  background-image: var(--paper-texture);
  font-family: "Georgia", "Songti SC", "SimSun", serif;
}

.modal__side::-webkit-scrollbar { width: 4px; }
.modal__side::-webkit-scrollbar-thumb { background: rgba(107, 140, 133, 0.3); border-radius: 4px; }
.modal__side::-webkit-scrollbar-track { background: transparent; }

.modal__head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
.modal__head h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-deep);
  line-height: 1.4;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 10px rgba(191, 162, 219, 0.2);
}

.actions {
  display: flex;
  gap: 8px;
}

.icon-btn {
  flex-shrink: 0;
  width: 32px; height: 32px;
  border: 1px solid rgba(107, 140, 133, 0.2);
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  color: var(--vine-green);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex; align-items: center; justify-content: center;
}
.icon-btn:hover {
  background: #fff;
  box-shadow: 0 0 10px var(--flower-pink);
  transform: rotate(90deg);
  border-color: var(--flower-pink);
}

/* 下载按钮特殊样式 */
.download-btn:hover {
  color: var(--flower-purple);
  transform: translateY(-2px); /* 只有下载按钮向上浮动，不旋转 */
  box-shadow: 0 4px 10px rgba(191, 162, 219, 0.3);
}

.kv {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 8px 12px;
  font-size: 13px;
  margin-bottom: 16px;
  color: var(--text-main);
}
.kv b {
  font-weight: 600;
  color: var(--vine-green); 
  text-align: right;
  opacity: 0.8;
}
.small-muted {
  font-size: 13px;
  color: var(--text-main);
  opacity: 0.8;
  line-height: 1.6;
}

.tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tag-chip {
  border: 1px solid rgba(191, 162, 219, 0.3);
  background: linear-gradient(to bottom, rgba(255,255,255,0.8), rgba(243, 209, 220, 0.1));
  padding: 5px 12px;
  border-radius: 12px 2px 12px 2px;
  font-size: 12px;
  color: #7b6c88;
  cursor: pointer;
  transition: all 0.2s;
  font-family: sans-serif;
}
.tag-chip:hover {
  background: #fff;
  border-color: var(--flower-purple);
  box-shadow: 0 4px 12px rgba(191, 162, 219, 0.2);
  transform: translateY(-1px);
}

.sep {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(107, 140, 133, 0.2), transparent);
  margin: 20px 0;
}

.license-list {
  margin: 6px 0 0 0;
  padding-left: 18px;
  font-size: 13px; opacity: 0.8; line-height: 1.6;
  color: var(--text-deep);
  list-style-type: square;
}

.panel {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 12px rgba(107, 140, 133, 0.05);
}

.comment-card {
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 12px;
  transition: transform 0.2s;
}
.comment-card:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateX(2px);
}

.input-panel {
  padding: 16px;
  border-radius: 16px;
  background: rgba(244, 246, 249, 0.5);
  border: 1px dashed rgba(107, 140, 133, 0.3);
}

.search {
  display: flex; align-items: center;
  background: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(107, 140, 133, 0.3);
  border-radius: 4px 4px 0 0;
  padding: 0 8px;
  height: 40px;
  transition: all 0.2s;
}
.input-row { border: none; border-bottom: 1px solid rgba(107, 140, 133, 0.2); }
.input-row:focus-within {
  background: #fff;
  border-bottom-color: var(--flower-purple);
}

.search .hint {
  font-size: 12px; color: var(--accent); opacity: 0.6; margin-right: 8px;
  font-family: sans-serif;
}
.search input, .search textarea {
  border: none; background: transparent; outline: none;
  flex: 1; font-size: 14px; color: var(--text-deep);
  font-family: "Georgia", serif;
}
.search textarea::placeholder, .search input::placeholder {
  color: var(--text-main); opacity: 0.4; font-style: italic;
}

.btn--accent {
  background: linear-gradient(135deg, var(--text-main), var(--text-deep));
  color: #fff;
  border: 0; padding: 6px 20px; border-radius: 999px;
  font-size: 13px; cursor: pointer;
  box-shadow: 0 4px 10px rgba(67, 77, 88, 0.2);
  transition: all 0.3s;
  letter-spacing: 1px;
}
.btn--accent:hover {
  background: linear-gradient(135deg, var(--flower-purple), #9b80b9);
  box-shadow: 0 6px 14px rgba(155, 128, 185, 0.3);
  transform: translateY(-1px);
}
.btn--accent:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

.like-pill {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.5);
  padding: 4px 10px; border-radius: 999px;
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  transition: all 0.2s;
}
.like-pill:hover {
  background: #fff;
  color: var(--flower-purple);
  box-shadow: 0 2px 8px rgba(191, 162, 219, 0.2);
}
.heart { width: 14px; height: 14px; color: currentColor; }
</style>