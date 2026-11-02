import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMeeting } from '../hooks/useMeeting'
import { useToast } from '../hooks/useToast'
import { useMedia } from '../hooks/useMedia'
import { GOOGLE_CLIENT_ID, requestCalendarToken } from '../lib/googleCalendar'
import { copyText } from '../lib/copy'
import { BRUSH_LABEL, DUR_LABEL, dayLabel, evaluate, md, nSlots, summary, tm } from '../lib/schedule'
import CalendarImport from './CalendarImport'
import InvitePanel from './InvitePanel'
import Palette from './Palette'
import PeopleBar from './PeopleBar'
import SettingsBar from './SettingsBar'
import SlotList from './SlotList'
import SuggestionNote from './SuggestionNote'
import TimeGrid from './TimeGrid'

export default function Board({ mid, session }) {
  const toast = useToast()
  const m = useMeeting(mid, toast)
  const { cfg, people, myPid, live, updateCfg, updatePerson } = m

  const [mode, setMode] = useState('edit')
  const [brush, setBrush] = useState('y')
  const [sel, setSel] = useState(null)
  const [cand, setCand] = useState(0)
  const [editing, setEditing] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [calToken, setCalToken] = useState(null)
  const [calOpen, setCalOpen] = useState(false)
  const [announce, setAnnounce] = useState('')
  // 모바일·터치: 스크롤하다 칸이 칠해지지 않게 '내 시간 입력'을 눌러야 칠할 수 있어요.
  const lockable = useMedia('(max-width: 767px), (pointer: coarse)')
  const [painting, setPainting] = useState(false)
  const paintOn = !lockable || painting

  const link = `${window.location.origin}/?m=${mid}`
  const uid = session.user.id
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])
  // 일정은 각자 본인 것만 입력·수정·삭제할 수 있어요 (서버 RLS도 같은 규칙).
  const tgt = myPid
  const targetPerson = byId[tgt]
  const canEdit = useCallback((pid) => Boolean(byId[pid] && byId[pid].user_id === uid), [byId, uid])

  // 처음 열렸을 때: 새 회의면 초대 창
  useEffect(() => {
    if (m.status !== 'ready') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('new')) {
      window.history.replaceState(null, '', `/?m=${mid}`)
      setInviteOpen(true)
      toast('회의를 만들었어요. 사람들을 초대해 보세요.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.status])

  useEffect(() => {
    if (cfg) document.title = `${cfg.title} · Overlap`
  }, [cfg])

  // 숫자 키로 칠하기 도구 바꾸기
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input,select,textarea')) return
      const b = { 1: 'y', 2: 'm', 3: 'n', 0: '' }[e.key]
      if (b !== undefined && mode === 'edit' && paintOn) setBrush(b)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode, paintOn])

  const commitCells = useCallback((next) => {
    if (tgt) updatePerson(tgt, { cells: next })
  }, [tgt, updatePerson])

  const onCalExpired = useCallback(() => setCalToken(null), [])

  if (m.status === 'loading') return <div className="grid min-h-[40vh] place-items-center text-ink2">회의를 불러오는 중…</div>
  if (m.status === 'error') {
    const msg = m.error === 'not_found' ? '링크가 정확한지 확인해 주세요.' : m.error === 'deleted' ? '이 회의는 삭제됐어요.' : `잠시 후 다시 시도해 주세요. (${m.error})`
    return (
      <section className="sheet mx-auto mt-6 max-w-[460px]">
        <h1 className="mb-1 font-display text-[28px] font-extrabold">회의를 열 수 없어요</h1>
        <p className="small">{msg} <a href="/" className="text-pen">홈으로</a></p>
      </section>
    )
  }

  const result = evaluate(cfg, people)
  const list = result.all.length ? result.all : result.rec
  const n = result.n

  function fill(keys) {
    if (!canEdit(tgt)) return
    const cells = targetPerson.cells
    const clear = brush && keys.every((k) => cells[k] === brush)
    const next = { ...cells }
    keys.forEach((k) => { if (clear || !brush) delete next[k]; else next[k] = brush })
    commitCells(next)
    toast(clear || !brush ? '지웠어요' : `${{ y: '가능으로', m: '조율 가능으로', n: '불가로' }[brush]} 칠했어요`)
  }

  function selectPerson(pid) {
    if (!canEdit(pid)) {
      setMode('all')
      setPainting(false)
      toast(`${byId[pid]?.name || '그 사람'}님의 일정은 본인만 입력할 수 있어요`)
      return
    }
    if (mode === 'edit') return setEditing(pid)
    setMode('edit')
  }

  function noticeText(w, dur, final) {
    const head = `${cfg.title} 시간 ${final ? '확정' : '제안'}\n${dayLabel(cfg, w.d)} ${tm(cfg, w.s)}–${tm(cfg, w.s + dur)}`
    if (final) return `${head}\n이 시간으로 진행할게요!\n${link}`
    return `${head}\n(${summary(w, n)})\n이 시간 어때요?\n${link}`
  }
  const copy = async (text) => toast((await copyText(text)) ? '복사했어요' : '복사하지 못했어요')

  async function startCalendar() {
    if (calToken) return setCalOpen(true)
    try {
      setCalToken(await requestCalendarToken())
      setCalOpen(true)
    } catch (e) {
      toast(e.message)
    }
  }

  const picked = cfg.picked && cfg.picked.d <= 6 && cfg.picked.s + cfg.picked.dur <= nSlots(cfg) ? cfg.picked : null
  const selDetail = mode === 'all' && sel
    ? ['y', 'm', 'n', 'u'].map((k) => [k, people.filter((p) => (p.cells[`${sel.d}-${sel.s}`] || 'u') === k)]).filter(([, ps]) => ps.length)
    : null

  return (
    <div className={`flex flex-col gap-[18px] ${lockable ? 'pb-24' : ''}`}>
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-[1_1_320px]">
          <input
            key={cfg.title}
            aria-label="회의 이름"
            maxLength={40}
            defaultValue={cfg.title}
            className="w-full max-w-[560px] border-0 border-b-2 border-transparent bg-transparent p-0 font-display text-[clamp(26px,4.4vw,36px)] font-extrabold tracking-tight hover:border-rule focus:border-rule focus-visible:border-pen focus-visible:outline-none"
            onBlur={(e) => {
              const v = e.target.value.trim() || '우리 회의 언제?'
              if (v !== cfg.title) updateCfg({ title: v })
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
          <div className="mt-0.5 text-sm text-ink2">
            <span className="tabular font-mono text-ink">{md(cfg, 0)} – {md(cfg, 6)}</span>
            {` · ${cfg.count}명 예상 · ${DUR_LABEL[cfg.dur] || `${cfg.dur * 30}분`} 회의 · `}
            <span className="tabular font-mono text-ink">{String(cfg.from).padStart(2, '0')}:00–{String(cfg.to).padStart(2, '0')}:00</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-xs text-ink2" role="status">
            <span className={`h-[7px] w-[7px] rounded-full ${live === 'live' ? 'bg-yes shadow-[0_0_0_3px_var(--yes-soft)]' : live === 'off' ? 'bg-no' : 'bg-ink2'}`} />
            {live === 'live' ? '실시간 공유 중' : live === 'off' ? '연결 끊김 · 새로고침해 주세요' : '연결 중…'}
          </span>
          <button className="btn-primary" onClick={() => setInviteOpen((o) => !o)}>초대하기</button>
        </div>
      </header>

      <SettingsBar cfg={cfg} onChange={(patch) => { setCand(0); updateCfg(patch) }} onInvalid={toast} />

      {inviteOpen && <InvitePanel mid={mid} cfg={cfg} link={link} onClose={() => setInviteOpen(false)} />}

      {picked && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md bg-pen-strong px-4 py-3 text-pen-ink">
          <div>
            <div className="text-xs opacity-85">확정된 회의 시간</div>
            <strong className="font-display text-xl font-extrabold">{dayLabel(cfg, picked.d)} {tm(cfg, picked.s)}–{tm(cfg, picked.s + picked.dur)}</strong>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button className="btn btn-sm bg-[color-mix(in_oklab,var(--pen-ink)_18%,transparent)] text-pen-ink hover:bg-[color-mix(in_oklab,var(--pen-ink)_28%,transparent)]" onClick={() => copy(noticeText(picked, picked.dur, true))}>공지 문구 복사</button>
            <button className="btn btn-sm bg-transparent text-pen-ink hover:bg-[color-mix(in_oklab,var(--pen-ink)_18%,transparent)]" onClick={() => updateCfg({ picked: null })}>확정 취소</button>
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 min-[920px]:grid-cols-[minmax(0,1fr)_340px]">
        <section className="sheet" aria-label="시간 입력">
          <PeopleBar
            people={people}
            myPid={myPid}
            target={tgt}
            mode={mode}
            n={n}
            canEdit={canEdit}
            editing={editing}
            setEditing={setEditing}
            onSelect={selectPerson}
            onRename={(pid, name) => {
              setEditing(null)
              if (byId[pid] && byId[pid].name !== name) updatePerson(pid, { name })
            }}
          />

          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="inline-flex gap-1 rounded-full bg-rule2 p-1" role="group" aria-label="보기">
              {[['edit', '시간 입력'], ['all', '전체 겹쳐 보기']].map(([k, label]) => (
                <button
                  key={k}
                  aria-pressed={mode === k}
                  className={`min-h-[34px] rounded-full border-0 px-3.5 text-[13px] font-semibold ${mode === k ? 'bg-sheet text-ink shadow-soft' : 'bg-transparent text-ink2 hover:text-ink'}`}
                  onClick={() => { setMode(k); if (k === 'all') setPainting(false) }}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === 'edit' && paintOn && targetPerson && Object.keys(targetPerson.cells).length > 0 && canEdit(tgt) && (
              <button
                className="btn-ghost btn-sm text-no hover:text-no"
                onClick={() => {
                  const prev = targetPerson.cells
                  const pid = tgt
                  updatePerson(pid, { cells: {} })
                  toast('내 입력을 지웠어요', { label: '되돌리기', run: () => updatePerson(pid, { cells: prev }) })
                }}
              >
                내 입력 지우기
              </button>
            )}
          </div>

          {mode === 'edit' && !lockable && (
            <div className="sticky z-[5] mb-1 bg-sheet py-2" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
              <Palette brush={brush} setBrush={setBrush} />
            </div>
          )}
          {mode === 'edit' && (
            <>
              {calOpen && calToken && (
                <CalendarImport
                  cfg={cfg}
                  token={calToken}
                  cells={byId[myPid]?.cells || {}}
                  onExpired={onCalExpired}
                  onClose={() => setCalOpen(false)}
                  onApply={(next, changed) => {
                    updatePerson(myPid, { cells: next })
                    setCalOpen(false)
                    toast(changed ? `캘린더 내용을 ${changed}칸에 반영했어요` : '바뀐 칸이 없어요')
                  }}
                />
              )}
              <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink2">
                {GOOGLE_CLIENT_ID && (
                  <button className="btn" onClick={startCalendar}>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    내 Google 캘린더에서 바쁜 시간 가져오기
                  </button>
                )}

                <span>
                  {paintOn
                    ? lockable
                      ? '칸을 누르거나 드래그해서 칠해요. 스크롤은 왼쪽 시간 눈금을 잡고 하세요.'
                      : '칸을 누르거나 드래그해서 칠해요. 요일·시간을 누르면 그 줄 전체가 칠해져요.'
                    : '아래 ‘입력’ 버튼을 누르면 칠할 수 있어요. 그 전에는 마음껏 스크롤해도 돼요.'}
                </span>
              </div>
            </>
          )}

          <TimeGrid
            cfg={cfg}
            people={people}
            mode={mode}
            cells={targetPerson?.cells || {}}
            canPaint={canEdit(tgt) && paintOn}
            onLockedTap={canEdit(tgt) ? () => toast('아래 ‘입력’ 버튼을 누르면 칠할 수 있어요') : undefined}
            brush={brush}
            sel={sel}
            onSelect={setSel}
            onCommit={commitCells}
            onFill={fill}
            onAnnounce={(c) => {
              const v = targetPerson?.cells[`${c.d}-${c.s}`]
              setAnnounce(`${dayLabel(cfg, c.d)} ${tm(cfg, c.s)}${mode === 'edit' ? ` ${BRUSH_LABEL[v] || '미입력'}` : ''}`)
            }}
          />

          <div className="mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-ink2">
            {mode === 'edit' ? (
              <>
                <span className="inline-flex items-center gap-1.5"><i className="sw y" />가능</span>
                <span className="inline-flex items-center gap-1.5"><i className="sw m" />조율 가능</span>
                <span className="inline-flex items-center gap-1.5"><i className="sw n" />불가</span>
                <span className="inline-flex items-center gap-1.5"><i className="sw e" />미입력</span>
                <span>같은 색으로 다시 칠하면 지워져요</span>
              </>
            ) : (
              <>
                <span>가능한 사람</span>
                <span className="font-mono">0</span>
                <span className="inline-block h-2.5 w-[90px] rounded-sm bg-[linear-gradient(90deg,var(--cell),var(--yes))]" />
                <span className="font-mono">{n}명</span>
                <span>칸을 누르면 누가 되는지 보여요</span>
              </>
            )}
          </div>

          {mode === 'all' && (
            <div className="mt-3 min-h-[44px] border-t border-dashed border-rule pt-2.5 text-[13px]" aria-live="polite">
              {!sel ? (
                '칸을 눌러 그 시간에 누가 되는지 확인하세요.'
              ) : (
                <>
                  <b className="font-mono font-semibold">{dayLabel(cfg, sel.d)} {tm(cfg, sel.s)}–{tm(cfg, sel.s + 1)}</b>
                  <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1">
                    {selDetail.map(([k, ps]) => (
                      <span key={k} className="inline-flex items-center gap-1.5">
                        <i className={`sw ${k === 'u' ? 'e' : k}`} />
                        {{ y: '가능', m: '조율', n: '불가', u: '미입력' }[k]}: {ps.map((p) => p.name || '이름 없음').join(', ')}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        <aside id="suggest" className="flex scroll-mt-4 flex-col gap-5">
          <SuggestionNote
            cfg={cfg}
            result={result}
            list={list}
            cand={cand}
            byId={byId}
            swapKey={list.length ? `${list[cand % list.length].d}-${list[cand % list.length].s}-${cfg.dur}` : 'none'}
            onNext={() => setCand((c) => c + 1)}
            onPick={(w) => {
              updateCfg({ picked: { d: w.d, s: w.s, dur: cfg.dur } })
              toast('확정했어요. 모두에게 보여요.')
            }}
            onCopy={(w) => copy(noticeText(w, cfg.dur, false))}
          />
          <SlotList
            title="모두 가능한 시간"
            count={result.all.length}
            hint="전원이 '가능'으로 표시한 시간이에요."
            items={result.all}
            empty={result.entered ? '전원이 되는 시간은 아직 없어요. 아래 추천 시간을 확인해 보세요.' : '입력이 모이면 여기에 나타나요.'}
            cfg={cfg}
            n={n}
            byId={byId}
            onOpen={(w) => {
              setMode('all')
              setSel({ d: w.d, s: w.s })
              const i = list.findIndex((x) => x.d === w.d && x.s === w.s)
              if (i >= 0) setCand(i)
            }}
          />
          <SlotList
            title="추천 시간"
            hint="가능한 사람이 많고 불가가 적은 순서예요. '조율'은 반만 쳐요."
            items={result.rec}
            empty="입력이 모이면 여기에 나타나요."
            cfg={cfg}
            n={n}
            byId={byId}
            onOpen={(w) => {
              setMode('all')
              setSel({ d: w.d, s: w.s })
              const i = list.findIndex((x) => x.d === w.d && x.s === w.s)
              if (i >= 0) setCand(i)
            }}
          />
        </aside>
      </div>
      {lockable && (
        <MobileBar
          painting={painting}
          canPaint={canEdit(tgt)}
          brush={brush}
          setBrush={setBrush}
          best={result.entered && list.length ? list[cand % list.length] : null}
          bestText={(w) => `${dayLabel(cfg, w.d)} ${tm(cfg, w.s)}`}
          bestCount={(w) => `${w.g.y.length + w.g.m.length}/${n}명`}
          onStart={() => { setMode('edit'); setPainting(true) }}
          onDone={() => { setPainting(false); toast('저장했어요') }}
          onBest={() => document.getElementById('suggest')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        />
      )}
      <div className="sr-only" aria-live="polite">{announce}</div>
    </div>
  )
}

/** 모바일 하단 고정 바: 평소엔 추천 시간 + '시간 입력', 입력 중엔 칠하기 도구 + '완료'. */
function MobileBar({ painting, canPaint, brush, setBrush, best, bestText, bestCount, onStart, onDone, onBest }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-[color-mix(in_oklab,var(--sheet)_92%,transparent)] px-3 pt-2.5 shadow-[0_-8px_24px_-12px_rgba(42,40,56,.18)] backdrop-blur"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))' }}
    >
      {painting ? (
        <div className="mx-auto flex max-w-[560px] items-center gap-2">
          <Palette brush={brush} setBrush={setBrush} compact className="min-w-0 flex-1" />
          <button type="button" className="btn-primary min-h-[44px] px-4" onClick={onDone}>완료</button>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[560px] items-center gap-2">
          {best ? (
            <button type="button" className="btn-ghost min-h-[44px] min-w-0 flex-1 justify-start px-2 text-left" onClick={onBest}>
              <span className="min-w-0">
                <span className="block text-[11px] font-medium text-ink2">추천 시간</span>
                <span className="block truncate text-sm text-ink">{bestText(best)} <span className="text-ink2">· {bestCount(best)}</span></span>
              </span>
            </button>
          ) : (
            <span className="min-w-0 flex-1 px-2 text-[13px] text-ink2">되는 시간을 칠하면 추천해 드려요</span>
          )}
          {canPaint && (
            <button type="button" className="btn-primary min-h-[44px] px-4" onClick={onStart}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              내 시간 입력
            </button>
          )}
        </div>
      )}
    </div>
  )
}
