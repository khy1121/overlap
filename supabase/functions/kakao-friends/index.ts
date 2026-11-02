// 카톡 친구 중 Overlap 가입자 찾기.
// 1) 호출한 Overlap 사용자 확인 (Supabase 로그인 토큰)
// 2) 받은 카카오 토큰이 그 사용자에게 연결된 카카오 계정의 것인지 확인 (남의 토큰 사용 방지)
// 3) 카카오에 직접 친구 목록을 물어보고, 그중 가입자만 돌려줌 (브라우저가 보낸 ID 목록은 믿지 않음)
// 카카오 토큰은 저장하지 않고 이 요청에만 써요.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://overlap-liard.vercel.app', 'http://localhost:5179']
const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
})

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('Origin'))
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json(401, { error: 'login_required', message: '로그인이 필요해요.' })

  let kakaoToken = ''
  try {
    kakaoToken = String((await req.json()).kakao_token || '')
  } catch {
    /* 아래에서 처리 */
  }
  if (!kakaoToken || kakaoToken.length > 512) return json(400, { error: 'bad_request', message: '카카오 인증 정보가 없어요. 다시 시도해 주세요.' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1) 호출한 사용자
  const { data: who, error: whoErr } = await admin.auth.getUser(jwt)
  if (whoErr || !who.user) return json(401, { error: 'login_required', message: '로그인이 만료됐어요. 다시 로그인해 주세요.' })
  const me = who.user.id

  // 2) 카카오 토큰의 주인 = 내 계정에 연결된 카카오 계정인지
  const kakao = (path: string) => fetch(`https://kapi.kakao.com${path}`, { headers: { Authorization: `Bearer ${kakaoToken}` } })
  const meRes = await kakao('/v2/user/me')
  if (!meRes.ok) return json(401, { error: 'kakao_token', message: '카카오 인증이 만료됐어요. 다시 시도해 주세요.' })
  const kakaoMe = String((await meRes.json()).id ?? '')
  const { data: linkedId } = await admin.rpc('kakao_id_of', { me })
  if (!linkedId || linkedId !== kakaoMe) return json(403, { error: 'not_linked', message: '이 계정에 연결된 카카오 계정이 아니에요.' })

  // 3) 카카오 친구 목록 (이 앱에 가입·동의한 친구만 내려와요). 최대 500명까지.
  const ids: string[] = []
  let path: string | null = '/v1/api/talk/friends?limit=100&order=asc'
  for (let page = 0; path && page < 5; page++) {
    const r = await kakao(path)
    if (r.status === 403 || r.status === 401) {
      return json(403, { error: 'friends_consent', message: '카카오톡 친구 목록 제공에 동의해야 찾을 수 있어요.' })
    }
    if (!r.ok) return json(502, { error: 'kakao_error', message: '카카오에서 친구 목록을 받지 못했어요. 잠시 후 다시 시도해 주세요.' })
    const body = await r.json()
    for (const f of body.elements || []) if (f.id != null) ids.push(String(f.id))
    path = body.after_url ? new URL(body.after_url).pathname + new URL(body.after_url).search : null
  }
  if (!ids.length) return json(200, { friends: [] })

  const { data, error } = await admin.rpc('kakao_match', { me, kakao_ids: ids })
  if (error) return json(500, { error: 'match_failed', message: '가입한 친구를 찾지 못했어요. 잠시 후 다시 시도해 주세요.' })
  return json(200, { friends: (data || []).map((x: { user_id: string; name: string; relation: string }) => ({ user_id: x.user_id, name: x.name, relation: x.relation })) })
})
