// Supabase 클라이언트 만들기: 웹과 앱이 같은 설정을 쓰고, 다른 점(세션 저장소, 주소창 로그인 처리)만 넘겨요.
//   웹: createOverlapClient({ url, key })                         → localStorage, 주소창의 로그인 결과 읽기
//   앱: createOverlapClient({ url, key, storage: AsyncStorage, detectSessionInUrl: false })
import { createClient } from '@supabase/supabase-js'

export function createOverlapClient({ url, key, storage, detectSessionInUrl = true }) {
  return createClient(url, key, {
    auth: { persistSession: true, detectSessionInUrl, flowType: 'pkce', ...(storage ? { storage } : {}) },
  })
}
