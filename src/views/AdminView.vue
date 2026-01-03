<template>
  <section class="container-card admin-panel">
    <!-- 顶部 -->
    <div class="head-row">
      <div class="head-left">
        <div class="h1">管理后台 (AI Enhanced)</div>
        <div class="sub" v-if="authed">已登录 | Security: Backend Env</div>
      </div>
      <button v-if="authed" class="btn-ghost sm danger" @click="logout">退出登录</button>
    </div>

    <!-- 登录页 -->
    <div v-if="!authed" class="auth-box">
      <div class="form2">
        <input class="input" v-model="inputPw" type="password" placeholder="请输入管理员密码" @keydown.enter="checkPw" />
        <button class="btn" @click="checkPw" :disabled="loading">
          {{ loading ? '验证中...' : '进入系统' }}
        </button>
      </div>
      <div class="msg" v-if="msg">{{ msg }}</div>
    </div>

    <!-- 主面板 -->
    <div v-else class="panel-layout">
      <!-- 左侧/顶部 一级导航 -->
      <nav class="main-nav">
        <button :class="['nav-item', mainTab==='images' && 'active']" @click="mainTab='images'">
          📷 图片管理
        </button>
        <button :class="['nav-item', mainTab==='comments' && 'active']" @click="mainTab='comments'">
          💬 评论管理
        </button>
        <button :class="['nav-item', mainTab==='creators' && 'active']" @click="mainTab='creators'">
          🎨 创作者
        </button>
      </nav>

      <!-- 内容区域 -->
      <main class="content-area">

        <!-- ================= 图片管理 ================= -->
        <div v-if="mainTab==='images'" class="tab-content">
          <div class="sub-tabs">
            <button :class="['sub-tab', imageTab==='audit' && 'on']" @click="imageTab='audit'">审核管理 ({{ adminStore.pending.length }})</button>
            <button :class="['sub-tab', imageTab==='list' && 'on']" @click="imageTab='list'">作品列表 (已过审)</button>
          </div>

          <!-- 子页：审核管理 -->
          <div v-if="imageTab==='audit'" class="sub-view">
            <div class="toolbar">
              <span class="tip">待审核或被AI拦截的内容</span>
              <button class="btn-ghost sm" @click="adminStore.loadPending">刷新队列</button>
            </div>

            <div v-if="adminStore.pending.length" class="card-grid">
              <article class="manage-card" v-for="it in adminStore.pending" :key="it.id">
                <div class="m-thumb" @click="openPreview(it)" style="cursor: pointer;" title="点击预览">
                  <img :src="it.image_url" loading="lazy" />
                  <div class="status-badge" :class="it.status">{{ it.status === 'flagged' ? 'AI 锁定' : '待审核' }}</div>
                </div>
                <div class="m-body">
                  <div class="m-row title-row">
                    <div class="m-title">{{ it.title }}</div>
                    <button class="btn-text" @click="startEdit(it)">编辑</button>
                  </div>
                  
                  <div class="ai-box" v-if="it.status === 'flagged'">
                    <span class="ai-label">🤖 拦截原因:</span> {{ it.ai_reason || '未知风险' }}
                  </div>

                  <div class="m-info">
                    <span class="tag">{{ it.content_type }}</span>
                    <span class="tag">{{ it.source_type }}</span>
                    <span class="u-name">UP: {{ it.uploader_name || '匿名' }} ({{ it.uploader_uid || '无UID' }})</span>
                  </div>
                  <div class="m-desc">{{ it.description }}</div>
                  
                  <!-- 编辑器 -->
                  <div v-if="editingId === it.id" class="inline-editor">
                    <input v-model="editForm.title" class="input sm" placeholder="标题">
                    <textarea v-model="editForm.description" class="textarea sm" placeholder="描述"></textarea>
                    <div class="btns">
                      <button class="btn sm" @click="saveEdit(it)">保存</button>
                      <button class="btn-ghost sm" @click="editingId=null">取消</button>
                    </div>
                  </div>

                  <div class="m-actions">
                    <textarea class="textarea note-input" v-model="notes[it.id]" placeholder="审核备注..."></textarea>
                    <div class="btn-group">
                      <button class="btn success" @click="approve(it)">通过</button>
                      <button class="btn danger" @click="hardDelete(it)">彻底删除</button>
                    </div>
                  </div>
                </div>
              </article>
            </div>
            <div v-else class="empty-state">🎉 暂无待审核内容</div>
          </div>

          <!-- 子页：作品列表 (已过审) -->
          <div v-if="imageTab==='list'" class="sub-view">
            <div class="toolbar filter-bar">
              <div class="filters">
                <select v-model="artListFilter.content" @change="loadApprovedList" class="select">
                  <option value="all">全部分类</option>
                  <option value="haruhi">凉宫内容</option>
                  <option value="other">非凉宫内容</option>
                </select>
                <select v-model="artListFilter.source" @change="loadApprovedList" class="select">
                  <option value="all">全部来源</option>
                  <option value="personal">个人作品</option>
                  <option value="network">网络收集</option>
                </select>
                <input v-model="artListFilter.q" @keydown.enter="loadApprovedList" class="input sm search-input" placeholder="搜索标题/描述/UID..." />
                <button class="btn sm" @click="loadApprovedList">查询</button>
              </div>
            </div>

            <div class="card-grid">
              <article class="manage-card" v-for="it in approvedList" :key="it.id">
                <div class="m-thumb" @click="openPreview(it)" style="cursor: pointer;" title="点击预览">
                  <img :src="it.image_url" loading="lazy" />
                  <div class="status-badge approved">已发布</div>
                </div>
                <div class="m-body">
                   <div class="m-row title-row">
                    <div class="m-title">{{ it.title }}</div>
                    <button class="btn-text" @click="startEdit(it)">编辑</button>
                  </div>
                  <div class="m-info">
                    <span class="tag">{{ it.content_type }}</span>
                    <span class="tag">{{ it.source_type }}</span>
                    <span class="u-name">UID: {{ it.uploader_uid }}</span>
                  </div>
                  <div class="m-desc">{{ it.description }}</div>
                  
                  <div v-if="editingId === it.id" class="inline-editor">
                    <input v-model="editForm.title" class="input sm" placeholder="标题">
                    <textarea v-model="editForm.description" class="textarea sm" placeholder="描述"></textarea>
                    <div class="btns">
                      <button class="btn sm" @click="saveEdit(it)">保存</button>
                      <button class="btn-ghost sm" @click="editingId=null">取消</button>
                    </div>
                  </div>

                  <div class="m-actions right">
                    <button class="btn-ghost warn sm" @click="lockArtwork(it)">🔒 锁定 (退回审核)</button>
                    <button class="btn-ghost danger sm" @click="hardDelete(it, 'list')">🗑 删除</button>
                  </div>
                </div>
              </article>
            </div>
            <div class="pagination">
              <button class="btn-ghost sm" :disabled="artListPage<=1" @click="changePage(-1)">上一页</button>
              <span>第 {{ artListPage }} 页</span>
              <button class="btn-ghost sm" @click="changePage(1)">下一页</button>
            </div>
          </div>
        </div>

        <!-- ================= 评论管理 ================= -->
        <div v-if="mainTab==='comments'" class="tab-content">
          <div class="sub-tabs">
            <button :class="['sub-tab', commentTab==='pending' && 'on']" @click="switchCommentTab('pending')">待复核 (AI锁定)</button>
            <button :class="['sub-tab', commentTab==='all' && 'on']" @click="switchCommentTab('all')">全部评论</button>
          </div>

          <div class="toolbar" v-if="commentTab==='all'">
            <input v-model="commentSearch" class="input sm" placeholder="搜索评论内容..." style="width: 240px;" />
          </div>

          <div class="comment-table">
            <div class="c-row header">
              <div class="col-user">用户</div>
              <div class="col-content">内容</div>
              <div class="col-status">状态</div>
              <div class="col-action">操作</div>
            </div>
            <div class="c-row" v-for="c in filteredComments" :key="c.id">
              <div class="col-user">
                <div class="u-name">{{ c.user_name }}</div>
                <div class="u-time">{{ new Date(c.created_at).toLocaleString() }}</div>
              </div>
              <div class="col-content">
                <div class="body-text">{{ c.body }}</div>
                <div v-if="c.ai_reason" class="ai-reason-mini">🤖 {{ c.ai_reason }}</div>
              </div>
              <div class="col-status">
                <span :class="['badge-mini', c.status]">{{ c.status === 'flagged' ? 'AI锁定' : (c.status==='hidden'?'隐藏':'正常') }}</span>
              </div>
              <div class="col-action actions-flex">
                <button v-if="c.status !== 'public'" class="btn-mini success" @click="updateComment(c, 'public')">通过</button>
                <button v-if="c.status === 'public'" class="btn-mini warn" @click="updateComment(c, 'flagged')">锁定</button>
                <button class="btn-mini danger" @click="deleteComment(c)">删除</button>
              </div>
            </div>
            <div v-if="filteredComments.length === 0" class="empty-row">无数据</div>
          </div>
        </div>

        <!-- ================= 创作者管理 ================= -->
        <div v-if="mainTab==='creators'" class="tab-content">
          <div class="toolbar">
            <input v-model="creatorSearch" class="input sm" placeholder="搜索 UID..." />
            <div class="right-tool">
               <input v-model="newCreatorUid" placeholder="新增 UID" class="input sm" style="width:120px" />
               <button class="btn sm" @click="addCreator">添加创作者</button>
            </div>
          </div>

          <div class="creator-grid">
            <div class="creator-card" v-for="c in filteredCreators" :key="c.uid" @click="openCreatorModal(c)">
              <div class="c-avatar-box">
                <img :src="c.avatar_url || '/api/placeholder/40/40'" class="c-avatar" />
              </div>
              <div class="c-info">
                <div class="c-uid">{{ c.uid }}</div>
                <div class="c-pts">点击管理积分详情</div>
              </div>
              <div class="c-arrow">➔</div>
            </div>
          </div>
        </div>

      </main>
    </div>

    <!-- 作品预览弹窗 -->
    <ArtworkModal v-model="showPreview" :item="previewItem" />

    <!-- 创作者积分管理弹窗 -->
    <div v-if="showCreatorModal" class="modal-overlay" @click.self="closeCreatorModal">
      <div class="modal-box">
        <div class="modal-head">
          <div class="modal-title">积分管理 - {{ selectedCreator?.uid }}</div>
          <button class="close-btn" @click="closeCreatorModal">×</button>
        </div>
        <div class="modal-body">
          <div class="points-history">
            <div class="ph-row head">
              <span>时间</span>
              <span>变动</span>
              <span>原因</span>
            </div>
            <div class="ph-list">
              <div class="ph-row" v-for="(log, idx) in creatorLogs" :key="idx">
                <span class="ph-time">{{ new Date(log.granted_at).toLocaleDateString() }}</span>
                <span class="ph-val" :class="log.points > 0 ? 'pos' : 'neg'">{{ log.points > 0 ? '+' : '' }}{{ log.points }}</span>
                <span class="ph-reason">{{ log.note || log.artwork_title }}</span>
              </div>
              <div v-if="!creatorLogs.length" class="empty-ph">暂无记录</div>
            </div>
          </div>

          <div class="points-action">
            <div class="label">手动调整积分</div>
            
            <!-- 快捷数额选择 -->
            <div class="quick-points">
              <button v-for="v in [10, 20, 50, -10, -50]" :key="v" 
                class="chip-btn" 
                :class="pointsForm.amount === v && 'active'"
                @click="pointsForm.amount = v">
                {{ v > 0 ? '+' + v : v }}
              </button>
            </div>

            <div class="pa-form">
              <div class="input-group">
                <span class="input-prefix">分值</span>
                <input type="number" v-model.number="pointsForm.amount" class="input points-num" />
              </div>
              
              <input v-model="pointsForm.reason" class="input" placeholder="输入变更原因 (必填)" style="flex:1" />
              <button class="btn lg" @click="grantPoints" :disabled="!pointsForm.reason">执行</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useAdminStore } from '../stores/adminStore.js'
