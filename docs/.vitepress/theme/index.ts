import { h } from 'vue'
import { type Theme, inBrowser } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import busuanzi from 'busuanzi.pure.js'
import CustomLayout from './components/CustomLayout.vue'
import BlogHome from './components/BlogHome.vue'
import IconMeituan from './components/icons/IconMeituan.vue'

import './styles/rainbow.css'
import './styles/overrides.css'
import 'uno.css'

export default {
  ...DefaultTheme,
  Layout: () => {
    return h(CustomLayout)
  },
  enhanceApp({ app, router }) {
    app.component('BlogHome', BlogHome)
    app.component('IconMeituan', IconMeituan)
    if (inBrowser) {
      router.onAfterRouteChanged = () => {
        busuanzi.fetch()
      }
    }
  }
} satisfies Theme
