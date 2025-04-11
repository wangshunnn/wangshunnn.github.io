import { defineConfig } from 'vitepress'
import UnoCSS from 'unocss/vite'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { i18n, localSearchTranslations } from './const'
import juejinSVG from './theme/components/icons/juejin.svg'

const ogUrl = 'https://soonwang.me/'
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
    ['meta', { name: 'twitter:site', content: '@wangshunnn' }]
  ],

  // for prod
  transformHead({ pageData }) {
    const ogTitle = pageData.title || title
    const ogDescription = pageData.description || description
    const relativePath = pageData.relativePath || 'index'
    const pagePathName = relativePath.split('/').at(-1)?.replace(/\.md$/, '')
    const ogImage = `${ogUrl}og/${pagePathName}.png`

    return [
      ['meta', { name: 'og:title', content: ogTitle }],
      ['meta', { name: 'og:image', content: ogImage }],
      ['meta', { name: 'og:description', content: ogDescription }],
      ['meta', { name: 'twitter:title', content: ogTitle }],
      ['meta', { name: 'twitter:image', content: ogImage }]
    ]
  },

  // for dev
  transformPageData(pageData) {
    const ogTitle = pageData.title || title
    const ogDescription = pageData.description || description
    const relativePath = pageData.relativePath || 'index'
    const pagePathName = relativePath.split('/').at(-1)?.replace(/\.md$/, '')
    const ogImage = `${ogUrl}og/${pagePathName}.png`
    pageData.frontmatter.head ??= []
    pageData.frontmatter.head.push(
      [
        'meta',
        {
          name: 'og:title',
          content: ogTitle
        }
      ],
      [
        'meta',
        {
          name: 'og:description',
          content: ogDescription
        }
      ],
      [
        'meta',
        {
          name: 'og:image',
          content: ogImage
        }
      ]
    )
  },

  lastUpdated: false,
  cleanUrls: true,

  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
    // @ts-expect-error ignore
    codeTransformers: [transformerTwoslash()]
  },

  vite: {
    plugins: [UnoCSS()]
  },

  // https://vitepress.dev/reference/default-theme-config
  themeConfig: {
    siteTitle: '',

    logo: { src: '/logo.png', width: 24, height: 24 },

    nav: [
      { text: '博客', activeMatch: '^/($|blog/)', link: '/index' },
      { text: '关于', activeMatch: '^/about/', link: '/about/index' }
    ],

    search: {
      // provider: 'algolia',
      // options: {
      //   appId: 'K3MSC93R2T',
      //   apiKey: 'a28a755619f9dd70f9b9ba1879854748',
      //   indexName: 'wangshunnnio',
      //   placeholder: '搜索博客',
      //   translations: algoliaTranslations
      // }
      provider: 'local',
      options: {
        translations: localSearchTranslations
      }
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
        icon: { svg: juejinSVG },
        link: 'https://juejin.cn/user/2129123907471864/posts'
      }
      // { icon: 'bluesky', link: 'https://bsky.app/profile/soonwang.bsky.social' }
      // {
      //   icon: { svg: zhihuSVG },
      //   link: 'https://www.zhihu.com/people/wangshunnn'
      // }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: `Copyright © 2023-${new Date().getFullYear()} Soon Wang`
    },

    // i18n
    sidebarMenuLabel: i18n.menu,
    outlineTitle: i18n.toc,
    returnToTopLabel: i18n.returnToTop,
    darkModeSwitchLabel: i18n.appearance,
    docFooter: {
      prev: i18n.previous,
      next: i18n.next
    }
  }
})
