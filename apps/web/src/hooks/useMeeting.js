// 약속 하나 불러오기·실시간·저장: 로직은 @overlap/core (앱과 같은 훅), 여기서는 웹 클라이언트를 넣어 줘요
import { useMeeting as coreUseMeeting } from '@overlap/core/hooks/useMeeting'
import { supabase } from '../lib/supabase'

export const useMeeting = (mid, onError) => coreUseMeeting(supabase, mid, onError)
