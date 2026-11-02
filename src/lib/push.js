// 앱 알림(웹 푸시) 구독·설정.
// 공개 키(VAPID public)는 브라우저에 공개되는 값이에요. 비밀 키는 서버(Supabase 함수 비밀값)에만 있어요.
import { supabase } from './supabase'
import { isIOS, isStandalone } from './install'

const VAPID_PUBLIC_KEY = 'BAvFdISNUFeAGr5oxyHKkO3CgppCtwo-aqHfo4tFSjn_Vji1ReVA1fEVepCkYPbPgDNy7k5DhigE5oqh7COdJpE'

export const KINDS = [
  { key: 'upcoming', label: '다가오는 약속', desc: '전날 저녁 8시, 당일 아침 8시' },
  { key: 'confirmed', label: '약속 시간 확정', desc: '참여한 약속의 시간이 정해지면' },
  { key: 'invite', label: '약속 초대', desc: '친구가 나를 약속에 초대하면' },
  { key: 'friend', label: '친구 신청', desc: '친구 신청이 오거나 내 신청이 수락되면' },
  { key: 'updates', label: '앱 업데이트 소식', desc: '새 기능이 나오면 가끔 알려 드려요' },
]

const toBytes = (b64) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4)), (c) => c.charCodeAt(0))
const toB64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/**
 * 이 기기의 알림 상태
 * 'unsupported' 이 브라우저는 알림 불가 | 'ios-install' 아이폰은 홈 화면에 설치해야 가능
 * 'dev' 개발 서버(서비스 워커 꺼짐) | 'denied' 알림 차단됨 | 'off' 꺼짐 | 'on' 켜짐
 */
export async function pushState() {
  if (isIOS && !isStandalone()) return 'ios-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported'
  if (!import.meta.env.PROD) return 'dev'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

/** 알림 켜기: 권한 요청 → 구독 → 서버에 이 기기 등록 */
export async function enablePush() {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error(perm === 'denied' ? '알림이 차단돼 있어요. 브라우저 설정에서 이 사이트의 알림을 허용해 주세요.' : '알림을 허용하지 않았어요.')
  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  // 예전 키로 만든 구독이면 새로 만들어요
  if (sub && toB64u(sub.options.applicationServerKey || new ArrayBuffer(0)) !== VAPID_PUBLIC_KEY) {
    await sub.unsubscribe()
    sub = null
  }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(VAPID_PUBLIC_KEY) })
  const json = sub.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_ua: navigator.userAgent.slice(0, 300),
  })
  if (error) throw new Error(`알림을 켜지 못했어요: ${error.message}`)
}

/** 알림 끄기: 이 기기 구독 해제 + 서버에서 삭제 */
export async function disablePush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  await supabase.rpc('remove_push_subscription', { p_endpoint: sub.endpoint })
  await sub.unsubscribe()
}

/** 종류별 설정 { upcoming, confirmed, friend, invite, updates } (없으면 모두 켜짐) */
export async function loadPrefs() {
  const all = { upcoming: true, confirmed: true, friend: true, invite: true, updates: true }
  const { data, error } = await supabase.from('notification_prefs').select('upcoming,confirmed,friend,invite,updates').maybeSingle()
  if (error) {
    // 서버에 '업데이트 소식' 칸이 아직 없으면 나머지만 읽어요
    const old = await supabase.from('notification_prefs').select('upcoming,confirmed,friend,invite').maybeSingle()
    return { ...all, ...(old.data || {}) }
  }
  return { ...all, ...(data || {}) }
}

export async function savePrefs(prefs) {
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase.from('notification_prefs').upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() })
  if (error) throw new Error(`설정을 저장하지 못했어요: ${error.message}`)
}

/** 내 기기로 테스트 알림 */
export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('push-send', { body: { test: true } })
  if (error) {
    let code = ''
    try {
      code = (await error.context.json())?.error || ''
    } catch {
      /* 본문 없음 */
    }
    if (code === 'not_configured') throw new Error('알림 서버 설정(알림 키 등록)이 아직 끝나지 않았어요.')
    throw new Error('테스트 알림을 보내지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  if (!data.sent) throw new Error('알림을 받을 기기가 없어요. 알림을 다시 켜 주세요.')
  return data
}
