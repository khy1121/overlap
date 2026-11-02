import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      // Tailwind 레이어 순서를 지키려고 partial은 @import로 불러온다
      scss: { api: 'modern-compiler', silenceDeprecations: ['import'] },
    },
  },
})
