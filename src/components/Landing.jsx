import AuthForm from './AuthForm'
import InstallApp from './InstallApp'

const FEATURES = [
  {
    title: '링크 하나로 초대',
    desc: '초대 링크나 친구 코드로 바로 불러요',
    tone: 'bg-pen-soft text-accent',
    icon: <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />,
  },
  {
    title: '칠하면 바로 계산',
    desc: '가능·조율·불가를 칠하면 겹치는 시간이 실시간으로',
    tone: 'bg-yes-soft text-ink',
    icon: <path d="M20 6 9 17l-5-5" />,
  },
  {
    title: 'Google 캘린더 연동',
    desc: '바쁜 시간을 가져와 한 번에 표시해요',
    tone: 'bg-maybe-soft text-ink',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
]

/** 첫 화면: 토스 톤(단색 배경·왼쪽 정렬)으로 마스코트, 한 줄 소개, 로그인, 앱 설치, 특징 3가지 */
export default function Landing() {
  return (
    <div className="mx-auto grid w-full max-w-[960px] grid-cols-1 gap-6 pb-6 pt-2 md:grid-cols-[minmax(0,1fr)_400px] md:items-start md:gap-14 md:pt-12">
      <section className="flex flex-col items-start">
        <img
          src="/brand/mascot.webp"
          width="640"
          height="448"
          alt="민트와 파랑 젤리 두 마리가 겹쳐 하트를 만드는 Overlap 마스코트"
          className="mascot h-auto w-[132px] select-none md:w-[168px]"
          draggable="false"
        />
        <h1 className="m-0 mt-3 text-[30px] font-extrabold leading-[1.3] tracking-[-.03em] md:text-[40px]">
          모두 되는 시간,
          <br />
          <span className="text-accent">Overlap</span>이 찾아 드려요
        </h1>
        <p className="m-0 mt-3 text-[16px] leading-relaxed text-ink2 md:text-[17px]">
          각자 되는 시간을 칠하면
          <br className="md:hidden" /> 겹치는 시간을 골라 제안해요.
        </p>

        <ul className="m-0 mt-8 hidden list-none flex-col gap-4 p-0 md:flex">
          {FEATURES.map((f) => <Feature key={f.title} {...f} />)}
        </ul>
      </section>

      <div className="flex flex-col gap-3">
        <AuthForm />
        <InstallApp />
      </div>

      <ul className="m-0 flex list-none flex-col gap-4 p-0 md:hidden">
        {FEATURES.map((f) => <Feature key={f.title} {...f} />)}
      </ul>
    </div>
  )
}

function Feature({ title, desc, tone, icon }) {
  return (
    <li className="flex items-center gap-3.5">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${tone}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold">{title}</span>
        <span className="block text-[13px] text-ink2">{desc}</span>
      </span>
    </li>
  )
}
