import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import CustomLayout from './components/CustomLayout.vue'
import BlogHome from './components/BlogHome.vue'
import IconMeituan from './components/icons/IconMeituan.vue'
// import IconDidi from './components/icons/IconDidi.vue'

import './styles/rainbow.css'
import './styles/overrides.css'
import 'uno.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(CustomLayout)
  },
  enhanceApp({ app }) {
    app.component('BlogHome', BlogHome)
    app.component('IconMeituan', IconMeituan)
    // app.component('IconDidi', IconDidi)
  }
} satisfies Theme
