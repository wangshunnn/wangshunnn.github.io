<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, provide, watch } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

const { isDark, page } = useData()

const articleEnterClass = 'article-enter-content'

async function updateArticleTransition() {
  if (typeof document === 'undefined')
    return

  await nextTick()

  const content = document.querySelector<HTMLElement>('.vp-doc')
  if (!content)
    return

  content.classList.remove(articleEnterClass)
  if (!page.value.relativePath.startsWith('blog/'))
    return

  // Force a reflow so the animation restarts after client-side navigation.
  void content.offsetWidth
  content.classList.add(articleEnterClass)
}

watch(() => page.value.relativePath, updateArticleTransition)

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

  const root = document.documentElement
  const nextIsDark = !isDark.value
  const radius = Math.hypot(
    Math.max(x, innerWidth - x),
    Math.max(y, innerHeight - y),
  )

  root.dataset.themeTransition = nextIsDark ? 'to-dark' : 'to-light'
  root.style.setProperty('--theme-transition-x', `${x}px`)
  root.style.setProperty('--theme-transition-y', `${y}px`)
  root.style.setProperty('--theme-transition-radius', `${radius}px`)

  const transition = (document as Document).startViewTransition(async () => {
    isDark.value = nextIsDark
    await nextTick()
  })
  let animation: Animation | undefined

  try {
    await transition.ready

    animation = root.animate(
      {
        clipPath: nextIsDark
          ? [
            `circle(${radius}px at ${x}px ${y}px)`,
            `circle(0px at ${x}px ${y}px)`,
          ]
          : [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
      },
      {
        duration: 300,
        easing: 'ease-in',
        fill: 'forwards',
        pseudoElement: `::view-transition-${nextIsDark ? 'old' : 'new'}(root)`,
      },
    )

    await animation.finished
  } finally {
    await transition.finished.catch(() => {})
    animation?.cancel()
    delete root.dataset.themeTransition
    root.style.removeProperty('--theme-transition-x')
    root.style.removeProperty('--theme-transition-y')
    root.style.removeProperty('--theme-transition-radius')
  }
})

let nav: Element | null
let localNav: Element | null
let prevScrollY = 0
const handleScroll = function () {
  const currentScrollY = window.scrollY
  if (currentScrollY > prevScrollY && currentScrollY > 80) {
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
  updateArticleTransition()

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
