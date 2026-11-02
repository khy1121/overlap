// 알림 보내기 서버 함수.
// - DB 트리거·예약 작업이 부를 때: x-push-secret 헤더가 Vault의 비밀값과 같아야 해요 (외부에서 임의 발송 불가)
// - 로그인한 사용자가 부를 때: '테스트 알림'만, 자기 기기로만 보낼 수 있어요
// 받는 사람의 알림 설정(종류별 켜기/끄기)을 확인하고, 만료된 기기 구독은 지워요.
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { sendPush } from './webpush.ts'

const ALLOWED_ORIGINS = ['https://overlap-liard.vercel.app', 'http://localhost:5179']
const KINDS = ['upcoming', 'confirmed', 'friend', 'invite', 'updates', 'feedback']
// 사용자가 끌 수 없는 종류 (관리자용 의견 알림·테스트)
const ALWAYS = ['test', 'feedback']

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
})

// 비밀값의 비공개 키(JWK) 읽기. 붙여 넣을 때 바깥 { } 가 빠져도 받아들이고, 잘못된 값이면 null (함수가 멈추지 않게)
function readJwk(raw: string) {
  let s = raw.trim()
  if (!s) return null
  if (!s.startsWith('{')) s = `{${s}`
  if (!s.endsWith('}')) s = `${s.replace(/,\s*$/, '')}}`
  try {
    const j = JSON.parse(s)
    return j && j.kty === 'EC' && j.d && j.x && j.y ? j : null
  } catch {
    return null
  }
}

// 길이가 같을 때도 시간 차로 값이 새지 않게 비교
function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('Origin'))
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const vapid = {
    publicKey: (Deno.env.get('VAPID_PUBLIC_KEY') || '').trim(),
    privateJwk: readJwk(Deno.env.get('VAPID_PRIVATE_JWK') || ''),
    subject: 'https://overlap-liard.vercel.app',
  }
  if (!vapid.publicKey || !vapid.privateJwk) {
    // 값은 절대 내보내지 않고, 무엇이 빠졌는지만 알려요
    const raw = (Deno.env.get('VAPID_PRIVATE_JWK') || '').trim()
    return json(500, {
      error: 'not_configured',
      check: {
        public_key: vapid.publicKey ? `ok(${vapid.publicKey.length}자)` : 'missing',
        private_jwk: vapid.privateJwk ? 'ok' : raw ? `invalid(${raw.length}자, 필요 항목 kty·crv·x·y·d: ${['kty', 'crv', 'x', 'y', 'd'].map((k) => (raw.includes(`"${k}"`) ? k : `${k}없음`)).join(',')})` : 'missing',
      },
    })
  }

  let input: Record<string, unknown> = {}
  try {
    input = await req.json()
  } catch {
    return json(400, { error: 'bad_request' })
  }

  let userIds: string[] = []
  let kind = ''
  let message: { title: string; body: string; url: string; tag?: string }

  const hook = req.headers.get('x-push-secret') || ''
  if (hook) {
    // 1) DB 트리거·예약 작업
    const { data: secret } = await admin.rpc('push_hook_secret')
    if (!safeEqual(hook, String(secret || ''))) return json(401, { error: 'unauthorized' })
    userIds = Array.isArray(input.user_ids) ? (input.user_ids as string[]).slice(0, 200) : []
    kind = String(input.kind || '')
    if (!KINDS.includes(kind)) return json(400, { error: 'bad_kind' })
    message = {
      title: String(input.title || 'Overlap').slice(0, 80),
      body: String(input.body || '').slice(0, 200),
      url: String(input.url || '/').startsWith('/') ? String(input.url || '/') : '/',
      tag: String(input.tag || kind),
    }
  } else {
    // 2) 로그인 사용자: 내 기기로 테스트 알림만
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: who } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } }
    if (!who?.user) return json(401, { error: 'login_required', message: '로그인이 필요해요.' })
    if (input.test !== true) return json(403, { error: 'forbidden' })
    userIds = [who.user.id]
    kind = 'test'
    message = { title: 'Overlap 알림 테스트', body: '알림이 잘 와요! 약속 소식을 여기로 알려 드릴게요.', url: '/?page=settings', tag: 'test' }
  }
  if (!userIds.length) return json(200, { sent: 0 })

  // 종류별 알림을 끈 사람은 빼요 (설정이 없으면 모두 켜짐)
  let targets = userIds
  if (!ALWAYS.includes(kind)) {
    const { data: off } = await admin.from('notification_prefs').select('user_id').in('user_id', userIds).eq(kind, false)
    const offIds = new Set((off || []).map((r: { user_id: string }) => r.user_id))
    targets = userIds.filter((id) => !offIds.has(id))
  }
  if (!targets.length) return json(200, { sent: 0 })

  const { data: subs } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').in('user_id', targets)
  const payload = JSON.stringify(message)
  let sent = 0
  const expired: string[] = []
  await Promise.all(
    (subs || []).map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        const status = await sendPush(s, payload, vapid)
        if (status === 404 || status === 410) expired.push(s.id)
        else if (status >= 200 && status < 300) sent++
      } catch {
        /* 한 기기 실패가 다른 기기 발송을 막지 않게 */
      }
    }),
  )
  if (expired.length) await admin.from('push_subscriptions').delete().in('id', expired)
  return json(200, { sent, devices: subs?.length || 0, removed: expired.length })
})
