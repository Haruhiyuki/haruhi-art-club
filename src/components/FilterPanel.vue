<template>
  <div class="filter-panel-3d">
    <div class="panel-group">
      <div class="control-box content-box">
        <div class="c-label">内容</div>
        <div class="toggle-track content-track">
          <div 
            class="slider-bg"
            :class="{ 
              'pos-0': content === 'haruhi', 
              'pos-1': content === 'other' 
            }"
          ></div>
          
          <button
            class="toggle-item"
            :class="{ active: content === 'haruhi' }"
            type="button"
            data-sfx="click"
            @click="emit('update:content', 'haruhi')"
          >
            凉宫
          </button>
          <button
            class="toggle-item"
            :class="{ active: content === 'other' }"
            type="button"
            data-sfx="click"
            @click="emit('update:content', 'other')"
          >
            其他
          </button>
        </div>
      </div>

      <div class="control-box source-box">
        <div class="c-label">来源</div>
        <div class="toggle-track source-track">
          
          <img src="/556.png" class="mascot-img" alt="decoration" />

          <div 
            class="slider-bg"
            :class="{ 
              'pos-0': sourceMode === 'all' || sourceMode === 'balanced', 
              'pos-1': sourceMode === 'network',
              'pos-2': sourceMode === 'personal'
            }"
          ></div>

          <button
            class="toggle-item"
            :class="{ active: sourceMode === 'all' || sourceMode === 'balanced' }"
            type="button"
            data-sfx="click"
            @click="emit('update:sourceMode', 'all')"
          >
            全部
          </button>
          <button
            class="toggle-item"
            :class="{ active: sourceMode === 'network' }"
            type="button"
            data-sfx="click"
            @click="emit('update:sourceMode', 'network')"
          >
            网络
          </button>
          <button
            class="toggle-item"
            :class="{ active: sourceMode === 'personal' }"
            type="button"
            data-sfx="click"
            @click="emit('update:sourceMode', 'personal')"
          >
            个人
          </button>
        </div>
      </div>
    </div>

    <div class="panel-group search-group">
      <div class="search-wrapper">
        <!-- 搜索模式选择 -->
        <select 
          class="input-3d search-select"
          :value="searchField"
          @change="emit('update:searchField', $event.target.value)"
        >
          <option value="all">综合搜索</option>
          <option value="title">搜标题</option>
          <option value="uid">搜作者(UID)</option>
          <!-- 仅当当前是tag模式时显示此选项，用于回显 -->
          <option v-if="searchField === 'tag'" value="tag">搜标签</option>
        </select>

        <input
          class="input-3d search-input"
          :value="q"
          @input="emit('update:q', $event.target.value)"
          @keydown.enter="emit('search')"
          :placeholder="searchPlaceholder"
          type="search"
        />
        <button class="btn-3d btn-primary" type="button" data-sfx="click" @click="emit('search')">
          GO
        </button>
        <button
          class="btn-3d btn-ghost"
          type="button"
          data-sfx="click"
          @click="emit('update:q',''); emit('clear'); emit('search');"
          :disabled="!String(q||'').trim()"
          style="opacity:.9;"
        >
          清空
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  content: { type: String, default: 'haruhi' },
  sourceMode: { type: String, default: 'all' },
  q: { type: String, default: '' },
  searchField: { type: String, default: 'all' }
})

const emit = defineEmits([
  'update:content',
  'update:sourceMode',
  'update:q',
  'update:searchField',
  'search',
  'clear'
])

const searchPlaceholder = computed(() => {
  const map = {
    all: '搜索标题/描述/作者/标签...',
    title: '请输入作品标题...',
    uid: '请输入作者UID...',
    tag: '搜索标签...'
  }
  return map[props.searchField] || '搜索作品...'
})
</script>

<style scoped>
/* =========================================
   通用样式 (电脑端优先)
   ========================================= */
.filter-panel-3d {
  padding: 16px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 18px;
  margin-top: 20px; 
}

