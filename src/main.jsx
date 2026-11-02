import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ToastProvider } from './hooks/useToast'
import './lib/install' // 설치 이벤트(beforeinstallprompt)를 화면이 뜨기 전부터 받아 두기
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
