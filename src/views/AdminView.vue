<template>
  <section class="container-card">
    <div class="head">
      <div class="h1">管理后台</div>
      <div class="sub">仅前端密码校验：输入正确密码（05219）即可进入本页。</div>
    </div>

    <div class="hr"></div>

    <div v-if="!authed" class="auth">
      <div class="tip">未通过密码校验。请重新输入密码。</div>
      <div class="form2">
        <input class="input" v-model="inputPw" type="password" placeholder="密码" @keydown.enter="checkPw" />
        <button class="btn" @click="checkPw">进入</button>
      </div>
      <div class="msg">{{ msg }}</div>
    </div>

    <div v-else class="panel">
      <div class="tabs">
        <button :class="['tab', tab==='review' && 'on']" @click="tab='review'">图片审核</button>
        <button :class="['tab', tab==='audit' && 'on']" @click="tab='audit'">审核记录</button>
        <button :class="['tab', tab==='points' && 'on']" @click="tab='points'">积分流水</button>
        <button :class="['tab', tab==='creators' && 'on']" @click="tab='creators'">创作者名单</button>
      </div>

      <div class="hr"></div>

      <div v-if="tab==='review'" class="section">
        <div class="sectionHead">
          <div class="h2">待审核图片</div>
          <button class="btn-ghost" @click="adminStore.loadPending" :disabled="adminStore.loading">
            {{ adminStore.loading ? '加载中…' : '刷新' }}
          </button>
        </div>

        <div v-if="adminStore.error" class="error-box">
          {{ adminStore.error }}
        </div>

        <div v-else-if="adminStore.pending.length" class="pendingGrid">
          <article class="pcard" v-for="it in adminStore.pending" :key="it.id">
            <div class="pthumb">
              <img :src="it.image_url" :alt="it.title" />
              <div class="sig" v-if="it.source_type==='personal' && it.uploader_uid">
                <span>{{ it.uploader_uid }}</span>
              </div>
            </div>

            <div class="pbody">
              <div class="ptitle">{{ it.title }}</div>
              <div class="pbads">
                <span class="badge">{{ it.content_type==='haruhi'?'凉宫内容':'非凉宫内容' }}</span>
                <span class="badge">{{ it.source_type==='personal'?'个人作品':'网络图片' }}</span>
              </div>

              <div class="pdesc">{{ it.description }}</div>

              <div class="license-audit" v-if="it.source_type==='personal'">
                <div class="lic-group">
                  <div class="lic-label">🌐 网络公开授权</div>
                  <div class="lic-val" v-if="getNetLicenses(it).length">
                    <span v-for="l in getNetLicenses(it)" :key="l" class="l-tag net">{{ l }}</span>
                  </div>
                  <div class="lic-val empty" v-else>无</div>
                </div>
                
                <div class="lic-group">
                  <div class="lic-label">🎁 应援团特别授权</div>
                  <div class="lic-val" v-if="getGroupLicenses(it).length">
                    <span v-for="l in getGroupLicenses(it)" :key="l" class="l-tag group">{{ l }}</span>
                  </div>
                  <div class="lic-val empty" v-else>无</div>
                </div>
              </div>

              <div class="pmeta">
                <span>{{ new Date(it.created_at).toLocaleString() }}</span>
                <span v-if="it.origin_url"> · <a :href="it.origin_url" target="_blank">来源</a></span>
              </div>

              <textarea class="textarea" v-model="notes[it.id]" placeholder="审核备注（可选）"></textarea>

              <div class="pactions">
                <button class="btn" @click="approve(it)" :disabled="actingId===it.id">通过</button>
                <button class="btn-ghost" @click="reject(it)" :disabled="actingId===it.id">驳回</button>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="empty">暂无待审核提交。</div>
      </div>

      <div v-if="tab==='audit'" class="section">
        <div class="sectionHead">
          <div class="h2">审核记录 (历史归档)</div>
          <button class="btn-ghost" @click="loadAuditHistory" :disabled="loading">{{ loading ? '加载中…' : '刷新' }}</button>
        </div>

        <div v-if="auditHistory.length" class="pendingGrid">
          <article class="pcard history-card" v-for="it in auditHistory" :key="it.id">
            <div class="pthumb">
              <img :src="it.image_url" :alt="it.title" />
              <div class="status-overlay" :class="it.status === 'approved' ? 'approved' : 'rejected'">
                {{ it.status === 'approved' ? '已通过' : '已驳回' }}
              </div>
            </div>

            <div class="pbody">
              <div style="display:flex; justify-content:space-between;">
                <div class="ptitle">{{ it.title }}</div>
                <div class="small-meta" v-if="it.reviewed_at">审核于: {{ new Date(it.reviewed_at).toLocaleString() }}</div>
              </div>

              <div class="pbads">
                <span class="badge">{{ it.content_type==='haruhi'?'凉宫':'非凉宫' }}</span>
                <span class="badge">{{ it.source_type==='personal'?'个人':'网络' }}</span>
                <span class="badge uploader">上传者: {{ it.uploader_name || '匿名' }}</span>
                <span class="badge uid" v-if="it.uploader_uid">UID: {{ it.uploader_uid }}</span>
              </div>

              <div class="license-audit" v-if="it.source_type==='personal'">
                <div class="lic-group">
                  <div class="lic-label">🌐 网络授权</div>
                  <div class="lic-val" v-if="getNetLicenses(it).length">
                    <span v-for="l in getNetLicenses(it)" :key="l" class="l-tag net">{{ l }}</span>
                  </div>
                  <div class="lic-val empty" v-else>无</div>
                </div>
                
                <div class="lic-group">
                  <div class="lic-label">🎁 应援团授权</div>
                  <div class="lic-val" v-if="getGroupLicenses(it).length">
                    <span v-for="l in getGroupLicenses(it)" :key="l" class="l-tag group">{{ l }}</span>
                  </div>
                  <div class="lic-val empty" v-else>无</div>
                </div>
              </div>

              <div class="pmeta">
                <span>上传于: {{ new Date(it.created_at).toLocaleString() }}</span>
                <span v-if="it.review_note" style="color:red; margin-left:10px;">备注: {{ it.review_note }}</span>
              </div>
            </div>
          </article>
        </div>
        <div v-else class="empty">暂无审核记录。</div>
      </div>

      <div v-if="tab==='points'" class="section">
        <div class="sectionHead">
          <div class="h2">积分流水</div>
          <button class="btn-ghost" @click="loadLedger" :disabled="loading">{{ loading ? '加载中…' : '刷新' }}</button>
        </div>
        <div v-if="ledger.length" class="ledger">
          <div class="lrow head"><div>时间</div><div>UID</div><div>作品</div><div>积分</div></div>
          <div class="lrow" v-for="p in ledger" :key="p.granted_at + p.uid">
            <div>{{ new Date(p.granted_at).toLocaleString() }}</div>
            <div class="uid">{{ p.uid }}</div>
            <div class="title">{{ p.artwork_title }}</div>
            <div><b>{{ p.points }}</b></div>
          </div>
        </div>
        <div v-else class="empty">暂无积分记录。</div>
      </div>

      <div v-if="tab==='creators'" class="section">
        <div class="sectionHead">
          <div class="h2">创作者名单</div>
          <button class="btn-ghost" @click="loadCreators" :disabled="loading">{{ loading ? '加载中…' : '刷新' }}</button>
        </div>
        <div v-if="creators.length" class="ctable">
          <div class="crow" v-for="c in creators" :key="c.uid">
            <div><img v-if="c.avatar_url" class="mini" :src="c.avatar_url" /></div>
            <div class="uid">{{ c.uid }}</div>
          </div>
        </div>
        <div v-else class="empty">暂无创作者。</div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useAdminStore } from '../stores/adminStore.js'
