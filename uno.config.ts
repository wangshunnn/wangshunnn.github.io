// refer: https://github.com/antfu/antfu.me/blob/main/unocss.config.ts

import {
  defineConfig,
  presetUno,
  presetIcons,
  presetAttributify,
  presetWebFonts,
  transformerDirectives
} from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify({
      /* preset options */
    }),
    presetIcons({
      extraProperties: {
        display: 'inline-block',
        height: '1.2em',
        width: '1.2em',
        'vertical-align': 'text-bottom'
      }
    }),
    presetWebFonts({
      fonts: {
        sans: 'Inter:400,600,800',
        mono: 'DM Mono:400,600'
      }
    })
  ],
  shortcuts: [
    {
      'bg-base': 'bg-white dark:bg-black',
      'border-base': 'border-[#8884]'
    },
    [
      /^btn-(\w+)$/,
      ([_, color]) =>
        `op50 px2.5 py1 transition-all duration-200 ease-out no-underline! hover:(op100 text-${color} bg-${color}/10) border border-base! rounded`
    ]
  ],
  rules: [
    [
      /^slide-enter-(\d+)$/,
      ([_, n]) => ({
        '--enter-stage': n
      })
    ]
  ],
  transformers: [transformerDirectives()],
  safelist: ['i-ri-menu-2-fill']
})
