// 새 버전 감지: 앱을 켜 둔 사이 새로 배포되면 '새 버전이 있어요' 안내를 띄워요.
// 배포할 때마다 앱 파일 이름(/assets/index-해시.js)이 바뀌어요. 서버의 최신 첫 화면이 가리키는 파일과
// 지금 열린 화면의 파일이 다르면 새 버전이 나온 거예요. (30분마다, 그리고 앱으로 돌아올 때마다 확인)
import { useSyncExternalStore } from 'react'

let ready = false
const subs = new Set()
const emit = () => subs.forEach((f) => f())
const ENTRY = /\/assets\/index-[\w-]+\.js/

export function useUpdateReady() {
  return useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb) }, () => ready, () => false)
}

const current = () => {
  const s = document.querySelector('script[type="module"][src*="/assets/index-"]')
  return s ? new URL(s.src).pathname : null
}

async function checkForUpdate() {
  if (ready || !navigator.onLine) return
  const mine = current()
  if (!mine) return
  try {
    const html = await (await fetch(`/?v=${Date.now()}`, { cache: 'no-store' })).text()
    const latest = html.match(ENTRY)?.[0]
    if (latest && latest !== mine) {
      ready = true
      emit()
    }
  } catch {
    /* 오프라인 등: 다음에 다시 확인 */
  }
}

/** 서비스 워커 등록 + 새 버전 확인 (배포 사이트에서만) */
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return
  window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {})
    setInterval(checkForUpdate, 30 * 60 * 1000) // 30분마다
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate() // 앱으로 돌아올 때
    })
  })
}
