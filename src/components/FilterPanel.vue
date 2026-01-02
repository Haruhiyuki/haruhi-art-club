<template>
  <div class="filter-panel-3d">
    <!-- 左侧：内容与来源切换 -->
    <div class="panel-group">
      <div class="control-box">
        <div class="c-label">内容</div>
        <div class="toggle-track">
          <button
            class="toggle-pill"
            :class="{ on: content === 'haruhi' }"
            type="button"
            data-sfx="click"
            @click="emit('update:content', 'haruhi')"
          >
            凉宫
          </button>
          <button
            class="toggle-pill"
            :class="{ on: content === 'other' }"
            type="button"
            data-sfx="click"
            @click="emit('update:content', 'other')"
          >
            其他
          </button>
        </div>
      </div>

      <div class="control-box">
        <div class="c-label">来源</div>
        <div class="toggle-track">
          <button
            class="toggle-pill"
            :class="{ on: sourceMode === 'balanced' }"
            type="button"
            data-sfx="click"
            @click="emit('update:sourceMode', 'balanced')"
          >
            混合
          </button>
          <button
            class="toggle-pill"
            :class="{ on: sourceMode === 'network' }"
            type="button"
            data-sfx="click"
            @click="emit('update:sourceMode', 'network')"
          >
            网络
          </button>
          <button
            class="toggle-pill"
            :class="{ on: sourceMode === 'personal' }"
            type="button"
            data-sfx="click"
            @click="emit('update:sourceMode', 'personal')"
          >
            个人
          </button>
        </div>
      </div>
    </div>

    <!-- 右侧：搜索 -->
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
.filter-panel-3d {
  background: var(--c-surface, rgba(255,255,255,.78));
  border: var(--border, 1px solid rgba(0,0,0,.10));
  box-shadow: var(--shadow, 0 18px 44px rgba(0,0,0,.08));
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 18px;
}

.panel-group { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.control-box { display: flex; align-items: center; gap: 10px; }
.c-label { font-weight: 950; opacity: .78; font-size: 12px; letter-spacing: .3px; }

.toggle-track {
  display: flex;
  background: rgba(0,0,0,.06);
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgba(0,0,0,0.08);
}

.toggle-pill {
  border: none;
  background: transparent;
  padding: 7px 14px;
  font-weight: 900;
  opacity: .78;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
}
.toggle-pill:hover { opacity: .95; }
.toggle-pill:active { transform: scale(1.08); }

/* 选中状态：变大并改变颜色 */
.toggle-pill.on {
  background: rgba(0,0,0,.88);
  color: #fff;
  opacity: 1;
  transform: scale(1.06);
  box-shadow: 0 8px 18px rgba(0,0,0,.12);
}

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

@media (max-width: 768px) {
  .filter-panel-3d { align-items: stretch; }
  .search-wrapper { width: 100%; }
}
</style>
