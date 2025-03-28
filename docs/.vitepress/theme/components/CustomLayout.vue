<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, provide } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

const { isDark } = useData()

function enableTransitions() {
  return 'startViewTransition' in document
    && window.matchMedia('(prefers-reduced-motion: no-preference)').matches
}

// 💡 from: [add dark/light mode switch transition](https://github.com/nuxt/devtools/pull/224)
provide('toggle-appearance', async ({ clientX: x, clientY: y }: MouseEvent) => {
  if (typeof window === 'undefined')
    return

  if (!enableTransitions()) {
    isDark.value = !isDark.value
    return
  }

  const clipPath = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y),
    )}px at ${x}px ${y}px)`,
  ]

  await (document as Document).startViewTransition(async () => {
    isDark.value = !isDark.value
    await nextTick()
  }).ready

  document.documentElement.animate(
    { clipPath: isDark.value ? clipPath.reverse() : clipPath },
    {
      duration: 300,
      easing: 'ease-in',
      pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)`,
    },
  )
})

// slideObeserver.run()
// onUnmounted(()=>{
//   slideObeserver.stop()
// })

let nav: Element | null
let localNav: Element | null
let prevScrollY = 0
const handleScroll = function () {
  let currentScrollY = window.scrollY
  if (currentScrollY > prevScrollY) {
    nav?.classList?.add('nav-hidden')
    localNav?.classList?.add('local-nav-hidden')
  } else {
    nav?.classList?.remove('nav-hidden')
    localNav?.classList?.remove('local-nav-hidden')

  }
  prevScrollY = currentScrollY
}

const shouldListen = typeof window !== 'undefined' && window.innerWidth >= 960

onMounted(() => {
  if (shouldListen) {
    nav = document.querySelector('.VPNav')
    localNav = document.querySelector('.VPLocalNav')
    window?.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  shouldListen && window?.removeEventListener('scroll', handleScroll)
})

</script>

<template>
  <DefaultTheme.Layout />
</template>
