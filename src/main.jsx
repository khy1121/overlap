import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ToastProvider } from './hooks/useToast'
import './lib/install' // 설치 이벤트(beforeinstallprompt)를 화면이 뜨기 전부터 받아 두기

// 앱이 정상으로 떴으면 '한 번 새로고침' 표시를 지워요 (index.html의 복구 스크립트 참고)
try { sessionStorage.removeItem('overlap-reloaded') } catch { /* 저장소 막힘 */ }
// 화면 도중 나중에 불러오는 파일이 새 배포로 사라졌을 때도 한 번 새로고침
window.addEventListener('vite:preloadError', (e) => {
  try {
    if (sessionStorage.getItem('overlap-reloaded')) return
    sessionStorage.setItem('overlap-reloaded', '1')
  } catch { return }
  e.preventDefault()
  window.location.reload()
})
import './styles/index.scss'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
)

// 앱 설치(PWA)용 서비스 워커. 개발 서버에서는 화면 갱신(HMR)을 방해하지 않게 끔.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}