import { api } from '../services/api.js'

const adminStore = useAdminStore()
const authed = ref(false)
const inputPw = ref('')
const msg = ref('')
const tab = ref('review') // 默认 tab
const loading = ref(false)

const notes = ref({})
const actingId = ref(null)

const ledger = ref([])
const creators = ref([])
const auditHistory = ref([]) // 新增：审核历史数据

function checkPw(){
  if(inputPw.value === '05219'){
    authed.value = true
    localStorage.setItem('admin_pw', '05219')
    init()
  } else {
    msg.value = '密码错误'
  }
}

async function init(){
  await adminStore.loadPending()
}

// 辅助函数：解析授权
function getNetLicenses(it) {
  const all = Array.isArray(it.licenses) ? it.licenses : []
  return all.filter(l => l.startsWith('NET:')).map(l => l.replace('NET:', ''))
}

function getGroupLicenses(it) {
  const all = Array.isArray(it.licenses) ? it.licenses : []
  return all.filter(l => l.startsWith('GROUP:')).map(l => l.replace('GROUP:', ''))
}

async function approve(it){
  actingId.value = it.id
  try {
    await adminStore.approveArtwork(it, notes.value[it.id] || '')
    // 审核后如果有需要可以刷新积分流水
    if(tab.value === 'points') loadLedger()
  } finally {
    actingId.value = null
  }
}

