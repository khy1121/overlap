import { useEffect, useState } from 'react'
import { dayLabel, spanText, startChoices, timeText, tm } from '@overlap/core/schedule'
import Avatar from './Avatar'

// 아바타 테두리 색 = 이 시간에 가능 / 조율 / 불가 / 미입력
const RING = { y: 'bg-yes', m: 'bg-maybe', n: 'bg-rule', u: 'bg-rule' }
const LABEL = { y: '가능', m: '조율', n: '불가', u: '미입력' }

/**
 * 약속 화면(모바일) 맨 위 '좋은 시간' 카드 3개.
 * 결론부터 보여 주고, 카드를 누르면 펼쳐서 시작 시각 고르기 · 확정 · 문구 복사.
 * 히트맵 시간표는 이 아래에 '자세히'로 남아요.
 */
export default function TopTimes({ cfg, result, byId, onPick, onCopy, onInvite, onSelect, onWhen, showAll, onShowAll }) {
  const { entered, n } = result
  const top = result.rec.slice(0, 3)
  const [open, setOpen] = useState(0) // 펼친 카드
  const [start, setStart] = useState(null) // 펼친 카드에서 고른 시작 칸
  const key = top.map((w) => `${w.d}-${w.s}`).join('|')
  useEffect(() => { setOpen(0); setStart(null) }, [key])
  const cur = top[open]
  const w = cur ? { ...cur, s: start ?? cur.s } : null
  // ⋯ 메뉴의 '제안 문구 복사'가 지금 보고 있는 시간을 쓰게
  useEffect(() => { onWhen?.(w) }, [w?.d, w?.s, key]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!entered || !top.length) {
    return (
      <div className="rounded-md bg-pen-soft px-4 py-3">
        <div className="text-[13px] font-semibold text-accent">좋은 시간</div>
        <div className="mt-0.5 text-[15px] font-bold">{entered ? '아직 겹치는 시간이 없어요' : '아직 아무도 입력하지 않았어요'}</div>
        <div className="mt-0.5 text-[13px] text-ink2">{entered ? "'가능'·'조율' 칸이 더 모이면 골라 드릴게요." : '내 시간을 칠하고 사람들을 초대해 보세요.'}</div>
      </div>
    )
  }

  const early = entered * 2 < n // 입력한 사람이 절반 미만이면 초대를 먼저 권해요
  const names = (ids) => ids.map((id) => byId[id]?.name || '이름 없음').join(', ')
  return (
    <section className="flex flex-col gap-2" aria-label="좋은 시간">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="m-0 text-[14px] font-bold text-ink2">좋은 시간</h2>
        {early && <span className="text-[12px] text-ink2">{n}명 중 {entered}명 입력 · 더 모이면 바뀔 수 있어요</span>}
      </div>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {top.map((c, i) => {
          const isOpen = i === open
          const yes = c.g.y.length
          const extra = [c.g.m.length && `${names(c.g.m)} 조율`, c.g.n.length && `${names(c.g.n)} 불가`, c.g.u.length + c.missing && `${c.g.u.length + c.missing}명 미입력`].filter(Boolean)
          const shown = isOpen ? w : c
          const choices = isOpen ? startChoices(cfg, c) : []
          const span = isOpen ? spanText(cfg, c) : ''
          return (
            <li key={`${c.d}-${c.s}`} className={`rounded-md bg-sheet ${isOpen ? 'ring-2 ring-pen' : ''}`}>
              <button
                type="button"
                className="flex w-full items-center gap-3 border-0 bg-transparent px-3.5 py-3 text-left"
                aria-expanded={isOpen}
                onClick={() => { setOpen(i); setStart(null); onSelect?.(c) }}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-bold ${i === 0 ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink2'}`}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">
                    {dayLabel(cfg, shown.d)} <span className="tabular font-mono">{timeText(cfg, shown.s)}</span>
                  </span>
                  <span className="block truncate text-[12px] text-ink2">
                    {c.all ? (yes >= n ? `${n}명 모두 가능` : `꼭 오는 사람 모두 가능 · ${yes}/${n}명`) : `${yes}/${n}명 가능`}{extra.length ? ` · ${extra.join(' · ')}` : ''}
                  </span>
                </span>
              </button>
              {/* 누가 되는지: 아바타 테두리 색 */}
              <ul className="-mt-1 m-0 flex list-none gap-1 overflow-x-auto px-3.5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="이 시간에 되는 사람">
                {['y', 'm', 'n', 'u'].flatMap((k) =>
                  c.g[k].map((pid) => (
                    <li key={pid} className="shrink-0" title={`${byId[pid]?.name || '이름 없음'}: ${LABEL[k]}`}>
                      <span className={`block rounded-full p-[2px] ${RING[k]}`}>
                        <Avatar name={byId[pid]?.name} url={byId[pid]?.avatar_url} size={24} className={k === 'y' ? '' : 'opacity-50'} />
                      </span>
                      <span className="sr-only">{byId[pid]?.name || '이름 없음'} {LABEL[k]}</span>
                    </li>
                  )),
                )}
              </ul>
              {isOpen && (
                <div className="flex flex-col gap-2 border-t border-rule2 px-3.5 py-3">
                  {span && <div className="text-[12px] font-semibold text-accent">{span}</div>}
                  {choices.length > 1 && (
                    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="시작 시각">
                      {choices.map((s) => (
                        <button
                          key={s}
                          type="button"
                          role="radio"
                          aria-checked={s === w.s}
                          className={`tabular min-h-[32px] shrink-0 rounded-full border-0 px-3 font-mono text-[13px] font-semibold ${s === w.s ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink'}`}
                          onClick={() => setStart(s)}
                        >
                          {tm(cfg, s)}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    {early ? (
                      <button className="btn-primary min-h-[44px] flex-1" onClick={onInvite}>사람들 초대하기</button>
                    ) : (
                      <button className="btn-primary min-h-[44px] flex-1" onClick={() => onPick(w)}>이 시간으로 확정</button>
                    )}
                    <button className="btn min-h-[44px]" onClick={() => onCopy(w)}>문구 복사</button>
                  </div>
                  {early && <button className="self-start border-0 bg-transparent p-1 text-[12px] font-semibold text-ink2 underline" onClick={() => onPick(w)}>그래도 이 시간으로 확정</button>}
                </div>
              )}
            </li>
          )
        })}
      </ol>
      {onShowAll && (
        <button className="self-end border-0 bg-transparent p-1 text-[12px] font-semibold text-accent" aria-expanded={showAll} onClick={onShowAll}>
          {showAll ? '후보 목록 접기' : `후보 전체 보기${result.all.length ? ` · 모두 가능 ${result.all.length}개` : ''}`}
        </button>
      )}
    </section>
  )
}
