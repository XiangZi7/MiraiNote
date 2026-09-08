<script setup lang="ts">
import { computed } from 'vue'
import { examplePages } from '../services/example-pages'
const props = defineProps<{ page: number }>()
const content = computed(() => examplePages[props.page - 1] ?? examplePages[0]!)
</script>

<template>
  <article class="pdf-page">
    <div class="pdf-brand">MIRAIHUB <span>DESIGN GUIDELINES</span></div>
    <div class="pdf-eyebrow">{{ content.subtitle }}</div>
    <h1>{{ content.title }}</h1>
    <div class="pdf-rule" />
    <p>{{ content.body }}</p>
    <div v-if="page === 1" class="design-figure" aria-label="文档布局示意"><div class="figure-sidebar"><i /><i /><i /><i /></div><div class="figure-content"><b /><i /><i /><i /><div><span /><span /></div></div></div>
    <div v-else-if="page === 3" class="swatches"><div v-for="color in ['#edf0f4', '#dfe4eb', '#818b99', '#566170', '#282e36']" :key="color" :style="{ background: color }" /></div>
    <h2>{{ content.section }}</h2>
    <div class="pdf-points"><div v-for="(point, index) in content.points" :key="point"><span>0{{ index + 1 }}</span>{{ point }}</div></div>
    <div class="pdf-footer"><span>MiraiHub Docs · 设计规范</span><span>{{ String(page).padStart(2, '0') }}</span></div>
  </article>
</template>

<style scoped>
.pdf-page { width: 595px; height: 842px; padding: 55px 52px; background: white; color: #303845; position: relative; font-family: var(--font-ui); overflow: hidden; }
.pdf-brand { font-size: 13px; font-weight: 600; letter-spacing: 2px; }.pdf-brand span { font-size: 9px; font-weight: 400; color: #99a1ad; letter-spacing: 1.2px; margin-left: 16px; }
.pdf-eyebrow { color: #84909f; margin-top: 70px; font-size: 12px; letter-spacing: 1px; }
h1 { font-size: 31px; line-height: 1.6; font-weight: 600; letter-spacing: -1px; margin: 14px 0 28px; max-width: 390px; }
.pdf-rule { width: 38px; height: 2px; background: #607c9c; margin-bottom: 24px; }
p { font-size: 13px; line-height: 2; color: #687483; margin: 0 0 30px; }
h2 { font-size: 15px; font-weight: 600; margin: 28px 0 18px; }
.pdf-points { display: grid; gap: 13px; font-size: 12px; color: #667382; }.pdf-points span { font-size: 10px; color: #a4aebb; margin-right: 18px; }
.pdf-footer { position: absolute; left: 52px; right: 52px; bottom: 35px; display: flex; justify-content: space-between; font-size: 10px; color: #99a3b0; border-top: 1px solid #e8ecf1; padding-top: 15px; }
.design-figure { height: 122px; background: #f7f8fa; border: 1px solid #e6eaf0; border-radius: 5px; display: flex; padding: 10px; margin: 25px 0; }.figure-sidebar { width: 80px; background: #e8edf3; border-radius: 3px; padding: 15px 10px; }.figure-sidebar i { display: block; height: 4px; background: #c9d2de; width: 35px; margin-bottom: 12px; border-radius: 2px; }.figure-content { flex: 1; padding: 8px 20px; }.figure-content b { display: block; width: 85px; height: 6px; background: #97a9bf; margin-bottom: 10px; border-radius: 2px; }.figure-content i { display: block; width: 100%; height: 3px; background: #dfe5ed; margin-bottom: 7px; }.figure-content > div { display: flex; gap: 10px; margin-top: 12px; }.figure-content span { display: block; height: 30px; flex: 1; background: #e8edf3; border-radius: 3px; }
.swatches { display: flex; margin: 35px 0; height: 90px; border-radius: 4px; overflow: hidden; }.swatches > div { flex: 1; }
</style>
