import { useState } from 'react'
import { hasKakao, linkKakao } from '../lib/auth'
import { useToast } from '../hooks/useToast'
import { KakaoButton } from './AuthForm'

/** 이름+생년월일 계정에 카카오 연결 권유. 이미 연결했거나 카카오로 가입했으면 안 보여요. */
export default function KakaoLink({ user }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  if (!user || hasKakao(user)) return null

  async function link() {
    setBusy(true)
    try {
      await linkKakao() // 카카오 화면으로 이동했다가 돌아와요
    } catch (e) {
      toast(e.message)
      setBusy(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-sheet p-4 shadow-soft sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-bold">카카오 계정 연결</div>
        <div className="text-[13px] text-ink2">연결해 두면 비밀번호를 잊어도 카카오로 바로 로그인할 수 있어요.</div>
      </div>
      <div className="sm:w-[200px]">
        <KakaoButton onClick={link} disabled={busy} label="카카오 연결하기" />
      </div>
    </section>
  )
}
