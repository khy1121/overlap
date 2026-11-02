// 카카오 연결 해제 웹훅.
// 사용자가 카카오 계정 설정에서 Overlap 연결을 끊거나 카카오 계정을 탈퇴하면 카카오가 이 주소로 알려 줘요.
// - 진짜 카카오 요청인지: Authorization 헤더가 'KakaoAK {어드민 키}'와 같은지, app_id가 우리 앱인지 확인
// - 다른 로그인 수단이 있는 계정 → 카카오 연결만 해제 / 카카오로만 가입한 계정 → 회원 탈퇴와 같게 삭제
// 카카오는 빠른 응답(약 3초)을 기대해서, 처리 결과와 관계없이 확인되면 200으로 답해요.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const APP_ID = '1318545'

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  const adminKey = (Deno.env.get('KAKAO_ADMIN_KEY') || '').trim()
  if (!adminKey) return new Response('not configured', { status: 500 })
  if (!safeEqual(req.headers.get('Authorization') || '', `KakaoAK ${adminKey}`)) return new Response('unauthorized', { status: 401 })

  // GET(쿼리) 또는 POST(폼·JSON) 모두 받아요
  const url = new URL(req.url)
  const params = new URLSearchParams(url.search)
  if (req.method === 'POST') {
    const text = await req.text()
    try {
      const j = JSON.parse(text)
      for (const [k, v] of Object.entries(j)) params.set(k, String(v))
    } catch {
      for (const [k, v] of new URLSearchParams(text)) params.set(k, v)
    }
  }
  const appId = params.get('app_id') || ''
  const kakaoId = params.get('user_id') || ''
  if (appId !== APP_ID || !/^\d{1,20}$/.test(kakaoId)) return new Response('bad request', { status: 400 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('handle_kakao_unlink', { kakao_id: kakaoId })
  if (error) return new Response('error', { status: 500 })
  const row = data?.[0]
  if (row?.action === 'delete' && row.user_id) {
    const prep = await admin.rpc('prepare_account_deletion', { me: row.user_id })
    if (prep.error) return new Response('error', { status: 500 })
    const del = await admin.auth.admin.deleteUser(row.user_id)
    if (del.error) return new Response('error', { status: 500 })
  }
  return new Response('ok', { status: 200 })
})
