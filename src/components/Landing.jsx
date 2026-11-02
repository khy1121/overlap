import AuthForm from './AuthForm'

const STEPS = [
  '회의 이름, 기간, 시간대, 회의 길이를 정하고 회의를 만들어요.',
  '초대 링크를 보내거나, 초대 코드로 친구를 맺어 두고 바로 회의에 불러요.',
  '각자 가능·조율 가능·불가를 칠하거나 Google 캘린더에서 바쁜 시간을 가져오면, 겹치는 시간이 실시간으로 계산돼요.',
]
const DEMO = '....a....b.a..bca..b.a....a.......a....b.a..bca..'.split('')
const DEMO_CLASS = {
  '.': 'bg-cell',
  a: 'bg-yes-soft',
  b: 'bg-maybe',
  c: 'bg-yes shadow-[inset_0_0_0_2px_var(--pen)]',
}
const LEGEND = [
  ['가능', 'bg-yes-soft', 'bg-yes'],
  ['조율 가능', 'bg-maybe-soft', 'bg-maybe'],
  ['불가', 'bg-no-soft', 'bg-no'],
]

function Mascot({ className = '' }) {
  return (
    <img
      src="/brand/mascot.webp"
      width="640"
      height="448"
      alt="민트와 라벤더 젤리 두 마리가 겹쳐 하트를 만드는 Overlap 마스코트"
      className={`mascot h-auto select-none ${className}`}
      draggable="false"
    />
  )
}

function DemoBoard() {
  return (
    <div className="rounded-lg bg-sheet p-5 shadow-float md:p-6" aria-hidden="true">
      <div className="mb-3 flex items-center justify-between">
        <b className="text-[17px] font-semibold tracking-[-.01em]">팀 회의 · 이번 주</b>
        <span className="text-xs text-ink2">4명 참여</span>
      </div>
      <div className="grid grid-cols-5 gap-[5px]">
        {['월', '화', '수', '목', '금'].map((d) => (
          <div key={d} className="pb-1 text-center text-xs font-medium text-ink2">{d}</div>
        ))}
        {DEMO.map((c, i) => (
          <i key={i} className={`h-5 rounded-[6px] md:h-6 ${DEMO_CLASS[c]}`} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {LEGEND.map(([t, soft, dot]) => (
          <span key={t} className={`inline-flex items-center gap-1.5 rounded-full py-1 pl-2.5 pr-3 text-xs font-medium ${soft}`}>
            <i className={`h-2 w-2 rounded-full ${dot}`} />
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="flex flex-col gap-12 pb-4 pt-4 md:gap-16 md:pt-10">
      <section className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="flex flex-col items-center text-center md:items-start md:pt-6 md:text-left">
          <Mascot className="mb-2 w-[220px] md:hidden" />
          <h1 className="m-0 text-balance font-display text-[clamp(34px,6vw,56px)] font-extrabold leading-[1.15] tracking-[-.03em]">
            모두의 시간이 <em className="hero-em">겹치는</em> 순간을 찾아 드려요
          </h1>
          <p className="mb-7 mt-4 max-w-[30em] text-base leading-relaxed text-ink2 md:text-[17px]">
            일주일 시간표에 각자 되는 시간을 칠하면, Overlap이 전원이 가능한 시간과 가장 많이 되는 시간을 골라 "이 시간 어때요?" 하고 제안해요.
          </p>
          <AuthForm />
        </div>

        <div className="relative max-md:hidden">
          <Mascot className="relative z-10 -mb-3 ml-2 w-[240px]" />
          <div className="absolute right-0 top-[64px] z-20 rounded-md bg-pen-strong px-[18px] py-3.5 text-pen-ink shadow-float">
            <b className="block text-sm font-semibold">이 시간 어때요?</b>
            <span className="text-xs opacity-90">목요일 오후 3:00 – 4:00 · 4명 모두 가능</span>
          </div>
          <div className="pl-[60px]">
            <DemoBoard />
          </div>
        </div>

        <div className="md:hidden">
          <DemoBoard />
        </div>
      </section>

      <section>
        <h2 className="mb-4 mt-0 text-[22px] font-bold tracking-[-.02em] md:sr-only">이렇게 써요</h2>
        <ol className="m-0 grid list-none gap-3 p-0 md:grid-cols-3 md:gap-6">
          {STEPS.map((s, i) => (
            <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 rounded-lg bg-[color-mix(in_oklab,var(--sheet)_82%,transparent)] p-5 shadow-soft backdrop-blur md:p-6">
              <b className="grid h-7 w-7 place-items-center rounded-full bg-pen-soft text-sm font-semibold text-pen-strong">{i + 1}</b>
              <span className="text-[15px] leading-relaxed text-ink2">{s}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
