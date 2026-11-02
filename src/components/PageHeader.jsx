/** 뒤로가기: 이 앱 안에서 넘어왔으면 이전 화면으로, 링크로 바로 들어왔으면 홈으로 */
export function BackButton({ className = '' }) {
  function back() {
    const fromHere = document.referrer && new URL(document.referrer).origin === window.location.origin
    if (fromHere && window.history.length > 1) window.history.back()
    else window.location.href = '/'
  }
  return (
    <button type="button" onClick={back} className={`btn-ghost btn-sm -ml-2 !px-2 ${className}`} aria-label="뒤로 가기">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
      <span className="text-[15px]">뒤로</span>
    </button>
  )
}

/** 하위 페이지 머리: 뒤로가기 + 제목 + 오른쪽 동작 */
export default function PageHeader({ title, sub, children }) {
  return (
    <header className="mb-1 flex flex-col gap-1">
      <BackButton className="self-start" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="m-0 font-display text-[26px] font-extrabold tracking-[-.02em]">{title}</h1>
          {sub && <p className="m-0 mt-0.5 text-sm text-ink2">{sub}</p>}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </header>
  )
}