import { api } from '../services/api.js'
import ArtworkModal from '../components/ArtworkModal.vue'

const adminStore = useAdminStore()
const authed = ref(false)
const inputPw = ref('')
const msg = ref('')
const loading = ref(false)

// 导航状态
const mainTab = ref('images') // images, comments, creators
const imageTab = ref('audit') // audit, list
const commentTab = ref('pending') // pending, all

// --- 图片管理数据 ---
const approvedList = ref([])
const artListPage = ref(1)
const artListFilter = ref({ content: 'all', source: 'all', q: '' })
const editingId = ref(null)
const editForm = ref({ title: '', description: '', tags: '' })
const notes = ref({}) // 审核备注
const showPreview = ref(false)
const previewItem = ref(null)

// --- 评论管理数据 ---
const comments = ref([])
const commentSearch = ref('')

// --- 创作者管理数据 ---
const creators = ref([])
const creatorSearch = ref('')
const newCreatorUid = ref('')
const showCreatorModal = ref(false)
const selectedCreator = ref(null)
const creatorLogs = ref([])
const pointsForm = ref({ amount: 10, reason: '' })

// 计算属性：过滤后的创作者
const filteredCreators = computed(() => {
  if (!creatorSearch.value) return creators.value
  const q = creatorSearch.value.toLowerCase()
  return creators.value.filter(c => c.uid.toLowerCase().includes(q))
})

