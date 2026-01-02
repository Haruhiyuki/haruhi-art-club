<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <section class="modal" role="dialog" aria-modal="true">
      <div class="modal__media">
        <img :src="imgSrc" :alt="art?.title || 'artwork'" />
      </div>

      <div class="modal__side">
        <div class="modal__head">
          <h2>{{ art?.title }}</h2>
          <button class="icon-btn" type="button" @click="close" data-sfx="click">关闭</button>
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
          <div class="small-muted" style="font-weight: 950;">授权许可</div>
          <div v-if="licenses.length === 0" class="small-muted">（未勾选任何授权许可）</div>
          <ul v-else class="license-list">
            <li v-for="x in licenses" :key="x">{{ x }}</li>
          </ul>
        </div>

        <div class="sep"></div>

        <div>
          <div class="small-muted" style="font-weight: 950;">评论</div>

          <div v-if="loadingComments" class="small-muted" style="margin-top: 6px;">加载中…</div>

          <div v-else style="display:flex; flex-direction:column; gap:10px; margin-top: 10px;">
            <div v-if="comments.length === 0" class="small-muted">还没有评论，来抢沙发吧～</div>

            <div
              v-for="c in comments"
              :key="c.id"
              class="panel"
              style="padding:12px; border-radius:16px;"
            >
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="font-weight:950;">
                  {{ c.user_name }}
                  <span class="small-muted" style="font-weight:850; margin-left:6px;">
                    {{ c.created_at ? new Date(c.created_at).toLocaleString() : '' }}
                  </span>
                </div>

                <button class="like-pill" type="button" @click="() => likeComment(c)" data-sfx="click">
                  <svg class="heart" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 21s-7-4.6-9.4-8.7C.6 9.1 2.2 5.9 5.6 5.1c2-.5 4 .3 5.3 1.8 1.3-1.5 3.3-2.3 5.3-1.8 3.4.8 5 4 3 7.2C19 16.4 12 21 12 21z"
                      fill="rgba(20, 184, 166, .95)"/>
                  </svg>
                  <b>赞</b>
                  <span class="count">{{ Number(c.like_total || 0) }}</span>
                </button>
              </div>

              <div style="margin-top:8px; font-weight:850; line-height:1.35;">
                {{ c.body }}
              </div>
            </div>
          </div>

          <div class="sep"></div>

          <div class="panel" style="padding:12px; border-radius:16px;">
            <div class="small-muted" style="font-weight: 950; margin-bottom:8px;">发表评论</div>

            <div class="search" style="margin-bottom:10px;">
              <span class="hint">昵称</span>
              <input v-model="commentName" placeholder="临时输入一个名字即可" />
            </div>

            <div class="search" style="border-radius:16px;">
              <textarea
                v-model="commentBody"
                rows="3"
                placeholder="写点什么吧…"
                style="width:100%; border:none; outline:none; background:transparent; resize: vertical; font-weight:850;"
              ></textarea>
            </div>

            <div style="margin-top:10px; display:flex; justify-content:flex-end;">
              <button class="btn btn--accent" type="button" @click="postComment" :aria-disabled="posting ? 'true':'false'" data-sfx="click">
                {{ posting ? '发送中…' : '发送评论' }}
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
  return a.image_url || a.imageUrl || a.url || ''
})

const tags = computed(() => Array.isArray(art.value?.tags) ? art.value.tags : [])
const licenses = computed(() => Array.isArray(art.value?.licenses) ? art.value.licenses : [])

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
    // 乐观更新
    c.like_total = Number(c.like_total || 0) + 1
  }catch(e){
    // 后端会限额（每天最多 10 次），这里不弹窗也行；你以后想加 toast 我再补
  }
}

