import { useEffect, useState } from 'react'
import { RETURNED_FROM_KAKAO, fetchKakaoFriends, startKakaoFriends } from '../lib/kakaoFriends'
import { requestFriend, resultText } from '../lib/friends'
import { useToast } from '../hooks/useToast'
import Avatar from './Avatar'
import { KakaoButton } from './AuthForm'

/** 카톡 친구 중 Overlap을 쓰는 사람 찾기 → 친구 신청 */
export default function KakaoFriends({ user, onChanged }) {
  const toast = useToast()
  const [list, setList] = useState(null) // null: 아직 안 찾음
  const [busy, setBusy] = useState(false)

  // afterConsent: 카카오 동의를 막 마치고 돌아온 경우 (또 동의 화면으로 보내지 않아요)
  async function load(afterConsent = false) {
    setBusy(true)
    try {
      const res = await fetchKakaoFriends()
      if (res.needConsent) {
        if (afterConsent) {
          toast('카카오톡 친구 목록 제공에 동의해야 찾을 수 있어요. 다시 눌러 동의해 주세요.')
          return
        }
        await startKakaoFriends(user) // 카카오 동의 화면으로 이동 (페이지가 바뀌어요)
        return
      }
      setList(res.friends)
    } catch (e) {
      toast(e.message)
    } finally {
      setBusy(false)
    }
  }

  // 카카오 동의를 마치고 돌아왔으면 바로 찾아요
  useEffect(() => {
    if (!RETURNED_FROM_KAKAO) return
    window.history.replaceState(null, '', '/?page=friends')
    load(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function request(f) {
    try {
      const result = await requestFriend(f.user_id)
      setList((all) => all.map((x) => (x.user_id === f.user_id ? { ...x, relation: result === 'friends' || result === 'already' ? 'friend' : 'pending' } : x)))
      toast(resultText(result, f.name))
      if (result === 'friends') onChanged?.()
    } catch (e) {
      toast(e.message)
    }
  }

  return (
    <section className="sheet flex flex-col gap-3" aria-label="카톡 친구 찾기">
      <div>
        <div className="text-[15px] font-bold">카톡 친구 중 Overlap 사용자</div>
        <p className="m-0 mt-0.5 text-[13px] text-ink2">
          카카오톡 친구 중 Overlap을 쓰는 사람을 찾아 친구 신청을 보낼 수 있어요. 친구도 여기서 ‘카톡 친구 찾기’를 한 번 눌러 동의했어야 보여요.
        </p>
      </div>

      {list === null ? (
        <KakaoButton onClick={() => load()} disabled={busy} label={busy ? '찾는 중…' : '카톡 친구 찾기'} />
      ) : list.length === 0 ? (
        <p className="m-0 rounded-[12px] bg-rule2 px-3.5 py-3 text-[13px] text-ink2">
          아직 Overlap을 쓰는 카톡 친구가 없어요. 약속 초대 창의 ‘카카오톡으로 초대 보내기’로 불러 보세요.
        </p>
      ) : (
        <ul className="m-0 list-none p-0">
          {list.map((f) => (
            <li key={f.user_id} className="flex items-center gap-3 border-b border-rule2 py-2.5 last:border-0">
              <Avatar name={f.name} size={36} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{f.name || '이름 없음'}</span>
              {f.relation === 'friend' && <span className="text-[13px] text-ink2">친구</span>}
              {f.relation === 'pending' && <span className="text-[13px] text-ink2">신청함</span>}
              {f.relation === 'none' && <button className="btn-soft btn-sm" onClick={() => request(f)}>친구 신청</button>}
              {f.relation === 'incoming' && <button className="btn-primary btn-sm" onClick={() => request(f)}>수락</button>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
