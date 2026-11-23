// 앱의 Supabase 클라이언트: 설정은 웹과 같은 @overlap/core 함수, 세션만 AsyncStorage에 저장해요
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { createOverlapClient } from '@overlap/core/client'

const { supabaseUrl, supabaseKey } = Constants.expoConfig?.extra || {}

export const supabase = createOverlapClient({
  url: supabaseUrl,
  key: supabaseKey,
  storage: AsyncStorage,
  detectSessionInUrl: false, // 앱에는 주소창이 없어요
})
