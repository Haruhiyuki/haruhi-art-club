<template>
  <section class="container-card">
    <div class="head">
      <div class="head-content">
        <div class="h1">投稿上传</div>
        <div class="sub">AI 审核护航，通过即发布～</div>
      </div>

      <div class="head-image">
        <img src="../assets/kon.webp" alt="Decoration" />
      </div>
    </div>

    <form class="form" @submit.prevent="submit">
      <div class="block">
        <div class="btitle">基础信息</div>

        <div class="grid2">
          <div class="field">
            <div class="label">上传者显示名（可选）</div>
            <input class="input" v-model="uploaderName" placeholder="例如：昵称 / 匿名" />
            <div class="hint">仅用于展示。</div>
          </div>

          <div class="field">
            <div class="label">作品名称（必填）</div>
            <input class="input" v-model="title" placeholder="请输入作品名称" required />
          </div>
        </div>

        <div class="field">
          <div class="label">作品描述（必填）</div>
          <textarea class="textarea" v-model="description" placeholder="请描述作品内容、创作思路或来源说明…" required></textarea>
        </div>
      </div>

      <div class="block">
        <div class="btitle">分类与署名</div>

        <div class="grid2">
          <div class="field">
            <div class="label">图片来源（必选）</div>
            <div class="seg">
              <button type="button" :class="['segbtn', sourceType==='personal' && 'on']" @click="sourceType='personal'" data-sfx="click">个人作品</button>
              <button type="button" :class="['segbtn', sourceType==='network' && 'on']" @click="sourceType='network'" data-sfx="click">网络图片</button>
            </div>
            <div class="hint"></div>
          </div>

          <div class="field">
            <div class="label">内容划分（必选）</div>
            <div class="seg">
              <button type="button" :class="['segbtn', contentType==='haruhi' && 'on']" @click="contentType='haruhi'" data-sfx="click">凉宫内容</button>
              <button type="button" :class="['segbtn', contentType==='other' && 'on']" @click="contentType='other'" data-sfx="click">非凉宫内容</button>
            </div>
            <div class="hint"></div>
          </div>
        </div>

        <div class="field" v-if="sourceType==='personal'">
          <div class="label">创作者唯一ID（必填）</div>
          <div class="inline">
            <input class="input" v-model="uid" placeholder="请输入你的唯一ID（创作者名单中存在）" />
            <button class="btn-ghost" type="button" @click="checkUid" :disabled="checkingUid || !uid.trim()" data-sfx="click">
              {{ checkingUid ? '检测中…' : '检测' }}
            </button>
          </div>

          <div class="creatorRow" v-if="uidHint">
            <div class="hint" :class="uidHintClass">{{ uidHint }}</div>
            <img v-if="uidAvatar" class="creatorAvatar" :src="uidAvatar" alt="" />
          </div>

          <div class="hint">
            进行创作者注册才能获取唯一ID，并允许上传个人作品哦！可加入绘画部联系律纪或阿笑成为创作者🥰～
            <br>绘画部群号：627992968，阿笑QQ：2452812504，律纪QQ：3105285630
          </div>
        </div>

        <div class="field" v-if="sourceType==='network'">
          <div class="label">网络图片来源链接（可选）</div>
          <input class="input" v-model="originUrl" placeholder="https://..." />
          <div class="hint">
            上传他人作品必须取得原作者授权！
          </div>
        </div>
      </div>

      <div class="block">
        <div class="btitle">标签与授权</div>

        <div class="grid2">
          <div class="field">
            <div class="label">标签（可选）</div>

            <div class="tagRow">
              <input
                class="input"
                v-model="tagDraft"
                placeholder="输入一个标签，例如：长门有希"
                @keydown.enter.prevent="addTag"
              />
              <button class="btn-ghost" type="button" @click="addTag" :disabled="!tagDraft.trim()" data-sfx="click">添加</button>
              <button class="btn-ghost" type="button" @click="clearTags" :disabled="tags.length===0" data-sfx="click">清空</button>
            </div>

            <div class="tagList" v-if="tags.length">
              <span class="tagChip" v-for="t in tags" :key="t">
                <span class="t">#{{ t }}</span>
                <button class="x" type="button" title="删除" @click="removeTag(t)" data-sfx="click">×</button>
              </span>
            </div>

            <div class="hint">标签会参与搜索,也可点击标签进行快速筛选。</div>
          </div>

          <div class="field" v-if="sourceType==='personal'">
            
            <div class="label">对大众/网络的授权许可（可多选）</div>
            <div class="licenseBox">
              <label class="licItem" v-for="opt in NET_LICENSE_OPTIONS" :key="opt">
                <input type="checkbox" :value="opt" v-model="netLicenses" />
                <span class="licText">{{ opt }}</span>
              </label>
            </div>
            <div class="hint" style="margin-bottom: 12px;">这些授权信息将公开显示在图片详情页。</div>

            <div class="label">对应援团的特别授权（可多选）</div>
            <div class="licenseBox">
              <label class="licItem" v-for="opt in GROUP_LICENSE_OPTIONS" :key="opt">
                <input type="checkbox" :value="opt" v-model="groupLicenses" />
                <span class="licText">{{ opt }}</span>
              </label>
            </div>
            <div class="hint">这些信息仅在后台可见，用于社团内部企划或周边制作参考。</div>

          </div>
        </div>
      </div>

      <div class="block">
        <div class="btitle">图片文件</div>

        <div class="field">
          <div class="label">选择图片文件（必选）</div>
          <input class="input file" type="file" accept="image/*" @change="onFile" required />
          <div class="hint">系统将自动压缩生成预览图用于网页展示，同时保留您上传的原图用于下载。</div>
        </div>

        <div class="actions">
          <button class="btn" :disabled="submitting || !file" data-sfx="click">
            {{ submitting ? statusMsg : '提交' }}
          </button>
          <span class="msg" :class="{ error: isError }">{{ msg }}</span>
        </div>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { api } from '../services/api' 
