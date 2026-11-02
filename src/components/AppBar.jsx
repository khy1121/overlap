import { supabase } from '../lib/supabase'
import { displayName } from '../lib/auth'
import Avatar from './Avatar'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

export default function AppBar({ session }) {
  const user = session?.user
  return (
    <nav className="flex min-h-[44px] items-center justify-between gap-3">
      <a href="/" className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-xl font-extrabold tracking-tight text-ink no-underline" aria-label="Overlap 홈">
        <Logo />
        Overlap
      </a>
      <div className="flex min-w-0 items-center gap-2 text-[13px] text-ink2">
        <ThemeToggle />
        {user && (
          <>
            <Avatar name={displayName(user)} size={28} />
            <span className="hidden truncate sm:inline">{displayName(user)}</span>
            <button
              className="btn-ghost btn-sm max-sm:!px-2"
              aria-label="로그아웃"
              title="로그아웃"
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/'
              }}
            >
              {/* 모바일은 아이콘만 (큰 글자 설정에서도 상단 바가 넘치지 않게) */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="sm:hidden">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className="max-sm:hidden">로그아웃</span>
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
