import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMeeting } from '../hooks/useMeeting'
import { useToast } from '../hooks/useToast'
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
  const { cfg, people, myPid, live, updateCfg, updatePerson, addGuest, removePerson } = m

  const [mode, setMode] = useState('edit')
  const [brush, setBrush] = useState('y')
  const [target, setTarget] = useState(null)
  const [sel, setSel] = useState(null)
  const [cand, setCand] = useState(0)
  const [editing, setEditing] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [calToken, setCalToken] = useState(null)
  const [calOpen, setCalOpen] = useState(false)
  const [announce, setAnnounce] = useState('')

  const link = `${window.location.origin}/?m=${mid}`
  const uid = session.user.id
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])
  const isOwner = cfg?.owner === uid
  const tgt = byId[target] ? target : myPid
  const targetPerson = byId[tgt]

  const canEdit = useCallback((pid) => {
    const p = byId[pid]
    return Boolean(p && (p.user_id === uid || !p.user_id || isOwner))
  }, [byId, uid, isOwner])
  const canRemove = useCallback((pid) => {
    const p = byId[pid]
    return Boolean(p && pid !== myPid && (!p.user_id || isOwner))
  }, [byId, myPid, isOwner])

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
      if (b !== undefined && mode === 'edit') setBrush(b)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mode])

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
      toast(`${byId[pid]?.name || '그 사람'}님의 시간은 본인만 고칠 수 있어요`)
      return
    }
    if (pid === tgt && mode === 'edit') return setEditing(pid)
    setTarget(pid)
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
    <div className="flex flex-col gap-[18px]">
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
            canRemove={canRemove}
            editing={editing}
            setEditing={setEditing}
            onSelect={selectPerson}
            onRename={(pid, name) => {
              setEditing(null)
              if (byId[pid] && byId[pid].name !== name) updatePerson(pid, { name })
            }}
            onRemove={async (pid) => {
              setEditing(null)
              if (await removePerson(pid)) {
                setTarget(myPid)
                toast('참여자를 뺐어요')
              }
            }}
            onAddGuest={async () => {
              const id = await addGuest()
              if (id) {
                setTarget(id)
                setMode('edit')
                setEditing(id)
              }
            }}
          />

          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="inline-flex gap-1 rounded-full bg-rule2 p-1" role="group" aria-label="보기">
              {[['edit', '시간 입력'], ['all', '전체 겹쳐 보기']].map(([k, label]) => (
                <button
                  key={k}
                  aria-pressed={mode === k}
                  className={`min-h-[34px] rounded-full border-0 px-3.5 text-[13px] font-semibold ${mode === k ? 'bg-sheet text-ink shadow-soft' : 'bg-transparent text-ink2 hover:text-ink'}`}
                  onClick={() => setMode(k)}
                >
                  {label}
                </button>
              ))}
            </div>
            {mode === 'edit' && targetPerson && Object.keys(targetPerson.cells).length > 0 && canEdit(tgt) && (
              <button
                className="link-btn"
                onClick={() => {
                  const prev = targetPerson.cells
                  const pid = tgt
                  updatePerson(pid, { cells: {} })
                  toast(`${targetPerson.name || '이 사람'}님의 입력을 지웠어요`, { label: '되돌리기', run: () => updatePerson(pid, { cells: prev }) })
                }}
              >
                이 사람 입력 모두 지우기
              </button>
            )}
          </div>

          {mode === 'edit' && (
            <>
              <Palette brush={brush} setBrush={setBrush} />
              {calOpen && calToken && (
                <CalendarImport
                  cfg={cfg}
                  token={calToken}
                  cells={byId[myPid]?.cells || {}}
                  onExpired={onCalExpired}
                  onClose={() => setCalOpen(false)}
                  onApply={(next, changed) => {
                    updatePerson(myPid, { cells: next })
                    setTarget(myPid)
                    setCalOpen(false)
                    toast(changed ? `캘린더 내용을 ${changed}칸에 반영했어요` : '바뀐 칸이 없어요')
                  }}
                />
              )}
              <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink2">
                {tgt === myPid && GOOGLE_CLIENT_ID && (
                  <button className="btn" onClick={startCalendar}>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    내 Google 캘린더에서 바쁜 시간 가져오기
                  </button>
                )}
                <span>{tgt === myPid ? '내 시간을 입력하는 중이에요.' : `${targetPerson?.name || '이름 없음'}님 대신 입력하는 중이에요.`}</span>
                <span>칸을 누르거나 드래그해서 칠해요. 요일·시간을 누르면 그 줄 전체가 칠해져요.</span>
              </div>
            </>
          )}

          <TimeGrid
            cfg={cfg}
            people={people}
            mode={mode}
            cells={targetPerson?.cells || {}}
            canPaint={canEdit(tgt)}
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

        <aside className="flex flex-col gap-5">
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
      <div className="sr-only" aria-live="polite">{announce}</div>
    </div>
  )
}
