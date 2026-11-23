// 카카오 로컬(장소) 검색 대리 함수 — 앱용.
// 웹은 카카오맵 JS SDK로 바로 검색하지만, 앱에서는 SDK를 쓸 수 없어서 카카오 REST API를 여기서 불러요.
// - REST 키는 서버 비밀값(KAKAO_REST_KEY)에만 있어요. 앱에는 들어가지 않아요
// - 로그인한 사용자만 (verify_jwt + 사용자 확인), 정해 둔 검색 3가지와 값만 넘겨요
import { createClient } from 'jsr:@supabase/supabase-js@2'

const BASE = 'https://dapi.kakao.com/v2/local'
const CATEGORIES = ['SW8', 'CE7', 'FD6', 'CT1', 'AT4', 'PK6']

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
const num = (v: unknown, lo: number, hi: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const key = (Deno.env.get('KAKAO_REST_KEY') || '').trim()
  if (!key) return json(500, { error: 'not_configured' })

  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: who } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } }
  if (!who?.user) return json(401, { error: 'login_required' })

  let input: Record<string, unknown> = {}
  try {
    input = await req.json()
  } catch {
    return json(400, { error: 'bad_request' })
  }

  const q = new URLSearchParams()
  let path = ''
  // 좌표: 한국 근처만 (x=경도, y=위도)
  const x = num(input.lng, 120, 135)
  const y = num(input.lat, 30, 45)
  if (input.op === 'keyword') {
    const query = String(input.query || '').trim().slice(0, 50)
    if (!query) return json(400, { error: 'bad_query' })
    path = '/search/keyword.json'
    q.set('query', query)
    q.set('size', String(num(input.size, 1, 15) ?? 10))
    if (x !== null && y !== null) { q.set('x', String(x)); q.set('y', String(y)) }
  } else if (input.op === 'category') {
    const code = String(input.code || '')
    if (!CATEGORIES.includes(code) || x === null || y === null) return json(400, { error: 'bad_category' })
    path = '/search/category.json'
    q.set('category_group_code', code)
    q.set('x', String(x))
    q.set('y', String(y))
    q.set('radius', String(num(input.radius, 1, 20000) ?? 1000))
    q.set('size', String(num(input.size, 1, 15) ?? 15))
    q.set('sort', 'distance')
  } else if (input.op === 'region') {
    if (x === null || y === null) return json(400, { error: 'bad_coord' })
    path = '/geo/coord2regioncode.json'
    q.set('x', String(x))
    q.set('y', String(y))
  } else {
    return json(400, { error: 'bad_op' })
  }

  const res = await fetch(`${BASE}${path}?${q}`, { headers: { Authorization: `KakaoAK ${key}` } })
  if (!res.ok) return json(502, { error: 'kakao_failed', status: res.status })
  const out = await res.json()
  return json(200, { documents: out.documents || [] })
})
