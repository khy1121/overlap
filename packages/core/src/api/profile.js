// 내 프로필·친구 목록·계정. Supabase 클라이언트(db)를 첫 인자로 받아요.

/** 내 프로필 { name, invite_code, … } (없으면 null) */
export async function myProfile(db) {
  const { data } = await db.rpc('my_profile')
  return data?.[0] || null
}

/** 친구 초대 코드 표시: 'ABCD1234' → 'ABCD-1234' */
export const formatCode = (c) => (c ? `${c.slice(0, 4)}-${c.slice(4)}` : '')

/** 표시 이름 바꾸기 (1~20자). 바뀐 이름을 돌려줘요 */
export async function updateMyName(db, name) {
  const v = name.trim()
  if (!v || [...v].length > 20) throw new Error('이름은 1~20자로 입력해 주세요.')
  const { data, error } = await db.rpc('update_my_name', { new_name: v })
  if (error) throw new Error(/function/i.test(error.message) ? '이름 변경 기능이 아직 서버에 준비되지 않았어요.' : '이름을 바꾸지 못했어요.')
  await db.auth.updateUser({ data: { full_name: data } })
  return data
}

/** 친구 목록: 최근에 같은 약속을 잡은 순으로 lim명씩. 서버 함수가 없으면 이름순 전체에서 잘라요 */
export async function fetchFriends(db, offset = 0, lim = 20) {
  const r = await db.rpc('my_friends_recent', { lim, off: offset })
  if (!r.error) return { rows: r.data, total: Number(r.data[0]?.total ?? offset), recent: true }
  const all = await db.rpc('my_friends')
  const list = all.error ? [] : all.data
  return { rows: list.slice(offset, offset + lim), total: list.length, recent: false }
}

/** 친구 끊기 */
export async function removeFriend(db, userId) {
  const { error } = await db.rpc('remove_friend', { target: userId })
  if (error) throw new Error('친구를 끊지 못했어요.')
}

/** 회원 탈퇴: '탈퇴'를 직접 입력해야 해요. 성공하면 로그아웃까지 */
export async function deleteAccount(db, confirmText) {
  const { error } = await db.functions.invoke('delete-account', { body: { confirm: confirmText.trim() } })
  if (error) {
    let message = '탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
    try { message = (await error.context.json())?.message || message } catch { /* 본문 없음 */ }
    if (error.context?.status === 404) message = '탈퇴 기능이 아직 서버에 준비되지 않았어요.'
    throw new Error(message)
  }
  await db.auth.signOut().catch(() => {})
}
