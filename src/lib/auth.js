import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase'

export const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy'

/** Supabase에서 Google 로그인이 켜져 있는지. 확인할 수 없으면 null */
export async function googleEnabled() {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } })
    const j = await r.json()
    return Boolean(j.external && j.external.google)
  } catch {
    return null
  }
}

export async function signInWithGoogle(redirectTo, extra = {}) {
  const ok = await googleEnabled()
  if (ok === false) {
    throw new Error('Google 로그인이 아직 켜져 있지 않아요. 관리자가 Supabase에서 Google 로그인을 설정해야 해요.')
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, ...extra },
  })
  if (error) throw error
}

export function displayName(user) {
  const m = user?.user_metadata || {}
  return m.full_name || m.name || (user?.email ? user.email.split('@')[0] : '')
}
