import { defineConfig } from "vitepress"

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Soon Wang",
    description: "My personal website",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config

        logo: "/logo.jpg",

        nav: [
            { text: "Blog", link: "/blog/index" },
            { text: "Else", link: "/else/index" },
            { text: "About", link: "/about/index" },
        ],

        search: {
            provider: "local",
            /* provider: 'algolia',
          options: {
            appId: 'ZTF29HGJ69',
            apiKey: '9c3ced6fed60d2670bb36ab7e8bed8bc',
            indexName: 'vitest',
            // searchParameters: {
            //   facetFilters: ['tags:en'],
            // },
          }, */
        },

        sidebar: {
            blog: [
                {
                    text: "2023",
                    items: [
                        {
                            text: "Runtime API Examples",
                            link: "/blog/api-examples",
                        },
                    ],
                },
                {
                    text: "2022",
                    items: [
                        {
                            text: "Markdown Examples",
                            link: "/blog/markdown-examples",
                        },
                    ],
                },
            ],
            else: [
                {
                    text: "",
                    items: [{ text: "Algorithm / 算法", link: "/else/index" }],
                },
            ],
            about: [
                {
                    text: "About me / 关于我",
                    items: [
                        // { text: "About me / 关于我", link: "/about/index" },
                    ],
                },
            ],
        },

        socialLinks: [
            { icon: "github", link: "https://github.com/wangshunnn" },
            { icon: "twitter", link: "https://twitter.com/wangshunnn" },
        ],
    },
})