function clickTag(t){
  emit('tag', t)
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
.modal-overlay{
  position:fixed;
  inset:0;
  background: rgba(255,255,255, .1);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index:999;
  display:flex;
  align-items:center;
  justify-content:center;
  animation: fadeIn .2s ease-out;
}
@keyframes fadeIn{ from{opacity:0;} to{opacity:1;} }

.modal{
  width:90vw;
  height:85vh;
  max-width:1100px;
  background: rgba(255,255,255,.88);
  border:1px solid rgba(0,0,0,.08);
  border-radius:24px;
  box-shadow: 0 24px 80px rgba(0,0,0,.15);
  display:grid;
  grid-template-columns: 1fr 380px;
  overflow:hidden;
}
@media (max-width: 800px){
  .modal{ grid-template-columns: 1fr; grid-template-rows: 40vh 1fr; height:90vh; }
}

.modal__media{
  background: #f0f0f0;
  display:flex;
  align-items:center;
  justify-content:center;
  position:relative;
  overflow:hidden;
}
.modal__media img{
  width:100%; height:100%; object-fit:contain;
  display:block;
}

.modal__side{
  display:flex; flex-direction:column;
  border-left:1px solid rgba(0,0,0,.08);
  background: rgba(255,255,255,.6);
  backdrop-filter: blur(12px);
  padding:20px;
  overflow-y:auto;
}

.modal__head{
  display:flex; align-items:flex-start; justify-content:space-between;
  gap:12px;
  margin-bottom:14px;
}
.modal__head h2{
  font-size:20px; font-weight:950;
  line-height:1.3;
}
.icon-btn{
  flex-shrink:0;
  border:1px solid rgba(0,0,0,.1);
  background: rgba(255,255,255,.5);
  border-radius:8px;
  padding:4px 10px;
  font-weight:bold;
  cursor:pointer;
}
.icon-btn:hover{ background:#fff; }

.kv{
  display:grid;
  grid-template-columns: 70px 1fr;
  gap:6px 10px;
  font-size:13px;
  margin-bottom:12px;
}
.kv b{ font-weight:950; opacity:.5; text-align:right; }
.small-muted{ font-size:13px; opacity:.75; line-height:1.5; }

.tags{ display:flex; flex-wrap:wrap; gap:6px; }
.tag-chip{
  border:1px solid rgba(0,0,0,.08);
  background: rgba(255,255,255,.6);
  padding:4px 8px;
  border-radius:6px;
  font-size:12px;
  font-weight:850;
  color: rgba(20,100,200,.9);
  cursor:pointer;
}
.tag-chip:hover{ background:#fff; }

.sep{
  height:1px; background:rgba(0,0,0,.08);
  margin:16px 0;
}

.license-list{
  margin:6px 0 0 0;
  padding-left:18px;
  font-size:13px; opacity:.85; line-height:1.6; font-weight:700;
}

.panel{
  background: rgba(255,255,255,.65);
  border:1px solid rgba(0,0,0,.06);
}

.search{
  display:flex; align-items:center;
  background: rgba(255,255,255,.75);
  border:1px solid rgba(0,0,0,.1);
  border-radius:12px;
  padding:0 12px;
  height:40px;
}
.search:focus-within{
  background:#fff;
  border-color: rgba(20,184,166,.6);
  box-shadow: 0 0 0 3px rgba(20,184,166,.15);
}
.search .hint{ font-size:12px; font-weight:950; opacity:.4; margin-right:8px; }
.search input{
  border:none; background:transparent; outline:none;
  flex:1; font-weight:850; font-size:14px;
}

.btn--accent{
  background: #000; color:#fff;
  border:0; padding:8px 16px; border-radius:999px;
  font-weight:950; cursor:pointer;
}
.btn--accent:disabled{ opacity:.5; cursor:not-allowed; }

.like-pill{
  display:flex; align-items:center; gap:4px;
  border:1px solid rgba(0,0,0,.08);
  background: rgba(255,255,255,.6);
  padding:4px 8px; border-radius:999px;
  font-size:12px; font-weight:850;
  cursor:pointer;
}
.like-pill:hover{ background:#fff; }
.heart{ width:14px; height:14px; }
.count{ opacity:.6; font-family:monospace; }
</style>