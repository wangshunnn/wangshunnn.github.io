import { defineConfig } from "vitepress"
import UnoCSS from "unocss/vite"

// https://vitepress.dev/reference/site-config
export default defineConfig({
    head: [["link", { rel: "icon", href: "/logo.png" }]],

    title: "Soon Wang",

    description: "My personal website",

    // lastUpdated: true,
    cleanUrls: true,

    vite: {
        plugins: [UnoCSS()],
    },

    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config

        siteTitle: "",

        logo: { src: "/logo.png", width: 24, height: 24 },

        nav: [
            { text: "博客", link: "/blog/index" },
            { text: "其他", link: "/else/index" },
        ],

        search: {
            provider: "local",
        },

        sidebar: {
            blog: [
            ],
            else: [
                {
                    text: "",
                    items: [{ text: "Algorithm / 算法", link: "/else/index" }],
                },
            ],
        },

        socialLinks: [
            { icon: "github", link: "https://github.com/wangshunnn" },
            { icon: "x", link: "https://twitter.com/wangshunnn" },
        ],

        footer: {
            message: "Released under the MIT License.",
            copyright: "Copyright © 2019-present Shun Wang",
        },
    },
})
