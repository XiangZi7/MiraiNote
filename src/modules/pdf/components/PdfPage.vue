<script setup lang="ts">
import { computed } from 'vue'
import { examplePages } from '../services/example-pages'
const props = defineProps<{ page: number }>()
const content = computed(() => examplePages[props.page - 1] ?? examplePages[0]!)
</script>

<template>
  <article
    class="relative h-[842px] w-[595px] overflow-hidden bg-white px-[52px] py-[55px] font-sans text-[#303845]"
  >
    <div class="text-[13px] font-semibold tracking-[2px]">
      MiraiNote
      <span class="ml-4 text-[9px] font-normal tracking-[1.2px] text-[#99a1ad]"
        >DESIGN GUIDELINES</span
      >
    </div>
    <div class="mt-[70px] text-xs tracking-[1px] text-[#84909f]">
      {{ content.subtitle }}
    </div>
    <h1
      class="mt-3.5 mb-7 max-w-[390px] text-[31px] leading-[1.6] font-semibold tracking-[-1px]"
    >
      {{ content.title }}
    </h1>
    <div class="mb-6 h-0.5 w-[38px] bg-[#607c9c]" />
    <p class="mb-[30px] text-[13px] leading-loose text-[#687483]">
      {{ content.body }}
    </p>
    <div
      v-if="page === 1"
      class="my-[25px] flex h-[122px] rounded-[5px] border border-[#e6eaf0] bg-[#f7f8fa] p-2.5"
      aria-label="文档布局示意"
    >
      <div class="w-20 rounded-[3px] bg-[#e8edf3] px-2.5 py-[15px]">
        <i
          v-for="n in 4"
          :key="n"
          class="mb-3 block h-1 w-[35px] rounded-sm bg-[#c9d2de]"
        />
      </div>
      <div class="flex-1 px-5 py-2">
        <b class="mb-2.5 block h-1.5 w-[85px] rounded-sm bg-[#97a9bf]" /><i
          v-for="n in 3"
          :key="n"
          class="mb-[7px] block h-[3px] w-full bg-[#dfe5ed]"
        />
        <div class="mt-3 flex gap-2.5">
          <span
            v-for="n in 2"
            :key="n"
            class="block h-[30px] flex-1 rounded-[3px] bg-[#e8edf3]"
          />
        </div>
      </div>
    </div>
    <div
      v-else-if="page === 3"
      class="my-[35px] flex h-[90px] overflow-hidden rounded"
    >
      <div
        v-for="color in ['#edf0f4', '#dfe4eb', '#818b99', '#566170', '#282e36']"
        :key="color"
        class="flex-1"
        :style="{ background: color }"
      />
    </div>
    <h2 class="mt-7 mb-[18px] text-[15px] font-semibold">
      {{ content.section }}
    </h2>
    <div class="grid gap-[13px] text-xs text-[#667382]">
      <div
        v-for="(point, index) in content.points"
        :key="point"
      >
        <span class="mr-[18px] text-[10px] text-[#a4aebb]"
          >0{{ index + 1 }}</span
        >{{ point }}
      </div>
    </div>
    <div
      class="absolute right-[52px] bottom-[35px] left-[52px] flex justify-between border-t border-[#e8ecf1] pt-[15px] text-[10px] text-[#99a3b0]"
    >
      <span>MiraiNote · 设计规范</span
      ><span>{{ String(page).padStart(2, '0') }}</span>
    </div>
  </article>
</template>
