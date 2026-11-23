import { useEffect, useState } from 'react'
import { myRequests } from '../lib/friends'

/** 로그인 후 큰 화면 세 개. 설정은 오른쪽 위 아바타에서 열어요. */
export const TABS = [
  {
    key: 'home',
    href: '/',
    label: '약속',
    icon: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4M8 14h3" /></>,
  },
  {
    key: 'schedule',
    href: '/?page=schedule',
    label: '내 일정',
    icon: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><circle cx="12" cy="15.5" r="1.6" /></>,
  },
  {
    key: 'friends',
    href: '/?page=friends',
    label: '친구',
    icon: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></>,
  },
]

/** 받은 친구 신청 수 (친구 탭 배지) */
export function useIncomingRequests() {
  const [n, setN] = useState(0)
  useEffect(() => {
    myRequests().then((reqs) => setN(reqs.filter((r) => r.direction === 'in').length)).catch(() => {})
  }, [])
  return n
}

/** 모바일 하단 탭 (넓은 화면은 상단 바의 같은 메뉴를 써요) */
export default function TabBar({ active }) {
  const incoming = useIncomingRequests()
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-[color-mix(in_oklab,var(--sheet)_94%,transparent)] backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="주요 화면"
    >
      <ul className="mx-auto m-0 grid max-w-[560px] list-none grid-cols-3 p-0">
        {TABS.map((t) => {
          const on = t.key === active
          return (
            <li key={t.key}>
              <a
                href={t.href}
                aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[12px] font-semibold no-underline ${on ? 'text-accent' : 'text-ink2'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{t.icon}</svg>
                {t.label}
                {t.key === 'friends' && incoming > 0 && (
                  <span className="absolute left-1/2 top-1.5 ml-2 rounded-full bg-no px-1.5 text-[11px] font-bold leading-[18px] text-white" aria-label={`받은 친구 신청 ${incoming}개`}>{incoming}</span>
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