// 计算属性：过滤后的评论
const filteredComments = computed(() => {
  if (commentTab.value === 'pending') return comments.value // 已在 fetch 时过滤
  if (!commentSearch.value) return comments.value
  const q = commentSearch.value.toLowerCase()
  return comments.value.filter(c => 
    c.body.toLowerCase().includes(q) || 
    c.user_name.toLowerCase().includes(q)
  )
})

// --- 核心方法 ---

async function checkPw() {
  if (!inputPw.value) return
  loading.value = true
  msg.value = ''
  
  try {
    // 调用后端验证接口，不再在前端硬编码密码
    await api.adminVerify(inputPw.value)
    
    // 验证成功
    authed.value = true
    localStorage.setItem('admin_pw', inputPw.value)
    init()
  } catch (e) {
    msg.value = '密码错误或无权限'
    // 验证失败，清除本地存储的错误密码（如果有）
    localStorage.removeItem('admin_pw')
  } finally {
    loading.value = false
  }
}

// 退出登录
function logout() {
  localStorage.removeItem('admin_pw')
  authed.value = false
  inputPw.value = ''
  msg.value = ''
}

function init() {
  adminStore.loadPending()
  loadApprovedList()
}

// ---------------- 图片管理 ----------------

// 加载 Pending
// (由 adminStore.loadPending 处理)

