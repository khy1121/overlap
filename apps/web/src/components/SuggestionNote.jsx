import { useEffect, useState } from 'react'
import { dayLabel, spanText, startChoices, summary, timeText, tm } from '@overlap/core/schedule'
import Avatar from './Avatar'
import { useDragScroll } from '../hooks/useDragScroll'

const STATUS_TITLE = { y: '가능', m: '조율', n: '불가', u: '미입력' }
// 원형 아바타 테두리·배지
const STATUS = {
  y: { ring: 'bg-yes', badge: 'bg-yes', mark: '✓' },
  m: { ring: 'bg-maybe', badge: 'bg-maybe', mark: '~' },
  n: { ring: 'bg-no', badge: 'bg-no', mark: '✕' },
  u: { ring: 'bg-rule', badge: '', mark: '' },
}

/**
 * compact: 모바일 약속 화면 맨 위에 들어가는 짧은 카드.
 * 제목·요약을 한 줄로 합치고, 아바타 줄과 '제안 문구 복사'는 빼요(참여자 줄·⋯ 메뉴에 있어요).
 */
export default function SuggestionNote({ cfg, result, list, cand, byId, onNext, onPick, onCopy, onInvite, swapKey, compact = false, onWhen, showAll = false, onShowAll }) {
  const { entered, n } = result
  // 연속 구간 안에서 고른 시작 칸 (추천이 바뀌면 처음으로)
  const [picked, setPicked] = useState(null)
  const drag = useDragScroll() // PC에서 원형 아바타 줄을 마우스로 끌어서 넘기기
  useEffect(() => setPicked(null), [swapKey])
  // 지금 보고 있는 후보(시작 시각 칩 반영)를 바깥에 알려 줘요: ⋯ 메뉴의 '제안 문구 복사'가 같은 시간을 쓰게
  useEffect(() => {
    if (!onWhen) return
    if (!entered || !list.length) return onWhen(null)
    const b = list[cand % list.length]
    onWhen({ ...b, s: picked ?? b.s })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, swapKey, entered])
  if (compact && (!entered || !list.length)) {
    return (
      <div className="rounded-md bg-pen-soft px-4 py-3">
        <div className="text-[13px] font-semibold text-accent">이 시간 어때요?</div>
        <div className="mt-0.5 text-[15px] font-bold">{entered ? '아직 겹치는 시간이 없어요' : '아직 아무도 입력하지 않았어요'}</div>
        <div className="mt-0.5 text-[13px] text-ink2">{entered ? "'가능'·'조율' 칸이 더 모이면 골라 드릴게요." : '내 시간을 칠하고 사람들을 초대해 보세요.'}</div>
      </div>
    )
  }
  if (!entered || !list.length) {
    return (
      <div className="note">
        <div className="font-display text-[22px] font-extrabold leading-tight tracking-[-.02em] text-accent">이 시간 어때요?</div>
        <div className="mt-2 font-display text-[19px] font-extrabold leading-tight">
          {entered ? '아직 겹치는 시간이 없어요' : '아직 아무도 입력하지 않았어요'}
        </div>
        <div className="mt-1.5 text-[13px] text-ink2">
          {entered
            ? "'가능'이나 '조율' 칸이 더 모이면 골라 드릴게요."
            : '되는 시간을 칠하고 사람들을 초대해 보세요. 모두에게 맞는 시간을 여기서 제안해요.'}
        </div>
      </div>
    )
  }
  const base = list[cand % list.length]
  const choices = startChoices(cfg, base)
  const w = { ...base, s: picked ?? base.s } // 고른 시작 시각을 반영한 후보
  const span = spanText(cfg, base)
  // 입력한 사람이 절반 미만이면 확정보다 초대를 먼저 권해요.
  const early = entered * 2 < n
  if (compact) {
    return (
      <div className="swap rounded-md bg-pen-soft px-4 py-3" key={swapKey} aria-label="추천 시간">
        <div className="text-[13px] font-semibold text-accent">
          {w.all ? '이 시간 어때요? 다 돼요!' : '이 시간 어때요?'} <span className="font-medium text-ink2">· {summary(w, n)}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 font-display text-[22px] font-extrabold leading-tight">
          <span>{dayLabel(cfg, w.d)}</span>
          <span className="tabular whitespace-nowrap font-mono text-[20px] font-semibold tracking-tight">{timeText(cfg, w.s)}</span>
        </div>
        {span && <div className="mt-0.5 text-[12px] font-semibold text-accent">{span}</div>}
        {early && <p className="m-0 mt-1 text-[12px] text-ink2">아직 {n}명 중 {entered}명만 입력했어요. 더 모이면 바뀔 수 있어요.</p>}
        {/* 이 시간에 누가 되는지: 작은 아바타 한 줄 (테두리 색 = 가능/조율/불가/미입력) */}
        <ul className="-mx-1 m-0 mt-2 flex list-none items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="이 시간에 되는 사람">
          {['y', 'm', 'n', 'u'].flatMap((k) =>
            w.g[k].map((pid) => {
              const p = byId[pid]
              return (
                <li key={pid} className="relative shrink-0" title={`${p?.name || '이름 없음'}: ${STATUS_TITLE[k]}`}>
                  <span className={`block rounded-full p-[2px] ${STATUS[k].ring}`}>
                    <Avatar name={p?.name} url={p?.avatar_url} size={24} className={k === 'y' ? '' : 'opacity-60'} />
                  </span>
                  <span className="sr-only">{p?.name || '이름 없음'} {STATUS_TITLE[k]}</span>
                </li>
              )
            }),
          )}
          {w.missing > 0 && <li className="shrink-0 px-1 text-[12px] font-semibold text-ink2">+{w.missing} 아직 안 옴</li>}
        </ul>
        {choices.length > 1 && (
          <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="시작 시각">
            {choices.map((s) => {
              const on = s === w.s
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`tabular min-h-[32px] shrink-0 rounded-full border-0 px-3 font-mono text-[13px] font-semibold ${on ? 'bg-pen-strong text-pen-ink' : 'bg-sheet text-ink hover:bg-rule'}`}
                  onClick={() => setPicked(s)}
                >
                  {tm(cfg, s)}
                </button>
              )
            })}
          </div>
        )}
        <div className="mt-2.5 flex gap-1.5">
          {early ? (
            <button className="btn-primary min-h-[44px] flex-1" onClick={onInvite}>사람들 초대하기</button>
          ) : (
            <button className="btn-primary min-h-[44px] flex-1" onClick={() => onPick(w)}>이 시간으로 확정</button>
          )}
          {list.length > 1 && <button className="btn min-h-[44px] bg-sheet" onClick={onNext}>다른 시간 {(cand % list.length) + 1}/{list.length}</button>}
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2">
          {early ? <button className="border-0 bg-transparent p-1 text-[12px] font-semibold text-ink2 underline" onClick={() => onPick(w)}>그래도 이 시간으로 확정</button> : <span />}
          {onShowAll && (
            <button className="border-0 bg-transparent p-1 text-[12px] font-semibold text-accent" aria-expanded={showAll} onClick={onShowAll}>
              {showAll ? '후보 목록 접기' : `후보 전체 보기${result.all.length ? ` · 모두 가능 ${result.all.length}개` : ''}`}
            </button>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="note swap" key={swapKey}>
      <div className="font-display text-[22px] font-extrabold leading-tight tracking-[-.02em] text-accent">{w.all ? '이 시간 어때요? 다 돼요!' : '이 시간 어때요?'}</div>
      {early && (
        <p className="m-0 mt-2 rounded-[12px] bg-maybe-soft px-3 py-2 text-[13px] text-ink">
          아직 {n}명 중 {entered}명만 입력했어요. 더 모이면 추천이 바뀔 수 있어요.
        </p>
      )}
      {/* 날짜와 시간을 한 줄로 (좁으면 시간만 다음 줄로) */}
      <div className="when mt-2 flex flex-wrap items-baseline gap-x-2 font-display text-[23px] font-extrabold leading-tight">
        <span>{dayLabel(cfg, w.d)}</span>
        <span className="tabular whitespace-nowrap font-mono text-[21px] font-semibold tracking-tight">{timeText(cfg, w.s)}</span>
      </div>
      {span && <div className="mt-1.5 text-[13px] font-semibold text-accent">{span}</div>}
      {choices.length > 1 && (
        // 시작 시각: 드롭다운 대신 눌러서 고르는 시간 칩 (많으면 옆으로 넘겨요)
        <div className="mt-2.5">
          <div className="mb-1.5 text-xs font-semibold text-ink2">시작 시각 고르기</div>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="시작 시각">
            {choices.map((s) => {
              const on = s === w.s
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className={`tabular min-h-[36px] shrink-0 rounded-full border-0 px-3.5 font-mono text-[14px] font-semibold ${on ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`}
                  onClick={() => setPicked(s)}
                >
                  {tm(cfg, s)}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="mt-1.5 text-[13px] text-ink2">{summary(w, n)}</div>
      {/* 누가 되는지: 참여자 카드처럼 원형 아바타 (테두리·배지 색으로 가능/조율/불가/미입력) */}
      <ul ref={drag.ref} {...drag.handlers} className={`att -mx-1 m-0 mt-3 flex list-none gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${drag.className}`}>
        {['y', 'm', 'n', 'u'].flatMap((k) =>
          w.g[k].map((pid) => {
            const p = byId[pid]
            const st = STATUS[k]
            return (
              <li key={pid} className="flex w-[60px] shrink-0 flex-col items-center gap-0.5" title={`${p?.name || '이름 없음'}: ${STATUS_TITLE[k]}`}>
                <span className="relative">
                  <span className={`block rounded-full p-[2px] ${st.ring}`}>
                    <span className="block rounded-full bg-sheet p-[2px]">
                      <Avatar name={p?.name} url={p?.avatar_url} size={34} className={k === 'y' ? '' : 'opacity-60'} />
                    </span>
                  </span>
                  {st.mark && (
                    <span className={`absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-[10px] font-extrabold leading-none text-white ring-2 ring-sheet ${st.badge}`} aria-hidden="true">{st.mark}</span>
                  )}
                </span>
                <span className="w-full truncate text-center text-[12px] font-semibold leading-tight">{p?.name || '이름 없음'}</span>
                <span className="text-[10px] leading-tight text-ink2">{STATUS_TITLE[k]}</span>
              </li>
            )
          }),
        )}
        {w.missing > 0 && (
          <li className="flex w-[60px] shrink-0 flex-col items-center gap-0.5">
            <span className="grid h-[42px] w-[42px] place-items-center rounded-full border-2 border-dashed border-rule text-[12px] font-bold text-ink2">+{w.missing}</span>
            <span className="text-[10px] leading-tight text-ink2">아직 안 옴</span>
          </li>
        )}
      </ul>
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        {early ? (
          <>
            <button className="btn-primary" onClick={onInvite}>사람들 초대하기</button>
            {list.length > 1 && <button className="btn-soft" onClick={onNext}>다른 시간 {(cand % list.length) + 1}/{list.length}</button>}
            <button className="btn-ghost" onClick={() => onPick(w)}>그래도 이 시간으로 확정</button>
          </>
        ) : (
          <>
            <button className="btn-primary" onClick={() => onPick(w)}>이 시간으로 확정</button>
            {list.length > 1 && <button className="btn-soft" onClick={onNext}>다른 시간 {(cand % list.length) + 1}/{list.length}</button>}
            <button className="btn" onClick={() => onCopy(w)}>제안 문구 복사</button>
          </>
        )}
      </div>
    </div>
  )
}