import { compressToWebP } from '../utils/imageCompressor.js'

// --- 常量定义 ---
const NET_LICENSE_OPTIONS = [
  '可在b站、小红书等社交媒体转载',
  '允许用于视频等个人创作',
  '允许用于制作无料发放'
]

const GROUP_LICENSE_OPTIONS = [
  '允许应援团社交媒体官方账号转载',
  '允许用于应援团官方视频/游戏等创作企划',
  '允许制作无料周边发放',
  '允许制作贩售周边'
]

// --- 状态定义 ---
const uploaderName = ref('')
const title = ref('')
const description = ref('')

const tagDraft = ref('')
const tags = ref([])

const sourceType = ref('personal')
const contentType = ref('haruhi')
const originUrl = ref('')
const file = ref(null)

const uid = ref('')
const uidHint = ref('')
const uidAvatar = ref('')
const uidExists = ref(false)
const checkingUid = ref(false)

// 授权状态拆分
const netLicenses = ref([])
const groupLicenses = ref([])

const msg = ref('')
const isError = ref(false)
const submitting = ref(false)
const statusMsg = ref('提交中…') // 用于按钮显示的细分状态

const uidHintClass = computed(() => uidHint.value.includes('✅') ? 'ok' : (uidHint.value.includes('❌') ? 'bad' : ''))

// --- 方法 ---
function onFile(e){
  const f = e.target.files && e.target.files[0]
  file.value = f || null
}

function normalizeOneTag(s){
  let t = String(s || '').trim()
  if(!t) return ''
  if(t.startsWith('#')) t = t.slice(1).trim()
  t = t.replace(/\s+/g, ' ')
  return t
}

function addTag(){
  const t = normalizeOneTag(tagDraft.value)
  if(!t) return
  const key = t.toLowerCase()
  const exists = tags.value.some(x => x.toLowerCase() === key)
  if(!exists) tags.value.push(t)
  tagDraft.value = ''
}
function removeTag(t){ tags.value = tags.value.filter(x => x !== t) }
function clearTags(){ tags.value = []; tagDraft.value = '' }

async function checkUid(){
  const u = uid.value.trim()
  if(!u) return
  checkingUid.value = true
  uidHint.value = ''
  uidAvatar.value = ''
  uidExists.value = false
  try{
    const r = await api.verifyCreator(u)
    if(r.exists){
      uidExists.value = true
      uidAvatar.value = r.creator?.avatar_url || ''
      uidHint.value = '✅ 唯一ID存在（已匹配头像）'
    }else{
      uidExists.value = false
      uidHint.value = '❌ 唯一ID不存在（请检查输入或联系管理员导入名单）'
    }
  }catch(e){
    uidExists.value = false
    uidHint.value = `检测失败：${e.message}`
  }finally{
    checkingUid.value = false
  }
}

watch(sourceType, (v) => {
  if(v !== 'personal'){
    uid.value = ''
    uidHint.value = ''
    uidAvatar.value = ''
    uidExists.value = false
    netLicenses.value = []
    groupLicenses.value = []
  }
})

