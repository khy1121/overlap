import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // .env.local 등 환경 변수 파일은 저장소 루트에 둬요 (웹·앱이 같이 쓰는 값)
  envDir: '../..',
  css: {
    preprocessorOptions: {
      // Tailwind 레이어 순서를 지키려고 partial은 @import로 불러온다
      scss: { api: 'modern-compiler', silenceDeprecations: ['import'] },
    },
  },
})
