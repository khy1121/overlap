// 회원 탈퇴: 로그인한 본인만, 본인 계정만 지울 수 있어요.
// 1) 내가 만든 약속 정리(넘기기·삭제) 2) 계정 삭제 → 연결된 개인정보는 DB가 함께 삭제(cascade)
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

  let confirm = ''
  try {
    confirm = String((await req.json()).confirm || '')
  } catch {
    /* 아래에서 처리 */
  }
  if (confirm !== '탈퇴') return json(400, { error: 'confirm_required', message: '확인 문구가 맞지 않아요.' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const { data: who } = jwt ? await admin.auth.getUser(jwt) : { data: { user: null } }
  if (!who?.user) return json(401, { error: 'login_required', message: '로그인이 필요해요.' })
  const me = who.user.id

  const prep = await admin.rpc('prepare_account_deletion', { me })
  if (prep.error) return json(500, { error: 'prepare_failed', message: '탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.' })

  const del = await admin.auth.admin.deleteUser(me)
  if (del.error) return json(500, { error: 'delete_failed', message: '탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.' })
  return json(200, { ok: true })
})
