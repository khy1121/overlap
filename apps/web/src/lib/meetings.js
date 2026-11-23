// 약속 목록·삭제·나가기: 로직은 @overlap/core, 여기서는 웹의 Supabase 클라이언트와 링크 주소를 넣어 줘요
import * as api from '@overlap/core/api/meetings'
import { supabase } from './supabase'
import { APP_ORIGIN } from './site'

export { confirmedTime, hm, meetingSpan } from '@overlap/core/api/meetings'
export const fetchMyMeetings = () => api.fetchMyMeetings(supabase)
export const fetchMyEntries = (uid) => api.fetchMyEntries(supabase, uid)
export const deleteMeeting = (mid) => api.deleteMeeting(supabase, mid)
export const leaveMeeting = (mid, uid) => api.leaveMeeting(supabase, mid, uid)
export const googleAddLink = (m, t) => api.googleAddLink(m, t, APP_ORIGIN)
