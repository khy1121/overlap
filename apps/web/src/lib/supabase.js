import { createOverlapClient } from '@overlap/core/client'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// 설정은 @overlap/core와 같이 (앱은 세션 저장소만 바꿔서 같은 함수를 써요)
export const supabase = createOverlapClient({ url: SUPABASE_URL, key: SUPABASE_KEY })
