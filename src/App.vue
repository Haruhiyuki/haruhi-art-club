<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import TopBar from './components/TopBar.vue'
import { playUiClick } from './utils/uiSound.js'

let _handler = null

onMounted(() => {
  // ✅ 事件代理：任何带 data-sfx="click" 的按钮/元素点击都会播放点击音效
  _handler = (e) => {
    const el = e.target?.closest?.('[data-sfx="click"]')
    if(!el) return
    if(el.getAttribute('aria-disabled') === 'true') return
    if(el.disabled) return
    playUiClick()
  }
  window.addEventListener('click', _handler, true)
})

onBeforeUnmount(() => {
  if(_handler) window.removeEventListener('click', _handler, true)
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <TopBar />
    </header>

    <main class="main">
      <router-view />
    </main>
  </div>
</template>