// 加载 Approved List
async function loadApprovedList() {
  try {
    const res = await api.artworksList({
      status: 'approved',
      content_type: artListFilter.value.content,
      source_type: artListFilter.value.source,
      q: artListFilter.value.q,
      page: artListPage.value,
      pageSize: 20
    })
    approvedList.value = res.data || []
  } catch(e) { console.error(e) }
}

function changePage(delta) {
  artListPage.value += delta
  loadApprovedList()
}

// 预览
function openPreview(it) {
  previewItem.value = it
  showPreview.value = true
}

// 审核操作
async function approve(it) {
  await adminStore.approveArtwork(it, notes.value[it.id])
}

// 彻底删除
async function hardDelete(it, from = 'audit') {
  if (!confirm(`⚠️ 警告：正在从数据库中永久删除作品 "${it.title}"。\n此操作不可恢复！是否继续？`)) return
  await api.adminDeleteArtwork(it.id)
  if (from === 'audit') adminStore.removeItem(it.id)
  else if (from === 'list') loadApprovedList()
}

// 锁定（退回 Flagged）
async function lockArtwork(it) {
  if (!confirm('锁定后该作品将下架并进入审核队列，确认？')) return
  await api.adminUpdateArtworkStatus(it.id, 'flagged')
  loadApprovedList()
  adminStore.loadPending() // 刷新 pending 队列
}