async function submit(){
  msg.value = ''
  isError.value = false
  
  if(!file.value){ msg.value = '请选择图片文件'; isError.value = true; return }
  if(!title.value.trim() || !description.value.trim()){
    msg.value = '作品名称与描述为必填'; isError.value = true;
    return
  }

  if(sourceType.value === 'personal'){
    const u = uid.value.trim()
    if(!u){ msg.value = '个人作品必须填写唯一ID'; isError.value = true; return }
    if(!uidExists.value){
      await checkUid()
      if(!uidExists.value){
        msg.value = '唯一ID不存在，无法提交个人作品'; isError.value = true;
        return
      }
    }
  }

  submitting.value = true
  statusMsg.value = '处理图片中…'

  try{
    const fd = new FormData()

    // --- 核心修改：压缩逻辑 ---
    let compressedBlob = null
    try {
      // 压缩到 WebP, 90% 质量, 最大宽 1920
      // 这里的 file.value 是 File 对象 (也是一种 Blob)
      compressedBlob = await compressToWebP(file.value, 0.9, 1920)
    } catch (err) {
      console.warn('图片压缩失败，将使用原图作为展示图:', err)
      // 如果压缩失败，展示图回退到原图
      compressedBlob = file.value
    }

    // append 'image': 展示用的图 (压缩后的 WebP)
    fd.append('image', compressedBlob, 'display.webp')
    // append 'original': 下载用的原图
    fd.append('original', file.value)
    // -----------------------

    fd.append('uploader_name', uploaderName.value.trim())
    fd.append('title', title.value.trim())
    fd.append('description', description.value.trim())
    fd.append('tags', tags.value.join(' '))
    fd.append('source_type', sourceType.value)
    fd.append('content_type', contentType.value)
    fd.append('origin_url', originUrl.value.trim())

    if(sourceType.value === 'personal'){
      fd.append('uploader_uid', uid.value.trim())
      
      const combinedLicenses = [
        ...netLicenses.value.map(x => `NET:${x}`),
        ...groupLicenses.value.map(x => `GROUP:${x}`)
      ]
      fd.append('licenses', JSON.stringify(combinedLicenses))
    }

    statusMsg.value = '上传中…'
    const r = await api.uploadArtwork(fd)
    
    // 根据返回的状态显示不同的提示
    if (r.status === 'approved') {
      msg.value = r.pointsAdded 
        ? '发布成功！✅（AI审核通过，积分已发放）'
        : '发布成功！✅（AI审核通过）'
    } else if (r.status === 'flagged') {
      msg.value = '提交成功，但内容需人工复核 🤖'
    } else {
      msg.value = '提交成功，进入待审核队列'
    }

    // reset form
    title.value = ''
    description.value = ''
    originUrl.value = ''
    file.value = null
    // Reset file input value manually to clear the UI selection
    const fileInput = document.querySelector('.input.file')
    if(fileInput) fileInput.value = ''
    
    clearTags()
    netLicenses.value = []
    groupLicenses.value = []
  }catch(e){
    msg.value = `提交失败：${e.message}`
    isError.value = true
  }finally{
    submitting.value = false
    statusMsg.value = '提交'
  }
}
</script>

<style scoped>
/* --- 头部布局 --- */
.head { 
  display: flex; 
  align-items: flex-end; 
  justify-content: space-between;
  gap: 20px; 
  margin-bottom: 24px;
  position: relative; 
}

.head-content {
  flex: 1; 
  display: grid; 
  gap: 6px;
  z-index: 2; 
}

.h1 { font-size: 36px; font-weight: 950; letter-spacing: .4px; }
.sub { opacity: .72; }

/* 头部装饰图 (电脑端样式) */
.head-image img {
  position: absolute;
  right: 0;        
  bottom: -20px;   
  height: 220px;   
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
  z-index: 1; 
}

/* --- 表单容器 --- */
.form {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.6);
  background: rgba(255, 255, 255, 0.6); 
  box-shadow: 0 20px 50px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}

/* --- 背景图 (电脑端默认) --- */
.form::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: url('../assets/upload-bg.webp');
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% auto; 
  filter: blur(0px) saturate(1.2); 
  transform: scale(1); 
  opacity: 1;
}

