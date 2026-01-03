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
              'pos-0': sourceMode === 'balanced', 
              'pos-1': sourceMode === 'network',
              'pos-2': sourceMode === 'personal'
            }"
          ></div>

          <button
            class="toggle-item"
            :class="{ active: sourceMode === 'balanced' }"
            type="button"
            data-sfx="click"
            @click="emit('update:sourceMode', 'balanced')"
          >
            混合
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
        <input
          class="input-3d"
          :value="q"
          @input="emit('update:q', $event.target.value)"
          @keydown.enter="emit('search')"
          placeholder="搜索作品..."
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
const props = defineProps({
  content: { type: String, default: 'haruhi' },
  sourceMode: { type: String, default: 'balanced' },
  q: { type: String, default: '' }
})

const emit = defineEmits([
  'update:content',
  'update:sourceMode',
  'update:q',
  'search',
  'clear'
])
</script>

<style scoped>
/* 主要容器布局 */
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

/* 装饰图片样式 */
.mascot-img {
  position: absolute;
  bottom: 100%; 
  right: 8px; 
  height: 120px; 
  pointer-events: none; 
  z-index: 10; 
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
  transform: rotate(0deg);
}

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

.content-track .slider-bg {
  width: calc(50% - 4px);
  left: 4px;
}
.content-track .slider-bg.pos-0 { transform: translateX(0%); }
.content-track .slider-bg.pos-1 { transform: translateX(100%); }

.source-track .slider-bg {
  width: calc(33.333% - 5px);
  left: 4px;
}
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
  min-width: 220px;
  flex: 1;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,.12);
  background: rgba(255,255,255,.9);
  font-weight: 850;
  outline: none;
  box-shadow: 0 2px 6px rgba(0,0,0,.03);
}
.input-3d:focus{
  border-color: rgba(20,184,166,.55);
  box-shadow: 0 0 0 4px rgba(20,184,166,.14);
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

/* --- 手机端适配 (768px 以下) --- */
@media (max-width: 768px) {
  .filter-panel-3d { 
    align-items: stretch; 
    padding: 0 16px;
    /* 增加顶部距离，为了让 120px 的图片能完整显示而不被顶部导航遮挡 */
    margin-top: 130px; 
  }
  
  .panel-group {
    /* 垂直排列，并反转顺序：让“来源”栏(source-box) 排在 “内容”栏(content-box) 上方 */
    flex-direction: column-reverse; 
    align-items: stretch; /* 拉伸占满宽度 */
    gap: 16px;
  }

  .control-box {
    justify-content: space-between; /* 标签和轨道分开 */
  }

  .toggle-track {
    /* 在手机上让轨道稍微宽一点，方便点击 */
    flex: 1;
    margin-left: 10px;
  }
  /* 重置具体宽度限制，让 flex 生效 */
  .content-track, .source-track { width: auto; }

  /* 针对搜索栏的调整 */
  .search-wrapper { width: 100%; }
  
  /* 隐藏 GO 按钮 */
  .btn-primary { display: none; }
  
  /* 让清空按钮填满剩下空间 (可选，或者只是正常显示) */
  .btn-ghost {
    flex-grow: 0;
    min-width: 60px;
  }
}
</style>