// 编辑相关
function startEdit(it) {
  editingId.value = it.id
  editForm.value = {
    title: it.title,
    description: it.description,
    tags: Array.isArray(it.tags) ? it.tags.join(' ') : ''
  }
}
async function saveEdit(it) {
  await api.adminUpdateArtworkDetails(it.id, editForm.value)
  it.title = editForm.value.title
  it.description = editForm.value.description
  editingId.value = null
}

// ---------------- 评论管理 ----------------

async function switchCommentTab(t) {
  commentTab.value = t
  commentSearch.value = ''
  // 映射 tab 到 API status 参数
  // pending tab -> flagged status
  // all tab -> all status
  const statusParam = t === 'pending' ? 'flagged' : 'all'
  const res = await api.adminListComments(statusParam)
  comments.value = res.data
}

async function updateComment(c, status) {
  await api.adminUpdateCommentStatus(c.id, status)
  // 刷新当前列表
  switchCommentTab(commentTab.value)
}

async function deleteComment(c) {
  if (!confirm('确认删除评论？')) return
  await api.adminDeleteComment(c.id)
  comments.value = comments.value.filter(x => x.id !== c.id)
}

// ---------------- 创作者管理 ----------------

async function loadCreators() {
  const res = await api.adminCreators()
  creators.value = res.data
}

async function addCreator() {
  if (!newCreatorUid.value) return
  await api.adminAddCreator(newCreatorUid.value)
  newCreatorUid.value = ''
  loadCreators()
}

async function openCreatorModal(c) {
  selectedCreator.value = c
  showCreatorModal.value = true
  pointsForm.value = { amount: 10, reason: '' }
  // 加载积分记录
  const res = await api.adminPointsLedger()
  // 客户端过滤 UID (因为后端暂无特定接口)
  creatorLogs.value = (res.data || []).filter(l => l.uid === c.uid)
}

function closeCreatorModal() {
  showCreatorModal.value = false
  selectedCreator.value = null
}

async function grantPoints() {
  if (!selectedCreator.value || !pointsForm.value.reason) return
  try {
    await api.adminGrantPoints({
      uid: selectedCreator.value.uid,
      artwork_id: 0, // 0 代表手动/系统操作
      points: pointsForm.value.amount,
      note: pointsForm.value.reason
    })
    // 刷新记录
    const res = await api.adminPointsLedger()
    creatorLogs.value = (res.data || []).filter(l => l.uid === selectedCreator.value.uid)
    pointsForm.value.reason = '' // 清空原因
    // alert('操作成功') 
  } catch(e) {
    alert('操作失败')
  }
}

// 监听 Tab 切换加载数据
watch(mainTab, (v) => {
  if (v === 'images' && imageTab.value === 'list') loadApprovedList()
  if (v === 'comments') switchCommentTab('pending')
  if (v === 'creators') loadCreators()
})

onMounted(async () => {
  // 尝试使用本地存储的密码自动登录
  const savedPw = localStorage.getItem('admin_pw')
  if (savedPw) {
    loading.value = true
    try {
      await api.adminVerify(savedPw)
      authed.value = true
      init()
    } catch {
      // 密码失效或过期
      localStorage.removeItem('admin_pw')
    } finally {
      loading.value = false
    }
  }
})
</script>

<style scoped>
/* 全局样式 */
.admin-panel {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
}

