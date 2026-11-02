import { supabase } from '../lib/supabase'
import { displayName } from '../lib/auth'
import Avatar from './Avatar'
import Logo from './Logo'

export default function AppBar({ session }) {
  const user = session?.user
  return (
    <nav className="flex min-h-[44px] items-center justify-between gap-3">
      <a href="/" className="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-ink no-underline" aria-label="Overlap 홈">
        <Logo />
        Overlap
      </a>
      {user && (
        <div className="flex items-center gap-2 text-[13px] text-ink2">
          <Avatar name={displayName(user)} size={28} />
          <span className="hidden sm:inline">{displayName(user)}</span>
          <button
            className="btn"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
          >
            로그아웃
          </button>
        </div>
      )}
    </nav>
  )
}
