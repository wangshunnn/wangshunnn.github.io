export const i18n = {
  menu: '菜单',
  toc: '本页目录',
  returnToTop: '返回顶部',
  appearance: '外观',
  previous: '前一篇',
  next: '下一篇',
  pageNotFound: '页面未找到',
  deadLink: {
    before: '你打开了一个不存在的链接：',
    after: '。'
  },
  deadLinkReport: {
    before: '不介意的话请提交到',
    link: '这里',
    after: '，我们会跟进修复。'
  },
  footerLicense: {
    before: '',
    after: ''
  },
  ariaAnnouncer: {
    before: '',
    after: '已经加载完毕'
  },
  ariaDarkMode: '切换深色模式',
  ariaSkipToContent: '直接跳到内容',
  ariaToC: '当前页面的目录',
  ariaMainNav: '主导航',
  ariaMobileNav: '移动版导航',
  ariaSidebarNav: '侧边栏导航'
}

export const algoliaTranslations = {
  button: {
    buttonText: '搜索'
  },
  modal: {
    searchBox: {
      resetButtonTitle: '清除查询条件',
      resetButtonAriaLabel: '清除查询条件',
      cancelButtonText: '取消',
      cancelButtonAriaLabel: '取消'
    },
    startScreen: {
      recentSearchesTitle: '搜索历史',
      noRecentSearchesText: '没有搜索历史',
      saveRecentSearchButtonTitle: '保存到搜索历史',
      removeRecentSearchButtonTitle: '从搜索历史中移除',
      favoriteSearchesTitle: '收藏',
      removeFavoriteSearchButtonTitle: '从收藏中移除'
    },
    errorScreen: {
      titleText: '无法获取结果',
      helpText: '你可能需要检查你的网络连接'
    },
    footer: {
      selectText: '选择',
      navigateText: '切换',
      closeText: '关闭',
      searchByText: '搜索供应商'
    },
    noResultsScreen: {
      noResultsText: '无法找到相关结果',
      suggestedQueryText: '你可以尝试查询',
      reportMissingResultsText: '你认为这个查询应该有结果？',
      reportMissingResultsLinkText: '向我们反馈'
    }
  }
}

export const localSearchTranslations = {
  button: {
    buttonText: '搜索文档',
    buttonAriaLabel: '搜索文档'
  },
  modal: {
    displayDetails: '显示详细列表',
    resetButtonTitle: '重置搜索',
    backButtonTitle: '关闭搜索',
    noResultsText: '没有结果',
    footer: {
      selectText: '选择',
      selectKeyAriaLabel: '输入',
      navigateText: '导航',
      navigateUpKeyAriaLabel: '上箭头',
      navigateDownKeyAriaLabel: '下箭头',
      closeText: '关闭',
      closeKeyAriaLabel: 'esc'
    }
  }
}
