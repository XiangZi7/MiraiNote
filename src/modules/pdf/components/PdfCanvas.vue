<script setup lang="ts">
import {
  computed,
  reactive,
  toRefs,
  useTemplateRef,
  watch,
  onBeforeUnmount,
  shallowRef,
} from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import { TextLayer, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist'
import '../styles/text-layer.css'
import type { PdfPageSize } from '../types'
const props = withDefaults(
  defineProps<{
    pdf: PDFDocumentProxy
    page: number
    scale: number
    rotation?: number
    thumbnail?: boolean
    size?: PdfPageSize
  }>(),
  { rotation: 0, thumbnail: false }
)
const root = useTemplateRef('root'),
  canvas = useTemplateRef('canvas'),
  text = useTemplateRef('text')
const visible = shallowRef(false)
// 响应式状态
const state = reactive({
  // PDF 页面实际宽度
  width: 595 * props.scale,
  // PDF 页面实际高度
  height: 842 * props.scale,
  // 渲染失败提示
  error: '',
  // PDF 用户单位影响文本层的定位和字号
  unit: 1,
})
const { error } = toRefs(state)
const width = computed(
  () =>
    ((props.rotation % 180 ? props.size?.height : props.size?.width) ??
      state.width / props.scale) * props.scale
)
const height = computed(
  () =>
    ((props.rotation % 180 ? props.size?.width : props.size?.height) ??
      state.height / props.scale) * props.scale
)
const label = computed(() => `PDF 第 ${props.page} 页`)
useIntersectionObserver(
  root,
  ([entry]) => {
    visible.value = entry?.isIntersecting ?? false
  },
  { rootMargin: '300px' }
)
let renderTask: RenderTask | undefined
let textLayer: TextLayer | undefined
let version = 0
watch(
  [
    () => props.pdf,
    () => props.page,
    () => props.scale,
    () => props.rotation,
    visible,
    canvas,
  ],
  async () => {
    const run = ++version
    const previous = renderTask
    previous?.cancel()
    textLayer?.cancel()
    if (previous) await previous.promise.catch(() => undefined)
    if (run !== version || !canvas.value) return
    if (!visible.value) {
      canvas.value.width = 1
      canvas.value.height = 1
      text.value?.replaceChildren()
      return
    }
    const target = canvas.value
    state.error = ''
    try {
      const page = await props.pdf.getPage(props.page)
      if (run !== version) return
      const viewport = page.getViewport({
        scale: props.scale,
        rotation: (page.rotate + props.rotation) % 360,
      })
      state.unit = page.userUnit
      state.width = viewport.width
      state.height = viewport.height
      const density = Math.min(
        window.devicePixelRatio || 1,
        Math.sqrt(16_000_000 / (viewport.width * viewport.height))
      )
      target.width = Math.floor(viewport.width * density)
      target.height = Math.floor(viewport.height * density)
      const context = target.getContext('2d')
      if (!context) throw new Error('无法创建 PDF 画布')
      renderTask = page.render({
        canvas: target,
        canvasContext: context,
        viewport,
        transform: density === 1 ? undefined : [density, 0, 0, density, 0, 0],
      })
      await renderTask.promise
      if (run !== version || props.thumbnail || !text.value) return
      text.value.replaceChildren()
      textLayer = new TextLayer({
        textContentSource: await page.getTextContent(),
        container: text.value,
        viewport,
      })
      await textLayer.render()
    } catch (reason) {
      if (
        run === version &&
        !(
          reason instanceof Error &&
          reason.name === 'RenderingCancelledException'
        )
      )
        state.error = '此页渲染失败'
    }
  },
  { immediate: true }
)
onBeforeUnmount(() => {
  version++
  renderTask?.cancel()
  textLayer?.cancel()
})
</script>

<template>
  <div
    ref="root"
    class="pdf-canvas relative shrink-0 bg-white"
    :aria-label="label"
    :style="{
      width: `${width}px`,
      height: `${height}px`,
      '--scale-factor': scale,
      '--total-scale-factor': scale * state.unit,
    }"
  >
    <canvas
      ref="canvas"
      class="block size-full"
    />
    <div
      v-if="!thumbnail"
      ref="text"
      class="textLayer"
    />
    <div
      v-if="error"
      class="text-danger absolute inset-0 grid place-items-center bg-white p-3 text-xs"
    >
      {{ error }}
    </div>
  </div>
</template>
