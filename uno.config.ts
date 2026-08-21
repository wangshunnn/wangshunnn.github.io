// refer: https://github.com/antfu/antfu.me/blob/main/unocss.config.ts

import { defineConfig, presetUno, presetIcons, presetAttributify } from 'unocss'

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
    })
  ],
  safelist: ['i-ri-menu-2-fill']
})