.block {
  padding: 24px 32px;
  border-radius: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  display: grid;
  gap: 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.block:last-child {
  border-bottom: none;
}

.btitle {
  font-size: 32px;
  font-weight: 950;
  letter-spacing: .2px;
  opacity: .90;
  margin-bottom: 8px;
}

.grid2{ display:grid; grid-template-columns: 1fr 1fr; gap:20px; }
@media (max-width: 820px){ .grid2{ grid-template-columns: 1fr; } }

.field{ display:grid; gap:8px; }
.label{ font-weight:950; font-size:20px; opacity:.85; letter-spacing:.3px; }

.input, .textarea{
  width:100%;
  padding:12px 14px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,.1); 
  background: rgba(255,255,255,0.35); 
  font-weight: 850;
  outline:none;
  transition: all 0.2s;
  backdrop-filter: blur(2px);
}
.input:focus, .textarea:focus{
  border-color: rgba(20,184,166,.6);
  background: rgba(255,255,255,0.4); 
  box-shadow: 0 0 0 4px rgba(20,184,166,.15);
}
.textarea{ min-height: 120px; resize: vertical; }

.hint{ font-size:18px; opacity:.7; line-height:1.5; font-weight: 600; }
.hint.ok{ opacity:1; color: rgba(16,120,70,1); }
.hint.bad{ opacity:1; color: rgba(200,40,40,1); }

.inline{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.inline .input{ flex:1; min-width: 240px; }

.creatorRow{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top: 4px; }
.creatorAvatar{ width:40px; height:40px; border-radius:50%; object-fit:cover; border:2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

.seg{ display:flex; gap:8px; flex-wrap:wrap; }

.segbtn{
  border:1px solid rgba(0,0,0,.1);
  background: rgba(255,255,255,.15); 
  padding:9px 16px;
  border-radius:999px;
  cursor:pointer;
  font-weight:950;
  opacity:.86;
  transition: all .2s ease;
  backdrop-filter: blur(2px);
}
.segbtn:hover{ opacity:1; transform: translateY(-1px); background: rgba(255,255,255,.3); }
.segbtn:active{ transform: translateY(0) scale(0.98); }
.segbtn.on{
  background: #1f2937;
  color:#fff;
  border-color: #1f2937;
  opacity:1;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.file{ padding:10px; background: rgba(255,255,255,0.35); backdrop-filter: blur(2px); }

.actions{ display:flex; gap:16px; align-items:center; flex-wrap:wrap; margin-top: 10px; }
.msg{ opacity:.9; font-weight:850; color: #059669; }
.msg.error{ color: #d32f2f; }

.tagRow{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.tagRow .input{ flex:1; min-width: 240px; }

.tagList{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top: 6px; }

.tagChip{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:6px 12px;
  border-radius:8px;
  border:1px solid rgba(0,0,0,.1);
  background: rgba(255,255,255,0.25); 
  font-size:18px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.03);
  backdrop-filter: blur(2px);
}
.tagChip .t{ font-weight:950; color: #2563eb; }
.tagChip .x{
  border:0;
  background: transparent;
  cursor:pointer;
  font-weight:950;
  color: #999;
  padding: 0 4px;
}
.tagChip .x:hover{ color: #d32f2f; }

.licenseBox{
  display:grid;
  gap:12px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,.10);
  background: rgba(255,255,255,.15); 
  backdrop-filter: blur(2px);
}
.licItem{ display:flex; gap:10px; align-items:flex-start; cursor:pointer; user-select:none; }
.licItem input{ margin-top: 3px; accent-color: #1f2937; }
.licText{ font-weight: 850; opacity: .9; line-height: 1.4; font-size: 16px; }

.btn, .btn-ghost {
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 950;
  cursor: pointer;
  transition: all 0.2s;
}

.btn {
  background: #1f2937;
  color: #fff;
  border: none;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.25); background: #000; }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; background: #9ca3af; }

.btn-ghost {
  background: rgba(255,255,255,0.35); 
  border: 1px solid rgba(0,0,0,0.1);
  color: #374151;
  backdrop-filter: blur(2px);
}
.btn-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.4); border-color: rgba(0,0,0,0.3); }

/* =======================================================
   移动端优化
   ======================================================= */
@media (max-width: 768px) {
  .form::before {
    background-image: none !important; 
    background-color: rgba(255, 255, 255, 0.85); 
  }

  .head-image {
    display: none;
  }

  .head {
    flex-direction: column; 
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 16px;
  }
  .h1 { font-size: 28px; } 
  .sub { font-size: 14px; }

  .block {
    padding: 20px 16px; 
    gap: 12px;
  }
  
  .btitle { font-size: 24px; }
  .label { font-size: 16px; }
  .hint { font-size: 14px; }
  .licText { font-size: 14px; }
  .tagChip { font-size: 14px; padding: 4px 10px; }
}
</style>