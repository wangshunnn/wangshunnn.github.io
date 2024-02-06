import { defineConfig } from 'vitepress'
import UnoCSS from 'unocss/vite'
import zhihuSVG from './theme/components/icons/zhihu.svg'

const ogUrl = 'https://wangshunnn.github.io/'
const ogImage = `${ogUrl}logo-origin.jpg`
const title = 'Soon Wang'
const description = 'Welcome to my personal website'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title,
  description,

  head: [
    [
      'link',
      { rel: 'icon', href: '/logo.png', type: 'image/png', sizes: '16x16' }
    ],
    ['meta', { name: 'author', content: title }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: title }],
    ['meta', { name: 'og:description', content: description }],
    ['meta', { property: 'og:image', content: ogImage }],
    ['meta', { name: 'twitter:title', content: title }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: ogImage }],
    ['meta', { name: 'twitter:site', content: '@wangshunnn' }],
    ['meta', { name: 'twitter:url', content: ogUrl }]
  ],

  lastUpdated: false,
  cleanUrls: true,

  vite: {
    plugins: [UnoCSS()]
  },

  // https://vitepress.dev/reference/default-theme-config
  themeConfig: {
    siteTitle: '',

    logo: { src: '/logo.png', width: 24, height: 24 },

    nav: [
      { text: 'Blog', activeMatch: '^/($|blog/)', link: '/index' },
      // { text: '项目', link: '/project/index' },
      { text: 'About', activeMatch: '^/about/', link: '/about/index' }
    ],

    search: {
      provider: 'local'
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'short'
      }
    },

    outline: 'deep',

    sidebar: {
      more: [
        {
          text: '算法',
          items: []
        },
        {
          text: '阅读',
          items: []
        },
        {
          text: '旅游',
          items: []
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/wangshunnn' },
      { icon: 'x', link: 'https://twitter.com/wangshunnn' },
      {
        icon: { svg: zhihuSVG },
        link: 'https://www.zhihu.com/people/wangshunnn'
      }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: `Copyright © 2023-${new Date().getFullYear()} Soon Wang`
    }
  }
})
