import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import BlogHome from './components/BlogHome.vue'
import IconMeituan from './components/icons/IconMeituan.vue'
import IconDidi from './components/icons/IconDidi.vue'

import './rainbow.css'
import 'uno.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('BlogHome', BlogHome)
    app.component('IconMeituan', IconMeituan)
    app.component('IconDidi', IconDidi)
  }
} satisfies Theme

// TODO [add dark/light mode switch transition](https://github.com/nuxt/devtools/pull/224)