.panel-group { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.control-box { display: flex; align-items: center; gap: 10px; }
.c-label { font-weight: 950; opacity: .78; font-size: 17px; letter-spacing: .3px; }

/* 轨道样式 */
.toggle-track {
  position: relative; 
  display: grid;
  background: rgba(255,255,255,.5);
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgb(95, 215, 226);
  isolation: isolate; 
  overflow: visible; 
}

/* 装饰图片 (电脑端位置) */
.mascot-img {
  position: absolute;
  bottom: 95%; 
  right: 0px; 
  height: 120px; 
  pointer-events: none; 
  z-index: 10; 
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
  transform: rotate(0deg);
  max-width: none; 
  width: auto;
}

/* 电脑端固定宽度 */
.content-track {
  grid-template-columns: 1fr 1fr;
  width: 140px; 
}
.source-track {
  grid-template-columns: 1fr 1fr 1fr;
  width: 200px;
}

/* 滑块样式 */
.slider-bg {
  position: absolute;
  top: 4px;
  bottom: 4px;
  background: rgba(192, 120, 241, 0.991);
  border-radius: 999px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1;
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
}

/* 滑块位置计算 */
.content-track .slider-bg { width: calc(50% - 4px); left: 4px; }
.content-track .slider-bg.pos-0 { transform: translateX(0%); }
.content-track .slider-bg.pos-1 { transform: translateX(100%); }

.source-track .slider-bg { width: calc(33.333% - 5px); left: 4px; }
.source-track .slider-bg.pos-0 { transform: translateX(0%); }
.source-track .slider-bg.pos-1 { transform: translateX(100%); }
.source-track .slider-bg.pos-2 { transform: translateX(200%); }

/* 按钮样式 */
.toggle-item {
  position: relative;
  z-index: 2;
  border: none;
  background: transparent;
  padding: 6px 0;
  font-weight: 900; 
  font-size: 15px; 
  color: rgba(0,0,0,.6);
  border-radius: 999px;
  cursor: pointer;
  transition: color 0.2s ease;
  text-align: center;
}
.toggle-item:hover { color: rgba(0,0,0,.9); }
.toggle-item.active {
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

/* 搜索区域 */
.search-wrapper { display: flex; gap: 10px; width: 100%; align-items:center; flex-wrap: wrap; }

.input-3d{
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,.12);
  background: rgba(255,255,255,.9);
  font-weight: 850;
  outline: none;
  box-shadow: 0 2px 6px rgba(0,0,0,.03);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input-3d:focus{
  border-color: rgba(20,184,166,.55);
  box-shadow: 0 0 0 4px rgba(20,184,166,.14);
}

.search-select {
  /* 下拉菜单样式 */
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  padding-right: 30px;
  cursor: pointer;
  width: 100px;
  flex-shrink: 0;
}

.search-input {
  min-width: 200px;
  flex: 1;
}

.btn-3d{
  border: 1px solid rgba(0,0,0,.12);
  border-radius: 14px;
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 950;
  background: rgba(255,255,255,.85);
  transition: transform .12s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,.03);
}
.btn-3d:active{ transform: scale(1.06); }
.btn-primary{
  background: linear-gradient(180deg, rgba(20,184,166,.95), rgba(16,120,110,.95));
  color: white;
  border-color: rgba(16,120,110,.35);
}
.btn-ghost{
  background: rgba(255,255,255,.75);
}

/* =========================================
   手机端自适应优化 (宽度 <= 768px)
   ========================================= */
@media (max-width: 768px) {
  .filter-panel-3d { 
    align-items: stretch; 
    padding: 0 8px; /* 减小内边距，释放屏幕空间 */
    margin-top: 130px; 
  }
  
  .panel-group {
    flex-direction: row; 
    align-items: center;
    width: 100%;
    gap: 6px; /* 紧凑间距 */
    flex-wrap: nowrap; 
  }

  /* 比例分配：内容 40% vs 来源 60% */
  .content-box { flex: 2; min-width: 0; }
  .source-box { flex: 3; min-width: 0; }

  .control-box {
    flex-direction: row;
    align-items: center; 
    gap: 4px; 
  }

  .c-label {
    font-size: 12px; /* 字体适度调小 */
    opacity: 0.8;
    margin: 0;
    white-space: nowrap; 
  }

  /* 轨道填满剩余空间 */
  .toggle-track {
    width: 100%; 
    margin: 0;
    padding: 2px;
  }
  
  /* 解除固定宽度限制 */
  .content-track, .source-track { width: 100%; }

  .toggle-item {
    font-size: 13px; 
    padding: 5px 0;
    white-space: nowrap; 
  }

  /* 滑块微调 */
  .slider-bg { top: 2px; bottom: 2px; }
  .content-track .slider-bg { width: calc(50% - 2px); left: 2px; }
  .source-track .slider-bg { width: calc(33.333% - 2.66px); left: 2px; }

  /* 装饰图片 */
  .mascot-img {
    height: 100px; 
    bottom: 90%; 
    right: 0px; 
  }

  /* 搜索栏 */
  .search-wrapper { 
    width: 100%; 
    flex-wrap: nowrap; 
    margin-top: 8px;
  }
  
  .search-select {
    width: 85px; /* 手机端稍微窄一点 */
    padding-left: 8px;
    font-size: 13px;
  }

  .btn-primary { display: none; }
  
  .btn-ghost {
    flex-shrink: 0;
    white-space: nowrap;
    padding: 10px 10px; /* 紧凑按钮 */
  }
  
  .search-input {
    min-width: 0; 
  }
}
</style>