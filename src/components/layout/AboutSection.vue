<script setup lang="ts">
import { version, author, homepage, bugs } from '../../../package.json'
import { AppLogo } from '@/components/ui'
</script>

<template>
  <section class="border-line border-t pt-5">
    <h3 class="text-muted mb-3 text-xs font-medium">关于</h3>
    <div class="flex items-center justify-between">
      <span class="flex items-center gap-2.5 font-medium"
        ><AppLogo />MiraiNote</span
      >
      <span class="text-muted text-xs">{{ version }}</span>
    </div>
    <p class="text-muted mt-3 text-xs leading-6">
      Markdown 编辑、PDF 与 Word 阅读、分屏工作区和 AI 文档助手。
      编辑内容保存到此设备的工作区草稿；源文件写回仍待接入。
    </p>
    <div class="text-secondary mt-3 flex items-center gap-4 text-xs">
      <span>作者：{{ author }}</span>
      <a
        :href="homepage"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-accent"
        >项目主页</a
      >
      <a
        :href="bugs.url"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-accent"
        >问题反馈</a
      >
    </div>
  </section>
</template>
