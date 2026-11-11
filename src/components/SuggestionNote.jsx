import { useEffect, useState } from 'react'
import { dayLabel, spanText, startChoices, summary, timeText, tm } from '../lib/schedule'
import Avatar from './Avatar'

const STATUS_TITLE = { y: '가능', m: '조율', n: '불가', u: '미입력' }
// 원형 아바타 테두리·배지
const STATUS = {
  y: { ring: 'bg-yes', badge: 'bg-yes', mark: '✓' },
  m: { ring: 'bg-maybe', badge: 'bg-maybe', mark: '~' },
  n: { ring: 'bg-no', badge: 'bg-no', mark: '✕' },
  u: { ring: 'bg-rule', badge: '', mark: '' },
}

export default function SuggestionNote({ cfg, result, list, cand, byId, onNext, onPick, onCopy, onInvite, swapKey }) {
  const { entered, n } = result
  // 연속 구간 안에서 고른 시작 칸 (추천이 바뀌면 처음으로)
  const [picked, setPicked] = useState(null)
  useEffect(() => setPicked(null), [swapKey])
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
        <label className="mt-2 flex items-center gap-2 text-[13px] text-ink2">
          시작 시각
          <select
            className="rounded-[10px] border-0 bg-rule2 px-2.5 py-1.5 text-[14px] font-semibold text-ink"
            value={w.s}
            onChange={(e) => setPicked(Number(e.target.value))}
          >
            {choices.map((s) => <option key={s} value={s}>{tm(cfg, s)}</option>)}
          </select>
        </label>
      )}
      <div className="mt-1.5 text-[13px] text-ink2">{summary(w, n)}</div>
      {/* 누가 되는지: 참여자 카드처럼 원형 아바타 (테두리·배지 색으로 가능/조율/불가/미입력) */}
      <ul className="att -mx-1 m-0 mt-3 flex list-none gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
