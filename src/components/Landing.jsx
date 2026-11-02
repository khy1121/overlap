import GoogleButton from './GoogleButton'

const STEPS = [
  '회의 이름, 기간, 시간대, 회의 길이를 정하고 회의를 만들어요.',
  '초대 링크나 이메일로 사람들을 불러요. 받은 사람은 Google로 로그인만 하면 바로 참여해요.',
  '각자 가능·조율 가능·불가를 칠하거나 Google 캘린더에서 바쁜 시간을 가져오면, 겹치는 시간이 실시간으로 계산돼요.',
]
const DEMO = '....a....b.a..bca..b.a....a.......a....b.a..bca..'.slice(0, 45).split('')
const DEMO_CLASS = {
  '.': 'bg-cell',
  a: 'bg-[color-mix(in_oklab,var(--yes)_35%,var(--cell))]',
  b: 'bg-[color-mix(in_oklab,var(--yes)_65%,var(--cell))]',
  c: 'bg-yes shadow-[inset_0_0_0_2px_var(--pen)]',
}

export default function Landing() {
  return (
    <section className="grid items-center gap-8 pb-2 pt-7 md:grid-cols-[1.1fr_1fr]">
      <div>
        <h1 className="m-0 text-balance font-display text-[clamp(32px,5.6vw,54px)] font-extrabold leading-[1.12] tracking-[-.03em]">
          모두의 시간이 <em className="hero-em">겹치는</em> 순간을 찾아 드려요
        </h1>
        <p className="mb-[22px] mt-3.5 max-w-[34em] text-base text-ink2">
          일주일 시간표에 각자 되는 시간을 칠하면, Overlap이 전원이 가능한 시간과 가장 많이 되는 시간을 골라 "이 시간 어때요?" 하고 제안해요.
        </p>
        <GoogleButton />
        <p className="mt-2.5 text-[13px] text-ink2">Google 계정으로 로그인해요. 이름과 프로필 사진만 사용해요.</p>
        <ol className="mt-6 flex max-w-[30em] list-none flex-col gap-2.5 p-0">
          {STEPS.map((s, i) => (
            <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-2.5">
              <b className="grid h-6 w-6 place-items-center rounded-full border border-rule bg-sheet font-mono text-xs">{i + 1}</b>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="grid grid-cols-5 gap-[3px] rounded-md border border-rule bg-sheet p-3.5" aria-hidden="true">
        {['월', '화', '수', '목', '금'].map((d) => (
          <div key={d} className="text-center font-mono text-[11px] text-ink2">{d}</div>
        ))}
        {DEMO.map((c, i) => (
          <i key={i} className={`h-4 rounded-sm ${DEMO_CLASS[c]}`} />
        ))}
      </div>
    </section>
  )
}
