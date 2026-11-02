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
        {/* 로그인 전엔 테마 버튼, 로그인 후엔 설정(테마·알림·이름·로그아웃)으로 */}
        {!user && <ThemeToggle />}
        {user && (
          <a href="/?page=settings" className="btn-ghost btn-sm gap-2 !pl-1.5 text-ink no-underline" aria-label="설정">
            <Avatar name={displayName(user)} url={user.user_metadata?.avatar_url} size={28} />
            <span className="hidden max-w-[120px] truncate sm:inline">{displayName(user)}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </a>
        )}
      </div>
    </nav>
  )
}
