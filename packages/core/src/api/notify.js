// 알림 설정·테스트·앱 기기 토큰 (웹·앱 공통). Supabase 클라이언트(db)를 첫 인자로 받아요.

export const KINDS = [
  { key: 'upcoming', label: '다가오는 약속', desc: '전날 저녁 8시, 당일 아침 8시' },
  { key: 'confirmed', label: '약속 시간 확정', desc: '참여한 약속의 시간이 정해지면' },
  { key: 'invite', label: '약속 초대', desc: '친구가 나를 약속에 초대하면' },
  { key: 'friend', label: '친구 신청', desc: '친구 신청이 오거나 내 신청이 수락되면' },
  { key: 'updates', label: '앱 업데이트 소식', desc: '새 기능이 나오면 가끔 알려 드려요' },
]

/** 종류별 설정 { upcoming, confirmed, friend, invite, updates } (없으면 모두 켜짐) */
export async function loadPrefs(db) {
  const all = { upcoming: true, confirmed: true, friend: true, invite: true, updates: true }
  const { data, error } = await db.from('notification_prefs').select('upcoming,confirmed,friend,invite,updates').maybeSingle()
  if (error) {
    // 서버에 '업데이트 소식' 칸이 아직 없으면 나머지만 읽어요
    const old = await db.from('notification_prefs').select('upcoming,confirmed,friend,invite').maybeSingle()
    return { ...all, ...(old.data || {}) }
  }
  return { ...all, ...(data || {}) }
}

export async function savePrefs(db, prefs) {
  const { data: { user } } = await db.auth.getUser()
  const { error } = await db.from('notification_prefs').upsert({ user_id: user.id, ...prefs, updated_at: new Date().toISOString() })
  if (error) throw new Error(`설정을 저장하지 못했어요: ${error.message}`)
}

/** 내 기기(웹·앱 모두)로 테스트 알림 */
export async function sendTestPush(db) {
  const { data, error } = await db.functions.invoke('push-send', { body: { test: true } })
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

/** 앱 기기 토큰 저장·삭제 (서버에 아직 함수가 없으면 조용히 넘어가요) */
export async function saveAppToken(db, token, platform) {
  const { error } = await db.rpc('save_app_push_token', { p_token: token, p_platform: platform })
  if (error && !/function/i.test(error.message)) throw new Error('알림 기기를 등록하지 못했어요.')
}
export async function removeAppToken(db, token) {
  await db.rpc('remove_app_push_token', { p_token: token })
}

/**
 * 알림에 담긴 웹 주소(/?m=… · /?page=…)를 앱 안 경로로 바꿔요 (딥링크 설정과 같은 이름)
 * '/?m=abc' → 'm/abc', '/?page=friends' → 'friends', 모르는 주소 → '' (홈)
 */
export function appPathOf(url) {
  const q = String(url || '').split('?')[1] || ''
  const params = Object.fromEntries(q.split('&').filter(Boolean).map((kv) => kv.split('=').map(decodeURIComponent)))
  if (params.m && /^[0-9a-f-]{8,}$/i.test(params.m)) return `m/${params.m}`
  const page = { friends: 'friends', settings: 'settings', schedule: 'schedule', new: 'new' }[params.page]
  return page || ''
}
