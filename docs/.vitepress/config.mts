import { defineConfig } from "vitepress"

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Soon Wang",
    description: "My personal website",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        siteTitle: "",
        logo: "/avatar-circle.png",

        nav: [
            { text: "博客", link: "/blog/index" },
            { text: "其他", link: "/else/index" },
        ],

        search: {
            provider: "local",
        },

        sidebar: {
            blog: [
                {
                    text: "2024",
                    items: [
                        {
                            text: "Runtime API Examples",
                            link: "/blog/api-examples",
                        },
                    ],
                },
                {
                    text: "2023",
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
        },

        socialLinks: [
            { icon: "github", link: "https://github.com/wangshunnn" },
            { icon: "twitter", link: "https://twitter.com/wangshunnn" },
        ],
    },
})
