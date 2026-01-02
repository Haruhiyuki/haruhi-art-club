<template>
  <section class="container-card">
    <div class="head">
      <div class="h1">投稿上传</div>
      <div class="sub">提交后进入待审核。标签不用输入#；展示时自动加#并可点击搜索。</div>
    </div>

    <div class="hr"></div>

    <form class="form" @submit.prevent="submit">
      <!-- 分区 1：基础信息 -->
      <div class="block">
        <div class="btitle">基础信息</div>

        <div class="grid2">
          <div class="field">
            <div class="label">上传者显示名（可选）</div>
            <input class="input" v-model="uploaderName" placeholder="例如：昵称 / 匿名" />
            <div class="hint">仅用于展示，不用于身份识别。</div>
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

      <!-- 分区 2：分类与署名 -->
      <div class="block">
        <div class="btitle">分类与署名</div>

        <div class="grid2">
          <div class="field">
            <div class="label">图片来源（必选）</div>
            <div class="seg">
              <button type="button" :class="['segbtn', sourceType==='personal' && 'on']" @click="sourceType='personal'" data-sfx="click">个人作品</button>
              <button type="button" :class="['segbtn', sourceType==='network' && 'on']" @click="sourceType='network'" data-sfx="click">网络图片</button>
            </div>
            <div class="hint">选择“个人作品”后必须填写唯一ID，并可选择授权许可（可多选）。</div>
          </div>

          <div class="field">
            <div class="label">内容划分（必选）</div>
            <div class="seg">
              <button type="button" :class="['segbtn', contentType==='haruhi' && 'on']" @click="contentType='haruhi'" data-sfx="click">凉宫内容</button>
              <button type="button" :class="['segbtn', contentType==='other' && 'on']" @click="contentType='other'" data-sfx="click">非凉宫内容</button>
            </div>
            <div class="hint">默认凉宫内容，可切换。</div>
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
            署名规则：只有当你的个人作品审核通过，你的作品卡片上才会显示署名（唯一ID+头像），并可被点击进入作者页。
          </div>
        </div>

        <div class="field" v-if="sourceType==='network'">
          <div class="label">网络图片来源链接（可选）</div>
          <input class="input" v-model="originUrl" placeholder="https://..." />
        </div>
      </div>

      <!-- 分区 3：标签与授权 -->
      <div class="block">
        <div class="btitle">标签与授权</div>

        <div class="grid2">
          <div class="field">
            <div class="label">标签（可选，不需要#）</div>

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

            <div class="hint">标签会参与搜索；发布后也可点击标签快速筛选。</div>
          </div>

          <div class="field" v-if="sourceType==='personal'">
            <div class="label">授权许可（可多选）</div>
            <div class="licenseBox">
              <label class="licItem" v-for="opt in LICENSE_OPTIONS" :key="opt">
                <input type="checkbox" :value="opt" v-model="licenses" />
                <span class="licText">{{ opt }}</span>
              </label>
            </div>
            <div class="hint">不勾选表示默认不授权。授权内容会显示在作品详情弹窗里。</div>
          </div>
        </div>
      </div>

      <!-- 分区 4：文件 -->
      <div class="block">
        <div class="btitle">图片文件</div>

        <div class="field">
          <div class="label">选择图片文件（必选）</div>
          <input class="input file" type="file" accept="image/*" @change="onFile" required />
          <div class="hint">建议清晰原图；提交后进入待审核队列。</div>
        </div>

        <div class="actions">
          <button class="btn" :disabled="submitting || !file" data-sfx="click">
            {{ submitting ? '提交中…' : '提交' }}
          </button>
          <span class="msg">{{ msg }}</span>
        </div>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { api } from '../services/api' // 使用新的 api 模块

const LICENSE_OPTIONS = [
  '可在b站、小红书等社交媒体转载',
  '可在视频或游戏等企划中使用',
  '可制作无料等周边',
  '可制作贩售周边'
]

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

const licenses = ref([])

const msg = ref('')
const submitting = ref(false)

const uidHintClass = computed(() => uidHint.value.includes('✅') ? 'ok' : (uidHint.value.includes('❌') ? 'bad' : ''))

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
    licenses.value = []
  }
})

