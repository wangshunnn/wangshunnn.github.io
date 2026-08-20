<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    prefix?: string
    items: string[]
    typeSpeed?: number
    deleteSpeed?: number
    holdTime?: number
    cursor?: string
  }>(),
  {
    prefix: '',
    typeSpeed: 110,
    deleteSpeed: 55,
    holdTime: 1600,
    cursor: ' _'
  }
)

const typed = ref(props.items[0] ?? '')

let timer: ReturnType<typeof setTimeout> | undefined
let stopped = false

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    timer = setTimeout(resolve, ms)
  })
}

async function run() {
  // 首屏先完整停留一次再开始循环
  if (stopped) return
  await sleep(props.holdTime)

  let index = 1
  while (!stopped) {
    const word = props.items[index % props.items.length] ?? ''
    // 逐字删除
    while (typed.value.length > 0) {
      typed.value = typed.value.slice(0, -1)
      await sleep(props.deleteSpeed)
      if (stopped) return
    }
    // 逐字输入
    for (const char of word) {
      typed.value += char
      await sleep(props.typeSpeed)
      if (stopped) return
    }
    await sleep(props.holdTime)
    if (stopped) return
    index++
  }
}

onMounted(() => {
  // 减少动态效果偏好下，直接展示静态完整内容
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    typed.value = props.items.join('、')
    return
  }
  run()
})

onBeforeUnmount(() => {
  stopped = true
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <span
    class="typewriter"
    :aria-label="`${prefix}${items.join('、')}`"
  >
    {{ prefix }}<span>{{ typed }}</span><span class="cursor" aria-hidden="true">{{ cursor }}</span>
  </span>
</template>

<style scoped>
.cursor {
  opacity: 1;
  animation: typewriter-blink 1s step-end infinite;
}

@keyframes typewriter-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .cursor {
    animation: none;
  }
}
</style>
