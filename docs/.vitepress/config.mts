import { defineConfig } from "vitepress"

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Soon Wang",
    description: "My personal website",
    themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            { text: "Blog", link: "/blog/index" },
            { text: "Else", link: "/else/index" },
            { text: "About", link: "/about/index" },
        ],

        sidebar: [
            {
                text: "Blog",
                items: [
                    {
                        text: "Runtime API Examples",
                        link: "/blog/api-examples",
                    },
                    {
                        text: "Markdown Examples",
                        link: "/blog/markdown-examples",
                    },
                    {
                        text: "Runtime API Examples",
                        link: "/blog/api-examples",
                    },
                ],
            },
            {
                text: "Else",
                items: [{ text: "Else / 其他", link: "/else/index" }],
            },
            {
                text: "About",
                items: [{ text: "About me / 关于我", link: "/about/index" }],
            },
        ],

        socialLinks: [
            { icon: "github", link: "https://github.com/wangshunnn" },
        ],
    },
})
