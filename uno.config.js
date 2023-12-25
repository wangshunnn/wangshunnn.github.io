import { defineConfig } from "unocss"
import presetUno from "@unocss/preset-uno"
import presetIcons from "@unocss/preset-icons"
import presetAttributify from "@unocss/preset-attributify"
import presetWebFonts from "@unocss/preset-web-fonts"

export default defineConfig({
    presets: [
        presetUno(),
        presetAttributify({
            /* preset options */
        }),
        presetIcons({
            /* options */
        }),
        // presetWebFonts({}),
    ],
    shortcuts: [
        {
            "bg-base": "bg-white dark:bg-black",
            "border-base": "border-[#8884]",
        },
        [
            /^btn-(\w+)$/,
            ([_, color]) =>
                `op50 px2.5 py1 transition-all duration-200 ease-out no-underline! hover:(op100 text-${color} bg-${color}/10) border border-base! rounded`,
        ],
    ],
    rules: [
        [
            /^slide-enter-(\d+)$/,
            ([_, n]) => ({
                "--enter-stage": n,
            }),
        ],
    ],
})
