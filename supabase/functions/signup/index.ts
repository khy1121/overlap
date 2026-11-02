// 이름 + 생년월일 + 비밀번호 가입.
// 이메일이 없으므로 이름·생년월일로 내부 로그인 식별자(가짜 이메일)를 만들고,
// 서비스 키로 이미 인증된 계정을 만든다. 생년월일 자체는 저장하지 않는다.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

export function normalizeName(name: string) {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ')
}

// 클라이언트(src/lib/identity.js)와 같은 규칙이어야 한다
export async function loginEmail(name: string, birth: string) {
  const data = new TextEncoder().encode(`${normalizeName(name).toLowerCase()}|${birth}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
  return `u${hex.slice(0, 32)}@users.overlap.example.com`
}

function validBirth(birth: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return false
  const d = new Date(`${birth}T00:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== birth) return false
  const year = d.getUTCFullYear()
  return year >= 1900 && d.getTime() < Date.now()
}

// 만 나이 (한국 시간 기준 오늘) — 만 14세 미만은 보호자 동의가 필요해서 가입을 받지 않아요
function ageOf(birth: string) {
  const [y, m, d] = birth.split('-').map(Number)
  const now = new Date(Date.now() + 9 * 3600 * 1000) // UTC+9
  const [ny, nm, nd] = [now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate()]
  return ny - y - (nm < m || (nm === m && nd < d) ? 1 : 0)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  let body: { name?: string; birth?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_request', message: '요청 형식이 올바르지 않아요.' })
  }
  const name = normalizeName(String(body.name ?? ''))
  const birth = String(body.birth ?? '')
  const password = String(body.password ?? '')

  if (!name || [...name].length > 20) return json(400, { error: 'invalid_name', message: '이름은 1~20자로 입력해 주세요.' })
  if (!validBirth(birth)) return json(400, { error: 'invalid_birth', message: '생년월일을 다시 확인해 주세요.' })
  if (ageOf(birth) < 14) return json(400, { error: 'under_14', message: '만 14세 이상만 가입할 수 있어요.' })
  if (password.length < 6 || password.length > 72) return json(400, { error: 'invalid_password', message: '비밀번호는 6자 이상으로 정해 주세요.' })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const email = await loginEmail(name, birth)
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return json(409, { error: 'exists', message: '같은 이름과 생년월일로 가입한 계정이 있어요. 로그인해 주세요.' })
    }
    return json(500, { error: 'signup_failed', message: '가입하지 못했어요. 잠시 후 다시 시도해 주세요.' })
  }
  return json(200, { ok: true })
})
