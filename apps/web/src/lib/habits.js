// 자주 되던 시간: 로직은 @overlap/core, 여기서는 웹의 Supabase 클라이언트를 넣어 줘요
import * as api from '@overlap/core/api/habits'
import { supabase } from './supabase'

export { habitCells } from '@overlap/core/habits'
export const fetchMyHabits = (uid, exceptMid) => api.fetchMyHabits(supabase, uid, exceptMid)
