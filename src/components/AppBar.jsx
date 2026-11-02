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
              className="btn shrink-0 whitespace-nowrap"
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/'
              }}
            >
              로그아웃
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
