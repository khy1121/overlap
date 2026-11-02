// 앱 설치(PWA) 상태.
// - 안드로이드(갤럭시)·PC Chrome/Edge: 브라우저가 주는 beforeinstallprompt로 바로 설치 창을 띄워요.
// - 아이폰·아이패드: 설치 API가 없어서 '공유 → 홈 화면에 추가' 안내를 보여 줘요.
// - 카카오톡 등 인앱 브라우저: 설치가 안 돼서 기본 브라우저로 열도록 안내해요.
import { useSyncExternalStore } from 'react'

let deferred = null
const subs = new Set()
const emit = () => subs.forEach((f) => f())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // 브라우저 기본 배너 대신 우리 버튼으로
    deferred = e
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
export const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)
export const isInApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua)
export const isKakao = /KAKAOTALK/i.test(ua)
export const isMobile = /Android|iPhone|iPad|iPod/i.test(ua) || isIOS

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

/** 지금 보여 줄 설치 방식: 'prompt' | 'ios' | 'inapp' | 'android-menu' | null(숨김) */
function currentMode() {
  if (isStandalone()) return null
  if (isInApp) return 'inapp'
  if (deferred) return 'prompt'
  if (isIOS) return 'ios'
  if (/Android/i.test(ua)) return 'android-menu' // 설치 창이 아직 안 왔을 때: 브라우저 메뉴 안내
  return null // PC에서 설치를 지원하지 않는 브라우저(파이어폭스 등)는 숨겨요
}

export function useInstall() {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => subs.delete(cb) },
    currentMode,
    () => null,
  )
}

/** 브라우저 설치 창 띄우기. 설치했으면 true */
export async function promptInstall() {
  if (!deferred) return false
  const e = deferred
  deferred = null
  e.prompt()
  const { outcome } = await e.userChoice
  emit()
  return outcome === 'accepted'
}

/** 카카오톡 인앱 브라우저 → 기본 브라우저로 같은 주소 열기 */
export function openExternal() {
  const url = window.location.href
  if (isKakao) window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`
  else if (/Android/i.test(ua)) window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`
}
