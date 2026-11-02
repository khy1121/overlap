export default function Logo({ size = 26 }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <rect x="3" y="7" width="17" height="17" rx="4" fill="var(--yes)" />
      <rect x="12" y="4" width="17" height="17" rx="4" fill="var(--maybe)" fillOpacity=".85" />
    </svg>
  )
}