async function reject(it){
  actingId.value = it.id
  try {
    await adminStore.rejectArtwork(it, notes.value[it.id] || '')
  } finally {
    actingId.value = null
  }
}

async function loadLedger(){
  loading.value = true
  try {
    const r = await api.adminPointsLedger()
    ledger.value = r.data || []
  } finally {
    loading.value = false
  }
}

async function loadCreators(){
  loading.value = true
  try {
    const r = await api.adminCreators()
    creators.value = r.data || []
  } finally {
    loading.value = false
  }
}

// 新增：加载审核历史
async function loadAuditHistory(){
  loading.value = true
  try {
    if(api.adminAuditHistory) {
      const r = await api.adminAuditHistory()
      auditHistory.value = r.data || []
    }
  } catch(e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

// 监听 tab 切换，自动加载数据
watch(tab, (newTab) => {
  if (newTab === 'audit') loadAuditHistory()
  if (newTab === 'points') loadLedger()
  if (newTab === 'creators') loadCreators()
})

onMounted(() => {
  const stored = localStorage.getItem('admin_pw')
  if(stored === '05219'){
    authed.value = true
    init()
  }
})
</script>

<style scoped>
.head{ display:grid; gap:6px; }
.h1{ font-size:20px; font-weight:950; }
.sub{ opacity:.72; }
.auth{ display:grid; gap:10px; padding: 20px 0; }
.form2{ display:flex; gap:10px; max-width: 300px; }
.input{ flex:1; padding:8px 12px; border-radius:8px; border:1px solid #ccc; }
.tabs{ display:flex; gap:8px; flex-wrap:wrap; margin-bottom: 14px; }
.tab{ padding:8px 12px; border-radius:999px; border:1px solid #ddd; background:#fff; cursor:pointer; transition: all 0.2s; }
.tab.on{ background:#000; color:#fff; border-color:#000; }
.pendingGrid{ display:grid; gap:12px; }
.pcard{ display:grid; grid-template-columns: 200px 1fr; gap:12px; border:1px solid #eee; background:#fff; border-radius:12px; overflow:hidden; }
.pthumb{ height:150px; position:relative; }
.pthumb img{ width:100%; height:100%; object-fit:cover; }
.pbody{ padding:12px; display:grid; gap:8px; }
.pactions{ display:flex; gap:8px; }
.badge{ display:inline-block; padding:2px 6px; background:#f0f0f0; border-radius:4px; font-size:12px; margin-right:4px; }
.badge.uploader { background: #e0f2fe; color: #0284c7; }
.badge.uid { background: #f3e8ff; color: #7e22ce; }
.textarea{ width:100%; border:1px solid #ddd; border-radius:6px; padding:6px; }
.lrow{ display:grid; grid-template-columns: 1fr 1fr 2fr 80px; gap:10px; padding:8px; border-bottom:1px solid #eee; }
.lrow.head{ font-weight:bold; background:#f9f9f9; }
.crow{ display:flex; align-items:center; gap:12px; padding:8px; border-bottom:1px solid #eee; }
.mini{ width:32px; height:32px; border-radius:50%; }
.btn{ background:#000; color:#fff; border:0; padding:6px 12px; border-radius:6px; cursor:pointer; }
.btn-ghost{ background:transparent; border:1px solid #ccc; padding:6px 12px; border-radius:6px; cursor:pointer; }
.error-box { padding:12px; background:#fee; color:red; border-radius:8px; margin-bottom:10px; font-weight:bold; }

/* 授权展示样式 */
.license-audit {
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  display: grid;
  gap: 8px;
}
.lic-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.lic-label {
  font-weight: bold;
  color: #475569;
  min-width: 120px;
}
.lic-val {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.lic-val.empty { color: #94a3b8; font-style: italic; }
.l-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.l-tag.net { background: #dbeafe; color: #1e40af; }
.l-tag.group { background: #fce7f3; color: #9d174d; font-weight: bold; }

/* 审核记录相关样式 */
.history-card { opacity: 0.9; } /* 历史记录稍微淡一点 */
.small-meta { font-size: 12px; color: #888; text-align: right; }
.status-overlay {
  position: absolute; top: 0; left: 0; right: 0;
  padding: 4px; text-align: center; color: #fff; font-weight: bold; font-size: 12px;
  backdrop-filter: blur(4px);
}
.status-overlay.approved { background: rgba(20, 184, 166, 0.85); }
.status-overlay.rejected { background: rgba(239, 68, 68, 0.85); }
</style>