/* 顶部 Header */
.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f3f4f6;
}
.head-left { display: flex; flex-direction: column; gap: 4px; }
.h1 { font-size: 24px; font-weight: 900; color: #1f2937; }
.sub { font-size: 13px; color: #6b7280; font-family: monospace; }

.auth-box { padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.form2 { display: flex; gap: 10px; }
.msg { color: #dc2626; font-size: 13px; margin-top: 10px; }

/* 布局 */
.panel-layout { display: flex; flex: 1; margin-top: 0px; }
.main-nav {
  width: 140px;
  border-right: 1px solid #e5e7eb;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  text-align: left;
  padding: 12px 15px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-weight: 600;
  color: #4b5563;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}
.nav-item:hover { background: #f3f4f6; color: #111; }
.nav-item.active { background: #eff6ff; color: #2563eb; border-left-color: #2563eb; }

.content-area { flex: 1; padding: 20px 30px; background: #f9fafb; }

/* 子Tab */
.sub-tabs { display: flex; gap: 20px; border-bottom: 1px solid #e5e7eb; margin-bottom: 20px; }
.sub-tab {
  padding: 10px 0;
  background: transparent;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: #9ca3af;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.sub-tab:hover { color: #4b5563; }
.sub-tab.on { color: #111; border-bottom-color: #111; }

/* 工具栏 */
.toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
.filter-bar { background: #fff; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; }
.filters { display: flex; gap: 10px; align-items: center; flex: 1; }
.tip { font-size: 13px; color: #6b7280; }

/* 卡片通用 */
.card-grid { display: grid; gap: 16px; }
.manage-card {
  display: flex;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.m-thumb { width: 140px; height: 140px; position: relative; flex-shrink: 0; }
.m-thumb.small { width: 100px; height: 100px; }
.m-thumb img { width: 100%; height: 100%; object-fit: cover; }

/* 状态标 */
.status-badge {
  position: absolute;
  top: 0; left: 0; right: 0;
  padding: 4px;
  text-align: center;
  font-size: 11px;
  font-weight: bold;
  color: #fff;
  background: rgba(0,0,0,0.6);
}
.status-badge.flagged { background: #dc2626; }
.status-badge.approved { background: #059669; }
.status-badge.pending { background: #d97706; }

.m-body { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.m-row { display: flex; justify-content: space-between; align-items: center; }
.m-title { font-weight: bold; font-size: 16px; color: #111; }

.m-info { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #6b7280; flex-wrap: wrap; }
.tag { background: #f3f4f6; padding: 2px 8px; border-radius: 4px; }
.u-name { margin-left: auto; }

.m-desc { font-size: 13px; color: #4b5563; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.ai-box { background: #fef2f2; border: 1px solid #fee2e2; padding: 6px 10px; border-radius: 4px; font-size: 12px; color: #b91c1c; }

/* 编辑器 */
.inline-editor { padding: 12px; background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 6px; display: flex; flex-direction: column; gap: 8px; margin: 8px 0; }
.btns { display: flex; gap: 8px; }

/* 操作栏 */
.m-actions { margin-top: auto; padding-top: 10px; display: flex; gap: 10px; align-items: center; }
.m-actions.right { justify-content: flex-end; }
.note-input { flex: 1; height: 34px; font-size: 13px; }
.btn-group { display: flex; gap: 8px; }

/* 评论表格 */
.comment-table { border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; overflow: hidden; }
.c-row { display: flex; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; align-items: flex-start; gap: 12px; }
.c-row.header { background: #f9fafb; font-weight: bold; font-size: 13px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
.col-user { width: 140px; font-size: 13px; }
.col-content { flex: 1; font-size: 13px; }
.col-status { width: 90px; text-align: center; }
.col-action { width: 160px; display: flex; gap: 6px; justify-content: flex-end; }

.u-name { font-weight: bold; color: #111; }
.u-time { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.body-text { color: #374151; line-height: 1.4; }
.ai-reason-mini { font-size: 11px; color: #dc2626; margin-top: 4px; font-weight: 500; }

.badge-mini { font-size: 11px; padding: 3px 8px; border-radius: 4px; background: #f3f4f6; color: #6b7280; }
.badge-mini.flagged { background: #fee2e2; color: #dc2626; }
.badge-mini.public { background: #d1fae5; color: #059669; }

/* 创作者卡片 */
.creator-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.creator-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.creator-card:hover { border-color: #2563eb; transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.c-avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; background: #eee; }
.c-info { flex: 1; }
.c-uid { font-weight: bold; font-size: 14px; color: #111; }
.c-pts { font-size: 12px; color: #6b7280; }
.c-arrow { color: #d1d5db; }

/* 弹窗 */
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(2px); }
.modal-box { background: #fff; border-radius: 16px; width: 520px; max-width: 90%; max-height: 85vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
.modal-head { padding: 16px 24px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: #fff; }
.modal-title { font-weight: bold; font-size: 18px; }
.close-btn { background: transparent; border: none; font-size: 24px; color: #9ca3af; cursor: pointer; padding: 4px; line-height: 1; }
.close-btn:hover { color: #111; }
.modal-body { padding: 24px; overflow-y: auto; background: #f9fafb; }

.points-history { margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; }
.ph-row { display: flex; padding: 10px 16px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
.ph-row:last-child { border-bottom: none; }
.ph-row.head { background: #f9fafb; font-weight: bold; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
.ph-time { width: 100px; color: #9ca3af; }
.ph-val { width: 70px; font-weight: bold; }
.ph-val.pos { color: #059669; }
.ph-val.neg { color: #dc2626; }
.ph-reason { flex: 1; color: #374151; }
.empty-ph { padding: 24px; text-align: center; color: #9ca3af; font-size: 13px; }

.points-action { background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
.label { font-weight: bold; font-size: 14px; margin-bottom: 12px; color: #1f2937; }

.quick-points { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.chip-btn {
  padding: 4px 12px; border-radius: 20px; border: 1px solid #e5e7eb; background: #fff; 
  cursor: pointer; font-size: 13px; font-weight: 500; color: #4b5563; transition: all 0.2s;
}
.chip-btn:hover { border-color: #d1d5db; background: #f3f4f6; }
.chip-btn.active { background: #1f2937; color: #fff; border-color: #1f2937; }

.pa-form { display: flex; gap: 12px; align-items: stretch; }
.input-group { position: relative; width: 100px; flex-shrink: 0; }
.input-prefix { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 12px; color: #9ca3af; pointer-events: none; }
.points-num { padding-left: 40px !important; text-align: center; font-weight: bold; }

/* 按钮与输入框通用 - 优化后 */
.btn { 
  padding: 0 16px; height: 38px; border-radius: 8px; font-size: 14px; font-weight: 600; 
  cursor: pointer; border: none; background: #111; color: #fff; transition: all 0.2s; 
  display: inline-flex; align-items: center; justify-content: center;
}
.btn:hover:not(:disabled) { background: #333; transform: translateY(-1px); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; background: #666; }
.btn.sm { height: 32px; font-size: 12px; padding: 0 12px; }
.btn.lg { height: 42px; font-size: 14px; }
.btn.success { background: #059669; }
.btn.success:hover:not(:disabled) { background: #047857; }
.btn.danger { background: #dc2626; }
.btn.danger:hover:not(:disabled) { background: #b91c1c; }

.btn-ghost { 
  height: 38px; padding: 0 16px; background: transparent; border: 1px solid #d1d5db; 
  color: #374151; border-radius: 8px; cursor: pointer; transition: all 0.2s;
  display: inline-flex; align-items: center; justify-content: center;
}
.btn-ghost:hover { background: #f3f4f6; border-color: #9ca3af; color: #111; }
.btn-ghost.sm { height: 32px; font-size: 12px; padding: 0 12px; }
.btn-ghost.warn { color: #d97706; border-color: #fbbf24; }
.btn-ghost.warn:hover { background: #fffbeb; border-color: #d97706; }
.btn-ghost.danger { color: #dc2626; border-color: #fca5a5; }
.btn-ghost.danger:hover { background: #fef2f2; border-color: #dc2626; }

.btn-text { background: transparent; border: none; color: #2563eb; cursor: pointer; font-size: 13px; text-decoration: underline; padding: 0; }
.btn-mini { padding: 4px 10px; font-size: 11px; border-radius: 6px; border: none; cursor: pointer; color: #fff; background: #6b7280; font-weight: 600; }
.btn-mini:hover { opacity: 0.9; }
.btn-mini.success { background: #059669; }
.btn-mini.warn { background: #d97706; }
.btn-mini.danger { background: #dc2626; }

.input, .textarea, .select { 
  border: 1px solid #d1d5db; border-radius: 8px; padding: 10px 12px; outline: none; 
  font-size: 14px; width: 100%; transition: all 0.2s; background: #fff;
}
.input.sm, .select.sm { padding: 6px 10px; font-size: 13px; }
.input:focus, .textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
.textarea { resize: vertical; min-height: 80px; }
</style>