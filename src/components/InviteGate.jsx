import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AuthForm from './AuthForm'

export default function InviteGate({ mid }) {
  const [info, setInfo] = useState(undefined)

  useEffect(() => {
    supabase.rpc('meeting_preview', { mid }).then(({ data, error }) => setInfo(error ? null : data?.[0] || null))
  }, [mid])

  if (info === undefined) return <div className="grid min-h-[40vh] place-items-center text-ink2">불러오는 중…</div>

  return (
    <section className="sheet mx-auto mt-6 max-w-[460px]">
      {info ? (
        <>
          <div className="small">약속 초대</div>
          <h1 className="mb-1 mt-1.5 text-balance font-display text-[28px] font-extrabold">{info.title}</h1>
          <p className="small">
            {Number(info.start_date.slice(5, 7))}/{Number(info.start_date.slice(8, 10))}부터 일주일 · 지금 {info.joined}명 참여 중
          </p>
          <p className="my-3.5">로그인하거나 이름·생년월일·비밀번호로 가입하면 바로 참여해서 되는 시간을 칠할 수 있어요.</p>
          <AuthForm initial="signup" />
        </>
      ) : (
        <>
          <h1 className="mb-1 font-display text-[28px] font-extrabold">약속을 찾을 수 없어요</h1>
          <p className="small">링크가 정확한지 확인하거나, 약속을 만든 사람에게 새 링크를 받아 주세요.</p>
        </>
      )}
    </section>
  )
}
