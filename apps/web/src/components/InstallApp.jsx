import { useEffect, useRef, useState } from 'react'
import { isKakao, openExternal, promptInstall, useInstall } from '../lib/install'
import { useToast } from '../hooks/useToast'

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="공유 버튼" className="inline align-[-3px] text-accent">
    <path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </svg>
)
const PlusSquare = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="inline align-[-3px] text-accent">
    <rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" />
  </svg>
)

const GUIDES = {
  ios: {
    title: '아이폰에 앱 설치하기',
    steps: [
      <>Safari 아래(또는 위) 막대의 <b>공유</b> 버튼 <ShareIcon />을 눌러요.</>,
      <>목록을 내려 <b>홈 화면에 추가</b> <PlusSquare />를 눌러요.</>,
      <>오른쪽 위 <b>추가</b>를 누르면 홈 화면에 Overlap 앱이 생겨요.</>,
    ],
    note: 'Safari에서 열어야 설치할 수 있어요. 다른 앱 안에서 열었다면 Safari로 열어 주세요.',
  },
  'android-menu': {
    title: '휴대폰에 앱 설치하기',
    steps: [
      <>브라우저 오른쪽 위(삼성 인터넷은 아래) <b>메뉴</b> 버튼(⋮ 또는 ≡)을 눌러요.</>,
      <><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 눌러요.</>,
      <><b>설치</b>를 누르면 홈 화면에 Overlap 앱이 생겨요.</>,
    ],
  },
  inapp: {
    title: '브라우저에서 열어 주세요',
    steps: [
      <>지금은 {isKakao ? '카카오톡' : '앱'} 안의 브라우저라 설치할 수 없어요.</>,
      <>오른쪽 위 메뉴에서 <b>다른 브라우저로 열기</b>를 눌러요.</>,
      <>Chrome·삼성 인터넷·Safari에서 다시 <b>앱 설치</b>를 눌러 주세요.</>,
    ],
  },
}

function Guide({ mode, onClose }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.showModal() }, [])
  const g = GUIDES[mode]
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="install-title"
      className="m-auto mb-0 w-full max-w-[480px] rounded-t-[24px] border-0 bg-sheet p-0 text-ink shadow-float backdrop:bg-black/40 sm:mb-auto sm:w-[calc(100%-32px)] sm:rounded-[20px]"
    >
      <div className="flex flex-col gap-4 p-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" width="48" height="48" className="rounded-[12px] shadow-soft" />
          <h2 id="install-title" className="m-0 text-[20px] font-bold">{g.title}</h2>
        </div>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {g.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-relaxed">
              <b className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pen-soft text-[13px] text-accent">{i + 1}</b>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        {g.note && <p className="m-0 rounded-[12px] bg-rule2 px-3.5 py-2.5 text-[13px] text-ink2">{g.note}</p>}
        <button className="btn-primary btn-lg" onClick={onClose}>확인</button>
      </div>
    </dialog>
  )
}

/** 앱 설치 카드. 설치할 수 없거나 이미 앱으로 열었으면 안 보여요. */
export default function InstallApp({ className = '' }) {
  const mode = useInstall()
  const toast = useToast()
  const [guide, setGuide] = useState(null)
  if (!mode) return null

  async function install() {
    if (mode === 'prompt') {
      if (await promptInstall()) toast('설치했어요. 홈 화면에서 Overlap을 열어 보세요.')
      return
    }
    if (mode === 'inapp') openExternal()
    setGuide(mode)
  }

  return (
    <>
      <div className={`flex items-center gap-3 rounded-[20px] bg-sheet p-4 shadow-soft ${className}`}>
        <img src="/icons/icon-192.png" alt="" width="44" height="44" className="shrink-0 rounded-[12px] ring-1 ring-rule" />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold">Overlap 앱 설치</div>
          <div className="text-[13px] text-ink2">홈 화면에서 바로 열어요</div>
        </div>
        <button className="btn-soft shrink-0" onClick={install}>{mode === 'ios' ? '설치 방법' : '설치'}</button>
      </div>
      {guide && <Guide mode={guide} onClose={() => setGuide(null)} />}
    </>
  )
}