async function submit(){
  msg.value = ''
  if(!file.value){ msg.value = '请选择图片文件'; return }
  if(!title.value.trim() || !description.value.trim()){
    msg.value = '作品名称与描述为必填'
    return
  }

  if(sourceType.value === 'personal'){
    const u = uid.value.trim()
    if(!u){ msg.value = '个人作品必须填写唯一ID'; return }
    if(!uidExists.value){
      await checkUid()
      if(!uidExists.value){
        msg.value = '唯一ID不存在，无法提交个人作品'
        return
      }
    }
  }

  submitting.value = true
  try{
    const fd = new FormData()
    fd.append('image', file.value)
    fd.append('uploader_name', uploaderName.value.trim())
    fd.append('title', title.value.trim())
    fd.append('description', description.value.trim())
    fd.append('tags', tags.value.join(' '))
    fd.append('source_type', sourceType.value)
    fd.append('content_type', contentType.value)
    fd.append('origin_url', originUrl.value.trim())

    if(sourceType.value === 'personal'){
      fd.append('uploader_uid', uid.value.trim())
      fd.append('licenses', JSON.stringify(licenses.value))
    }

    const r = await api.uploadArtwork(fd)
    msg.value = r.pointsWillBeAddedAfterApprove
      ? '提交成功 ✅（若审核通过，将自动记 20 积分）'
      : '提交成功 ✅（待管理员审核）'

    // reset form
    title.value = ''
    description.value = ''
    originUrl.value = ''
    file.value = null
    clearTags()
  }catch(e){
    msg.value = `提交失败：${e.message}`
  }finally{
    submitting.value = false
  }
}
</script>

<style scoped>
.head{ display:grid; gap:6px; }
.h1{ font-size:20px; font-weight:950; letter-spacing:.4px; }
.sub{ opacity:.72; }

.form{ display:grid; gap:14px; }

.block{
  padding:14px;
  border-radius:18px;
  border:1px solid rgba(0,0,0,.10);
  background: rgba(255,255,255,.72);
  box-shadow: 0 18px 44px rgba(0,0,0,.06);
  display:grid;
  gap:12px;
}

.btitle{
  font-weight: 950;
  letter-spacing: .2px;
  opacity: .90;
}

.grid2{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
@media (max-width: 820px){ .grid2{ grid-template-columns: 1fr; } }

.field{ display:grid; gap:8px; }
.label{ font-weight:950; font-size:12px; opacity:.78; letter-spacing:.3px; }

.input, .textarea{
  width:100%;
  padding:10px 12px;
  border-radius:14px;
  border:1px solid rgba(0,0,0,.12);
  background: rgba(255,255,255,.85);
  font-weight: 850;
  outline:none;
}
.input:focus, .textarea:focus{
  border-color: rgba(20,184,166,.55);
  box-shadow: 0 0 0 4px rgba(20,184,166,.14);
}
.textarea{ min-height: 110px; resize: vertical; }

.hint{ font-size:12px; opacity:.65; line-height:1.5; }
.hint.ok{ opacity:1; color: rgba(16,120,70,.95); font-weight:900; }
.hint.bad{ opacity:1; color: rgba(180,40,40,.95); font-weight:900; }

.inline{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.inline .input{ flex:1; min-width: 240px; }

.creatorRow{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.creatorAvatar{ width:34px; height:34px; border-radius:50%; object-fit:cover; border:1px solid rgba(0,0,0,.12); }

.seg{ display:flex; gap:8px; flex-wrap:wrap; }
.segbtn{
  border:1px solid rgba(0,0,0,.12);
  background: rgba(255,255,255,.80);
  padding:9px 12px;
  border-radius:999px;
  cursor:pointer;
  font-weight:950;
  opacity:.86;
  transition: transform .12s ease, background .12s ease, opacity .12s ease;
}
.segbtn:hover{ opacity:1; }
.segbtn:active{ transform: scale(1.06); }
.segbtn.on{
  background: rgba(0,0,0,.88);
  color:#fff;
  border-color: rgba(0,0,0,.88);
  opacity:1;
  animation: pop .18s ease-out;
}
@keyframes pop{
  0%{ transform: scale(1); }
  60%{ transform: scale(1.08); }
  100%{ transform: scale(1); }
}

.file{ padding:8px 10px; }

.actions{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
.msg{ opacity:.78; font-weight:850; }

.tagRow{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.tagRow .input{ flex:1; min-width: 240px; }

.tagList{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.tagChip{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:6px 10px;
  border-radius:999px;
  border:1px solid rgba(0,0,0,.12);
  background: rgba(255,255,255,.78);
  font-size:12px;
}
.tagChip .t{ font-weight:950; color: rgba(25,110,255,.95); }
.tagChip .x{
  border:0;
  background: transparent;
  cursor:pointer;
  font-weight:950;
  opacity:.75;
}
.tagChip .x:hover{ opacity:1; }

.licenseBox{
  display:grid;
  gap:10px;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,.10);
  background: rgba(255,255,255,.82);
}
.licItem{ display:flex; gap:10px; align-items:flex-start; cursor:pointer; user-select:none; }
.licItem input{ margin-top: 2px; }
.licText{ font-weight: 850; opacity: .86; line-height: 1.5; }
</style>