// 친구 신청 → 수락/거절.
// 서버에 친구 신청 기능(마이그레이션 0008)이 아직 없으면, 예전처럼 코드로 바로 친구가 되는 방식으로 대신해요.
import { supabase } from './supabase'

const missing = (error) => error && (error.code === 'PGRST202' || /could not find the function|does not exist/i.test(error.message))

const ERRORS = {
  'code not found': '그런 친구 코드가 없어요. 다시 확인해 주세요.',
  'own code': '내 친구 코드예요. 친구의 코드를 입력해 주세요.',
  'not met': '같은 약속에 참여한 사람에게만 바로 신청할 수 있어요.',
  'request not found': '이미 처리된 신청이에요.',
}
export const friendError = (e) => ERRORS[Object.keys(ERRORS).find((k) => e.message.includes(k))] || `처리하지 못했어요: ${e.message}`

/** 신청 결과 → 안내 문구 */
export function resultText(result, name) {
  const who = `${name || '친구'}님`
  return {
    sent: `${who}에게 친구 신청을 보냈어요. 수락하면 친구가 돼요.`,
    friends: `${who}도 신청해 둬서 바로 친구가 됐어요.`,
    already: `${who}과(와)는 이미 친구예요.`,
    pending: `${who}에게 이미 신청했어요. 수락을 기다리는 중이에요.`,
  }[result] || `${who}과(와) 친구가 됐어요.`
}

/** 친구 코드로 신청. { name, result } */
export async function requestByCode(code) {
  const r = await supabase.rpc('request_friend_by_code', { code })
  if (!r.error) return { name: r.data?.[0]?.name, result: r.data?.[0]?.result }
  if (!missing(r.error)) throw new Error(friendError(r.error))
  const old = await supabase.rpc('add_friend_by_code', { code })
  if (old.error) throw new Error(friendError(old.error))
  return { name: old.data?.[0]?.name, result: 'friends' }
}

/** 같은 약속 참여자에게 신청 */
export async function requestFriend(target) {
  const { data, error } = await supabase.rpc('request_friend', { target })
  if (missing(error)) throw new Error('친구 신청 기능이 아직 서버에 준비되지 않았어요. 친구 코드로 추가해 주세요.')
  if (error) throw new Error(friendError(error))
  return data
}

export async function respondRequest(id, accept) {
  const { error } = await supabase.rpc('respond_friend_request', { req: id, accept })
  if (error) throw new Error(friendError(error))
}

export async function cancelRequest(id) {
  const { error } = await supabase.rpc('cancel_friend_request', { req: id })
  if (error) throw new Error(friendError(error))
}

/** 대기 중인 신청 [{ id, direction: 'in'|'out', user_id, name }]. 기능이 없으면 [] */
export async function myRequests() {
  const { data, error } = await supabase.rpc('my_friend_requests')
  return error ? [] : data
}
