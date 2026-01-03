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

/* 装饰图片样式 (默认电脑端) */
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
    margin-top: 130px; 
  }
  
  /* 修改重点：
     1. flex-direction: row -> 让两组筛选栏水平排列
     2. flex-wrap: nowrap -> 强制不换行
     3. overflow-x: auto -> 如果屏幕实在太小，允许横向微滚动，防止布局崩坏
  */
  .panel-group {
    flex-direction: row; 
    align-items: center;
    gap: 12px; /* 两个筛选组之间的间距 */
    justify-content: flex-start;
    width: 100%;
    flex-wrap: nowrap; 
    /* overflow-x: auto;  按需开启，如果屏幕极窄 */
  }

  /* 修改重点：
     1. flex-direction: row -> 标签在左，轨道在右
     2. gap -> 标签和轨道之间的距离
  */
  .control-box {
    flex-direction: row;
    align-items: center; 
    gap: 6px;
    flex-shrink: 0; /* 防止被挤压 */
  }

  /* 标签样式调整 */
  .c-label {
    font-size: 17px; /* 字体适中，不至于太难看清 */
    opacity: 0.8;
    margin-bottom: 0; /* 既然在左边，就不需要底部边距了 */
    white-space: nowrap; /* 防止换行 */
  }

  /* 轨道样式调整 */
  .toggle-track {
    width: auto; 
    margin: 0;
    padding: 3px; /* 稍微紧凑 */
  }
  
  /* 给轨道设定一个相对合理的最小宽度，保证点击面积 */
  .content-track {
    width: 90px; 
  }
  
  .source-track {
    width: 140px;
  }

  /* 按钮字体和点击区域 */
  .toggle-item {
    font-size: 20px; 
    padding: 1px 0;
  }

  /* 滑块跟随调整 */
  .slider-bg {
    top: 3px;
    bottom: 3px;
  }
  .content-track .slider-bg { width: calc(50% - 3px); left: 3px; }
  .source-track .slider-bg { width: calc(33.333% - 3.5px); left: 3px; }

  /* 修改重点：装饰图片位置
     由于标签现在在左边，轨道上方是空的，图片可以完美放置
  */
  .mascot-img {
    height: 100px; 
    bottom: 90%; 
    right: -10px; 
  }

  /* 搜索栏保持一行 */
  .search-wrapper { 
    width: 100%; 
    flex-wrap: nowrap; 
    margin-top: 8px;
  }
  
  .btn-primary { display: none; }
  
  .btn-ghost {
    flex-shrink: 0;
    white-space: nowrap;
  }
  
  .input-3d {
    min-width: 0; 
  }
}
</style>