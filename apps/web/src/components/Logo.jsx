// 민트·라벤더 두 칸이 겹치고, 겹친 자리에 작은 하트
export default function Logo({ size = 28 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect x="2" y="8" width="18" height="18" rx="7" fill="var(--yes)" />
      <rect x="12" y="4" width="18" height="18" rx="7" fill="var(--pen)" fillOpacity=".85" />
      <path d="M15.6 12.4c.9-1 2.4-1 3.2 0 .8.9.7 2.2-.1 3l-2.3 2.3-2.3-2.3c-.8-.8-.9-2.1 0-3z" fill="#fff" />
    </svg>
  )
}
