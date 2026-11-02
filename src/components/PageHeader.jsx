/** 하위 페이지 머리: 홈으로 돌아가기 + 제목 + 오른쪽 동작 */
export default function PageHeader({ title, sub, children }) {
  return (
    <header className="mb-1 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <a href="/" className="mb-1 inline-flex items-center gap-1 text-[13px] font-semibold text-ink2 no-underline hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          홈
        </a>
        <h1 className="m-0 font-display text-[26px] font-extrabold tracking-[-.02em]">{title}</h1>
        {sub && <p className="m-0 mt-0.5 text-sm text-ink2">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  )
}
