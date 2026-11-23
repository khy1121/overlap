// 친구 신청: 로직은 @overlap/core, 여기서는 웹의 Supabase 클라이언트를 넣어 줘요 (화면 코드는 예전 이름 그대로)
import * as api from '@overlap/core/api/friends'
import { supabase } from './supabase'

export { friendError, resultText } from '@overlap/core/api/friends'
export const requestByCode = (code) => api.requestByCode(supabase, code)
export const requestFriend = (target) => api.requestFriend(supabase, target)
export const respondRequest = (id, accept) => api.respondRequest(supabase, id, accept)
export const cancelRequest = (id) => api.cancelRequest(supabase, id)
export const myRequests = () => api.myRequests(supabase)
