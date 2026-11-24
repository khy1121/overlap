// Google 캘린더 free/busy로 칸 채우기 (웹·앱 공통). 일정 제목·내용은 받지 않는 범위예요.
import { blocked, nDays, nSlots, slotRange } from '../schedule.js'

export const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy'

/** 약속 기간 전체를 덮는 조회 범위 */
export function busyWindow(cfg) {
  const [t0] = slotRange(cfg, 0, 0)
  const [, t1] = slotRange(cfg, nDays(cfg) - 1, nSlots(cfg) - 1)
  return { timeMin: new Date(t0).toISOString(), timeMax: new Date(t1).toISOString() }
}

/** 바쁜 구간 [[시작ms, 끝ms]…] → 바쁜 칸·빈 칸 키 (막힌 칸은 빼요) */
export function splitByBusy(cfg, busy) {
  const busyKeys = []
  const freeKeys = []
  for (let d = 0; d < nDays(cfg); d++) {
    for (let s = 0; s < nSlots(cfg); s++) {
      if (blocked(cfg, d, s)) continue
      const [a, b] = slotRange(cfg, d, s)
      ;(busy.some(([x, y]) => x < b && y > a) ? busyKeys : freeKeys).push(`${d}-${s}`)
    }
  }
  return { busyKeys, freeKeys }
}

/** Google free/busy 읽기. 권한이 만료되면 code 'expired'인 오류 */
export async function fetchBusy(token, cfg, fetchFn = fetch) {
  const r = await fetchFn('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...busyWindow(cfg), items: [{ id: 'primary' }] }),
  })
  if (r.status === 401 || r.status === 403) {
    const e = new Error('캘린더 권한이 만료됐거나 허용되지 않았어요. 다시 연결해 주세요.')
    e.code = 'expired'
    throw e
  }
  if (!r.ok) throw new Error('캘린더를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
  const j = await r.json()
  return splitByBusy(cfg, (j.calendars?.primary?.busy || []).map((b) => [Date.parse(b.start), Date.parse(b.end)]))
}

/**
 * 내 칸에 반영 (되는 시간만 칠하기 규칙): 바쁜 칸은 지워요(칠한 사람의 빈칸 = 안 돼요), 원하면 빈 시간 중 비어 있는 칸 → 돼요.
 * 바쁜 칸에 '안 돼요'를 칠하지 않는 이유: 그 칸만 칠하면 나머지 시간이 전부 안 돼요로 계산돼요.
 * 결과 { next, changed }
 */
export function applyBusy(cells, { busyKeys, freeKeys }, { markBusy = true, fillFree = false } = {}) {
  const next = { ...cells }
  let changed = 0
  if (markBusy) busyKeys.forEach((k) => { if (k in next) { delete next[k]; changed++ } })
  if (fillFree) freeKeys.forEach((k) => { if (!next[k]) { next[k] = 'y'; changed++ } })
  return { next, changed }
}

// ----- 앱: 웹 클라이언트 + 중계 페이지로 권한 받기 -----
// Google 창 → https://…/gcal-callback.html#access_token=… → overlap://gcal#access_token=… (앱으로)

/**
 * 중계 페이지가 앱으로 돌려보내도 되는 주소: 우리 앱(overlap://gcal)과, 개발용 Expo Go는 내 컴퓨터·내부망 주소만.
 * 뒤에 요청을 묶는 값 ?n=<nonce>가 붙을 수 있어요. (gcal-callback.html도 같은 규칙)
 */
export const RETURN_RE = /^(overlap:\/\/|exp:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d{1,5})?\/--\/)gcal(\?n=[A-Za-z0-9_-]{16,64})?$/
export const isAppReturn = (url) => RETURN_RE.test(String(url || ''))

/** 돌아갈 주소에 이번 요청만의 nonce를 붙여요 (돌아온 주소에서 같은 값인지 확인) */
export const withNonce = (returnUrl, nonce) => `${returnUrl}?n=${nonce}`

/** Google 권한 창 주소 (토큰 방식, free/busy만). state에 앱으로 돌아올 주소를 담아요 */
export function googleAuthUrl({ clientId, origin, returnUrl }) {
  const q = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/gcal-callback.html`,
    response_type: 'token',
    scope: CAL_SCOPE,
    include_granted_scopes: 'true',
    prompt: 'consent',
    state: returnUrl,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

/** 앱으로 돌아온 주소에서 토큰 읽기 → { token } | { error }. nonce를 주면 이번 요청의 결과인지 확인해요 */
export function readGoogleReturn(url, nonce) {
  const [head, frag = ''] = String(url || '').split('#')
  if (nonce && !head.endsWith(`?n=${nonce}`)) return { error: '캘린더 연결을 다시 시도해 주세요.' }
  const p = Object.fromEntries(frag.split('&').filter(Boolean).map((kv) => { const [k, v = ''] = kv.split('='); return [k, decodeURIComponent(v)] }))
  if (p.access_token) return { token: p.access_token }
  if (p.error === 'access_denied') return { error: '캘린더 연결을 취소했어요.' }
  return { error: '캘린더 권한을 받지 못했어요. 다시 시도해 주세요.' }
}
