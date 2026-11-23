import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMeeting } from '../hooks/useMeeting'
import { useToast } from '../hooks/useToast'
import { useMedia } from '../hooks/useMedia'
import { GOOGLE_CLIENT_ID, requestCalendarToken } from '../lib/googleCalendar'
import { copyText } from '../lib/copy'
import { myRequests, requestFriend, resultText } from '../lib/friends'
import { deleteMeeting, leaveMeeting } from '../lib/meetings'
import { APP_ORIGIN } from '../lib/site'
import { supabase } from '../lib/supabase'
import { BRUSH_LABEL, briefRange, dayLabel, durText, evaluate, nDays, nSlots, rangeText, summary, timeText, tm } from '../lib/schedule'
import BoardMenu from './BoardMenu'
import CalendarImport from './CalendarImport'
import InvitePanel from './InvitePanel'
import Palette from './Palette'
import PeopleBar from './PeopleBar'
import PlacePanel from './PlacePanel'
import { BackButton } from './PageHeader'
import SettingsBar from './SettingsBar'
import SlotList from './SlotList'
import SuggestionNote from './SuggestionNote'
import TimeGrid from './TimeGrid'
import TopTimes from './TopTimes'

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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [placeOpen, setPlaceOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [chosen, setChosen] = useState(null) // 추천 카드에서 지금 보고 있는 후보(시작 시각 칩 반영)
  const [showAll, setShowAll] = useState(false) // 모바일: 후보 목록 펼침
  const [reconsider, setReconsider] = useState(false) // 확정 후 '다른 시간 보기'
  // 좁은 화면: 탭 없이 한 화면에 [추천 카드 → 시간표]. 장소는 누르면 시간표 자리를 대신해요.
  // 넓은 화면: 시간표 옆에 추천·목록·장소 카드를 나란히.
  const narrow = useMedia('(max-width: 919px)')
  const [calToken, setCalToken] = useState(null)
  const [calOpen, setCalOpen] = useState(false)
  const [announce, setAnnounce] = useState('')
  // 다른 참여자와의 관계: user_id → 'friend' | 'pending'(내가 신청함) | 'incoming'(받은 신청)
  const [rel, setRel] = useState({})
  useEffect(() => {
    Promise.all([supabase.rpc('my_friends'), myRequests()]).then(([f, reqs]) => {
      const map = {}
      for (const x of f.data || []) map[x.user_id] = 'friend'
      for (const r of reqs) if (!map[r.user_id]) map[r.user_id] = r.direction === 'out' ? 'pending' : 'incoming'
      setRel(map)
    })
  }, [mid])
  async function addFriend(p) {
    try {
      const result = await requestFriend(p.user_id)
      setRel((m) => ({ ...m, [p.user_id]: result === 'sent' || result === 'pending' ? 'pending' : 'friend' }))
      toast(resultText(result, p.name))
    } catch (e) {
      toast(e.message)
    }
  }
  // 모바일·터치는 하단 고정 바, 데스크톱은 시간표 위 도구 막대를 써요.
  const lockable = useMedia('(max-width: 767px), (pointer: coarse)')
  // 내 시간 칠하기: '내 일정' 보기에서 바로 칠하고, 손을 뗀 뒤 잠깐 모았다가 자동 저장해요.
  // draft = 화면에 보이는 내 칸(저장 전 포함). null이면 칠하는 중이 아니에요.
  const [draft, setDraft] = useState(null)
  const paintOn = draft !== null
  const [undoStack, setUndoStack] = useState([]) // 되돌리기용 이전 상태들 (최근 것이 끝)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const flushRef = useRef(null)
  const draftRef = useRef(null) // 드래그 결과를 반영할 때 지금 draft를 읽으려고
  draftRef.current = draft

  const link = `${APP_ORIGIN}/?m=${mid}` // 초대·공지에 넣는 링크 (로컬에서도 배포 주소)
  const uid = session.user.id
  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people])
  // 일정은 각자 본인 것만 입력·수정·삭제할 수 있어요 (서버 RLS도 같은 규칙).
  const tgt = myPid
  const canEdit = useCallback((pid) => Boolean(byId[pid] && byId[pid].user_id === uid), [byId, uid])
  const myCells = byId[myPid]?.cells || {}
  const hasMine = Object.keys(myCells).length > 0
  const dirty = paintOn && JSON.stringify(draft) !== JSON.stringify(myCells)
  // 편집 중에는 내 칸을 draft로 바꿔 끼워서 추천·겹쳐 보기에도 바로 반영해요.
  const shownPeople = useMemo(
    () => (paintOn ? people.map((p) => (p.id === myPid ? { ...p, cells: draft } : p)) : people),
    [people, paintOn, draft, myPid],
  )

  // 자동 저장: 마지막으로 칠하고 0.8초 뒤에 한 번 (칠하는 동안 서버에 여러 번 보내지 않게)
  useEffect(() => {
    if (!dirty) { flushRef.current = null; return }
    setSaveState('saving')
    const save = () => { updatePerson(myPid, { cells: draft }); setSaveState('saved') }
    const t = setTimeout(save, 800)
    flushRef.current = () => { clearTimeout(t); save() }
    return () => clearTimeout(t)
  }, [draft, dirty, myPid, updatePerson])

  // 폰에서 다른 앱으로 가거나 화면이 꺼지면 기다리지 않고 바로 저장
  useEffect(() => {
    const now = () => { if (document.visibilityState === 'hidden') flushRef.current?.() }
    document.addEventListener('visibilitychange', now)
    return () => document.removeEventListener('visibilitychange', now)
  }, [])

  // 저장 대기 중(0.8초 안)에 페이지를 떠나려 하면 확인
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // 처음 열렸을 때: 새 회의면 초대 창
  useEffect(() => {
    if (m.status !== 'ready') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('new')) {
      window.history.replaceState(null, '', `/?m=${mid}`)
      setInviteOpen(true)
      const invited = Number(params.get('invited')) || 0
      const failed = Number(params.get('failed')) || 0 // 새 약속 화면에서 초대하지 못한 친구 수
      const head = invited ? `약속을 만들고 친구 ${invited}명을 초대했어요` : '약속을 만들었어요'
      toast(failed ? `${head}. 친구 ${failed}명은 초대하지 못했어요. 초대 창에서 다시 초대해 주세요.` : invited ? head : `${head}. 함께할 사람들을 초대해 보세요.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.status])

  // 처음 열 때: 이미 칠했으면 '모두 겹쳐 보기'(추천과 함께 보는 화면),
  // 아직 안 칠했고 확정 전이면 바로 칠하기 모드로 열어서 '내 일정 등록'을 한 번 덜 누르게 해요.
  const modeInit = useRef(false)
  useEffect(() => {
    if (m.status !== 'ready' || !myPid || modeInit.current) return
    modeInit.current = true
    if (Object.keys(byId[myPid]?.cells || {}).length) setMode('all')
    else if (canEdit(myPid) && !cfg?.picked) setDraft({})
  }, [m.status, myPid, byId, canEdit, cfg])

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

  // 편집 중일 때만 반영 (편집이 끝난 뒤 늦게 도착한 드래그 결과는 버려요)
  const commitCells = useCallback((next) => {
    const prev = draftRef.current
    if (prev === null) return
    setUndoStack((st) => [...st.slice(-29), prev])
    setDraft(next)
  }, [])

  const onCalExpired = useCallback(() => setCalToken(null), [])

  if (m.status === 'loading') return <div className="grid min-h-[40vh] place-items-center text-ink2">약속을 불러오는 중…</div>
  if (m.status === 'error') {
    const msg = m.error === 'not_found' ? '링크가 정확한지 확인해 주세요.' : m.error === 'deleted' ? '이 약속은 삭제됐어요.' : `잠시 후 다시 시도해 주세요. (${m.error})`
    return (
      <section className="sheet mx-auto mt-6 max-w-[460px]">
        <h1 className="mb-1 font-display text-[28px] font-extrabold">약속을 열 수 없어요</h1>
        <p className="small">{msg} <a href="/" className="text-pen">홈으로</a></p>
      </section>
    )
  }

  const result = evaluate(cfg, shownPeople)
  const list = result.all.length ? result.all : result.rec
  const n = result.n

  // 칠하기 결과를 반영 (되돌리기 목록에 이전 상태를 쌓아요)
  function applyDraft(next) {
    setUndoStack((st) => [...st.slice(-29), draft])
    setDraft(next)
  }
  function fill(keys) {
    if (!paintOn) return
    const clear = brush && keys.every((k) => draft[k] === brush)
    const next = { ...draft }
    keys.forEach((k) => { if (clear || !brush) delete next[k]; else next[k] = brush })
    applyDraft(next)
  }
  function undo() {
    const prev = undoStack[undoStack.length - 1]
    if (!prev) return
    setUndoStack((st) => st.slice(0, -1))
    setDraft(prev)
  }

  // '내 일정'으로 들어가면 바로 칠할 수 있어요 (등록 버튼 없음)
  function startEdit() {
    setMode('edit')
    setSel(null)
    setPlaceOpen(false)
    if (draft === null && canEdit(myPid)) { setDraft({ ...myCells }); setUndoStack([]); setSaveState('idle') }
  }
  // 다 칠했으면 남은 저장을 바로 보내고 겹쳐 보기로
  function finishEdit() {
    flushRef.current?.()
    setDraft(null)
    setUndoStack([])
    setCalOpen(false)
    setMode('all')
  }
  const editLabel = hasMine ? '내 시간 고치기' : '내 시간 칠하기'
  const saveText = saveState === 'saving' ? '저장 중…' : saveState === 'saved' ? '저장됨 ✓' : '칠하면 바로 저장돼요'

  function selectPerson(pid) {
    if (!canEdit(pid)) {
      if (!paintOn) setMode('all')
      toast(`${byId[pid]?.name || '그 사람'}님의 일정은 본인만 입력할 수 있어요`)
      return
    }
    if (mode === 'edit') return setEditing(pid)
    startEdit()
  }

  function noticeText(w, dur, final) {
    const head = `${cfg.title} 시간 ${final ? '확정' : '제안'}\n${dayLabel(cfg, w.d)} ${timeText(cfg, w.s, dur)}`
    if (final) {
      const where = cfg.place ? `\n장소: ${cfg.place.name}${cfg.place.station ? ` (${cfg.place.station} 근처)` : ''}\n${cfg.place.url}` : ''
      return `${head}${where}\n이 시간에 만나요!\n${link}`
    }
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

  const picked = cfg.picked && cfg.picked.d < nDays(cfg) && cfg.picked.s + (cfg.picked.dur || 1) <= nSlots(cfg) ? cfg.picked : null
  const originCount = people.filter((p) => p.origin_set).length
  // 좁은 화면에서 장소를 열면 시간표 자리를 장소 화면이 대신해요 (칠하는 중엔 항상 시간표)
  const placeFull = narrow && placeOpen && !paintOn
  const selDetail = mode === 'all' && sel
    ? ['y', 'm', 'n', 'u'].map((k) => [k, people.filter((p) => (p.cells[`${sel.d}-${sel.s}`] || 'u') === k)]).filter(([, ps]) => ps.length)
    : null
  const best = result.entered && list.length ? list[cand % list.length] : null
  const openSuggestion = (w) => {
    setMode('all')
    setSel({ d: w.d, s: w.s })
    const i = list.findIndex((x) => x.d === w.d && x.s === w.s)
    if (i >= 0) setCand(i)
  }
  const isOwner = cfg.owner === uid
  async function exitMeeting() {
    try {
      if (isOwner) await deleteMeeting(mid)
      else await leaveMeeting(mid, uid)
      setDraft(null) // 칠하던 내용이 있어도 '떠나시겠어요?' 확인 없이 이동
      try { sessionStorage.setItem('overlap:flash', isOwner ? '약속을 삭제했어요' : '약속에서 나왔어요') } catch { /* 저장소 막힘 */ }
      window.location.href = '/'
    } catch (e) {
      toast(e.message)
    }
  }
  // ⋯ 메뉴: 자주 안 쓰는 기능
  const menuItems = [
    { key: 'settings', label: '약속 설정 바꾸기', desc: '날짜 · 시간대 · 길이 · 인원', onClick: () => setSettingsOpen(true) },
    GOOGLE_CLIENT_ID && canEdit(myPid) && {
      key: 'calendar',
      label: 'Google 캘린더에서 바쁜 시간 가져오기',
      desc: '바쁜 시간을 불가로 칠해 줘요 (저장 전에 확인)',
      onClick: () => { if (!paintOn) startEdit(); startCalendar() },
    },
    {
      key: 'place',
      label: cfg.place ? '장소 바꾸기' : '장소 정하기',
      desc: cfg.place ? cfg.place.name : `이름으로 찾기 · 중간 지점 추천 (출발지 ${originCount}/${people.length}명)`,
      onClick: () => setPlaceOpen(true),
    },
    picked
      ? { key: 'notice', label: '공지 문구 복사', desc: '확정된 시간·장소와 링크', onClick: () => copy(noticeText(picked, picked.dur, true)) }
      : (chosen || best) && { key: 'suggest', label: '제안 문구 복사', desc: '카톡에 붙여 넣을 추천 시간 안내', onClick: () => copy(noticeText(chosen || best, cfg.dur, false)) },
  ].filter(Boolean)

  const suggestion = (compact) => (
    <SuggestionNote
      compact={compact}
      cfg={cfg}
      result={result}
      list={list}
      cand={cand}
      byId={byId}
      swapKey={list.length ? `${list[cand % list.length].d}-${list[cand % list.length].s}-${cfg.dur}` : 'none'}
      onNext={() => {
        const next = cand + 1
        setCand(next)
        // 모바일: 다음 후보를 시간표에서도 바로 짚어 줘요
        if (compact && list.length) { const w = list[next % list.length]; setMode('all'); setSel({ d: w.d, s: w.s }) }
      }}
      onPick={(w) => {
        updateCfg({ picked: { d: w.d, s: w.s, dur: cfg.dur } })
        toast('확정했어요. 모두에게 보여요.')
      }}
      onCopy={(w) => copy(noticeText(w, cfg.dur, false))}
      onInvite={() => { setInviteOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
      onWhen={setChosen}
      showAll={showAll}
      onShowAll={() => setShowAll((v) => !v)}
    />
  )
  // 모바일: 맨 위 '좋은 시간' 카드 3개 (결론부터). 카드를 고르면 시간표에서도 그 칸을 짚어 줘요
  const topTimes = (
    <TopTimes
      cfg={cfg}
      result={result}
      byId={byId}
      onPick={(w) => {
        updateCfg({ picked: { d: w.d, s: w.s, dur: cfg.dur } })
        setReconsider(false)
        toast('확정했어요. 모두에게 보여요.')
      }}
      onCopy={(w) => copy(noticeText(w, cfg.dur, false))}
      onInvite={() => { setInviteOpen(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
      onSelect={(w) => { if (!paintOn) { setMode('all'); setSel({ d: w.d, s: w.s }) } }}
      onWhen={setChosen}
      showAll={showAll}
      onShowAll={() => setShowAll((v) => !v)}
    />
  )
  // 모바일 후보 목록 ('후보 전체 보기'로 펼쳐요)
  const slotLists = (
    <>
      <SlotList
        title="모두 가능한 시간"
        round
        count={result.all.length}
        hint="전원이 '가능'으로 표시한 시간이에요."
        items={result.all}
        empty={result.entered ? '전원이 되는 시간은 아직 없어요. 아래 추천 시간을 확인해 보세요.' : '입력이 모이면 여기에 나타나요.'}
        cfg={cfg}
        n={n}
        byId={byId}
        onOpen={openSuggestion}
      />
      <SlotList
        title="추천 시간"
        hint="가능한 사람이 많고 불가가 적은 순서예요. '조율'은 반만 쳐요."
        items={result.rec}
        empty="입력이 모이면 여기에 나타나요."
        cfg={cfg}
        n={n}
        byId={byId}
        onOpen={openSuggestion}
      />
    </>
  )

  return (
    <div className={`flex flex-col ${narrow ? 'gap-3' : 'gap-[18px]'} ${lockable ? (paintOn ? 'pb-36' : 'pb-24') : ''}`}>
      {/* 머리: 뒤로 · 제목 · 초대 · ⋯ 를 한 줄에, 아래에 기간·인원 한 줄 */}
      <header className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <BackButton showLabel={false} className="shrink-0" />
          <input
            key={cfg.title}
            aria-label="약속 이름"
            maxLength={40}
            defaultValue={cfg.title}
            className="min-w-0 flex-1 border-0 border-b-2 border-transparent bg-transparent p-0 font-display text-[clamp(20px,3.6vw,30px)] font-extrabold tracking-tight hover:border-rule focus:border-rule focus-visible:border-pen focus-visible:outline-none"
            onBlur={(e) => {
              const v = e.target.value.trim() || '우리 언제 만나?'
              if (v !== cfg.title) updateCfg({ title: v })
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
          <button className="btn-soft btn-sm shrink-0" onClick={() => setInviteOpen((o) => !o)} aria-expanded={inviteOpen}>초대</button>
          <button className="btn-ghost btn-sm shrink-0 !px-2" aria-label="약속 메뉴" aria-haspopup="dialog" onClick={() => setMenuOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
          </button>
        </div>
        {/* 기간 · 시간대 · 길이 · 인원 한 줄. 누르면 약속 설정 */}
        <button
          type="button"
          className="flex min-w-0 items-center gap-1.5 self-start border-0 bg-transparent py-0.5 pl-1 text-left text-[13px] text-ink2 hover:text-ink"
          aria-label={`약속 설정 바꾸기: ${briefRange(cfg)}, ${durText(cfg.dur)}, ${cfg.count}명 예상`}
          onClick={() => setSettingsOpen(true)}
        >
          <span className={`h-[7px] w-[7px] shrink-0 rounded-full ${live === 'live' ? 'bg-yes' : live === 'off' ? 'bg-no' : 'bg-ink2'}`} aria-hidden="true" />
          <span className="tabular truncate">{briefRange(cfg)} · {durText(cfg.dur)} · {cfg.count}명</span>
        </button>
        {live !== 'live' && (
          <span role="status" className="pl-1 text-[12px] text-no">{live === 'off' ? '연결 끊김 · 새로고침해 주세요' : '연결 중…'}</span>
        )}
        {live === 'live' && <span role="status" className="sr-only">실시간 공유 중</span>}
      </header>

      {settingsOpen && (
        <SettingsBar
          cfg={cfg}
          onChange={(patch) => { setCand(0); updateCfg(patch); toast('설정을 저장했어요') }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {inviteOpen && <InvitePanel mid={mid} cfg={cfg} link={link} onClose={() => setInviteOpen(false)} />}

      {placeFull ? (
        <>
          <button className="btn-ghost btn-sm -ml-2 self-start" onClick={() => setPlaceOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            시간표로 돌아가기
          </button>
          <PlacePanel mid={mid} cfg={cfg} people={people} myPid={myPid} onPlace={(place) => updateCfg({ place })} />
        </>
      ) : (
        <>
          {picked && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md bg-pen-strong px-4 py-3 text-pen-ink">
              <div className="min-w-0">
                <div className="text-xs opacity-85">약속이 잡혔어요</div>
                <strong className="font-display text-xl font-extrabold">{dayLabel(cfg, picked.d)} {timeText(cfg, picked.s, picked.dur)}</strong>
                {cfg.place && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
                    <PlaceLine place={cfg.place} originCount={originCount} total={people.length} linkClass="font-semibold text-pen-ink underline" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button className="btn btn-sm bg-[color-mix(in_oklab,var(--pen-ink)_18%,transparent)] text-pen-ink hover:bg-[color-mix(in_oklab,var(--pen-ink)_28%,transparent)]" onClick={() => copy(noticeText(picked, picked.dur, true))}>공지 복사</button>
                {narrow && (
                  <button className="btn btn-sm bg-transparent text-pen-ink hover:bg-[color-mix(in_oklab,var(--pen-ink)_18%,transparent)]" aria-expanded={reconsider} onClick={() => setReconsider((v) => !v)}>
                    {reconsider ? '추천 접기' : '다른 시간 보기'}
                  </button>
                )}
                <button className="btn btn-sm bg-transparent text-pen-ink hover:bg-[color-mix(in_oklab,var(--pen-ink)_18%,transparent)]" onClick={() => updateCfg({ picked: null })}>확정 취소</button>
              </div>
            </div>
          )}

          <PeopleBar
            compact={narrow}
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
            relation={(userId) => (rel[userId] === 'friend' ? 'friend' : rel[userId] === 'pending' ? 'pending' : 'none')}
            onFriend={addFriend}
          />

          {/* 모바일: 시간표 바로 위에 추천 카드 하나 (칠하는 중·확정 후엔 숨김) */}
          {narrow && !paintOn && (!picked || reconsider) && topTimes}
          {narrow && !paintOn && (!picked || reconsider) && showAll && slotLists}

          {!narrow && placeOpen && (
            <PlacePanel mid={mid} cfg={cfg} people={people} myPid={myPid} onPlace={(place) => updateCfg({ place })} onClose={() => setPlaceOpen(false)} />
          )}

          <div className="grid grid-cols-1 items-start gap-5 min-[920px]:grid-cols-[minmax(0,1fr)_340px]">
            <section className={narrow ? '' : 'sheet'} aria-label="시간 입력">
              {(
                <div className="mb-2 flex items-center justify-between gap-2.5">
                  <div className="inline-flex flex-1 gap-1 rounded-full bg-rule2 p-1 min-[920px]:flex-none" role="group" aria-label="보기">
                    {[['all', '모두 겹쳐 보기'], ['edit', '내 일정']].map(([k, label]) => (
                      <button
                        key={k}
                        aria-pressed={mode === k}
                        className={`min-h-[34px] flex-1 rounded-full border-0 px-3.5 text-[13px] font-semibold ${mode === k ? 'bg-sheet text-ink shadow-soft' : 'bg-transparent text-ink2 hover:text-ink'}`}
                        onClick={() => (k === 'edit' ? startEdit() : paintOn ? finishEdit() : setMode(k))}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {!lockable && canEdit(myPid) && !paintOn && (
                    <button className="btn-primary" onClick={startEdit}>
                      <PenIcon /> {editLabel}
                    </button>
                  )}
                </div>
              )}
              {paintOn && (
                // 칠하는 중: 저장 상태 · 되돌리기 · 모두 지우기 (저장 버튼 없음)
                <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`text-[13px] font-semibold ${saveState === 'saved' ? 'text-yes' : 'text-ink2'}`} role="status">{saveText}</span>
                  <span className="text-xs text-ink2">{lockable ? '톡 치면 한 칸, 꾹 눌러 끌면 여러 칸' : '누르거나 드래그해서 칠해요'}</span>
                  <span className="ml-auto flex items-center gap-1">
                    <button className="btn-ghost btn-sm" disabled={!undoStack.length} onClick={undo}>되돌리기</button>
                    {Object.keys(draft).length > 0 && (
                      <button className="btn-ghost btn-sm text-no hover:text-no" onClick={() => applyDraft({})}>모두 지우기</button>
                    )}
                  </span>
                </div>
              )}

              {paintOn && !lockable && (
                <div className="sticky z-[5] mb-1 flex items-center gap-2 bg-sheet py-2" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
                  <Palette brush={brush} setBrush={setBrush} className="min-w-0 flex-1" />
                  <button className="btn-primary min-h-[44px]" onClick={finishEdit}>다 했어요</button>
                </div>
              )}
              {paintOn && calOpen && calToken && (
                <CalendarImport
                  cfg={cfg}
                  token={calToken}
                  cells={draft}
                  onExpired={onCalExpired}
                  onClose={() => setCalOpen(false)}
                  onApply={(next, changed) => {
                    applyDraft(next)
                    setCalOpen(false)
                    toast(changed ? `캘린더 내용을 ${changed}칸에 반영했어요. 마음에 안 들면 되돌리기를 누르세요.` : '바뀐 칸이 없어요')
                  }}
                />
              )}

              <TimeGrid
                cfg={cfg}
                people={shownPeople}
                mode={mode}
                cells={draft ?? myCells}
                canPaint={paintOn}
                onLockedTap={canEdit(myPid) ? () => toast('‘내 일정’을 누르면 바로 칠할 수 있어요') : undefined}
                brush={brush}
                sel={sel}
                onSelect={setSel}
                onCommit={commitCells}
                onFill={fill}
                onAnnounce={(c) => {
                  const v = (draft ?? myCells)[`${c.d}-${c.s}`]
                  setAnnounce(`${dayLabel(cfg, c.d)} ${tm(cfg, c.s)}${mode === 'edit' ? ` ${BRUSH_LABEL[v] || '미입력'}` : ''}`)
                }}
              />

              {/* 범례는 한 줄로. 겹쳐 보기에서 칸을 누르면 그 자리에 누가 되는지 보여요 */}
              {mode === 'all' && sel ? (
                <div className="mt-2.5 text-[13px]" aria-live="polite">
                  <b className="font-mono font-semibold">{dayLabel(cfg, sel.d)} {tm(cfg, sel.s)}–{tm(cfg, sel.s + 1)}</b>
                  <div className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1">
                    {selDetail.map(([k, ps]) => (
                      <span key={k} className="inline-flex items-center gap-1.5">
                        <i className={`sw ${k === 'u' ? 'e' : k}`} />
                        {{ y: '가능', m: '조율', n: '불가', u: '미입력' }[k]}: {ps.map((p) => p.name || '이름 없음').join(', ')}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink2">
                  {mode === 'edit' ? (
                    <>
                      <span className="inline-flex items-center gap-1.5"><i className="sw y" />가능</span>
                      <span className="inline-flex items-center gap-1.5"><i className="sw m" />조율</span>
                      <span className="inline-flex items-center gap-1.5"><i className="sw n" />불가</span>
                      <span className="inline-flex items-center gap-1.5"><i className="sw e" />미입력</span>
                      {!paintOn && <span>{hasMine ? '내가 칠한 시간이에요' : '아직 칠하지 않았어요'}</span>}
                      {paintOn && <span>같은 색으로 다시 칠하면 지워져요 · 자동으로 저장돼요</span>}
                    </>
                  ) : (
                    <>
                      <span className="font-mono">0</span>
                      <span className="inline-block h-2.5 w-[72px] rounded-sm bg-[linear-gradient(90deg,var(--cell),var(--yes))]" />
                      <span className="font-mono">{n}명</span>
                      <span>· 칸을 누르면 누가 되는지 보여요</span>
                    </>
                  )}
                </div>
              )}
            </section>

            {/* 넓은 화면만: 오른쪽에 장소 · 추천 · 목록 */}
            {!narrow && (
              <aside id="suggest" className="flex flex-col gap-5">
                <section className="sheet flex flex-col gap-2" aria-label="만날 장소">
                  <h2 className="m-0 text-[17px] font-bold">만날 장소</h2>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-ink2">
                    <PlaceLine place={cfg.place} originCount={originCount} total={people.length} linkClass="font-semibold text-accent underline" />
                  </div>
                  <button className="btn-soft self-start" aria-expanded={placeOpen} onClick={() => setPlaceOpen((o) => !o)}>
                    {placeOpen ? '장소 창 닫기' : cfg.place ? '장소 바꾸기' : '장소 정하기'}
                  </button>
                </section>
                {suggestion(false)}
                {slotLists}
              </aside>
            )}
          </div>
        </>
      )}

      {menuOpen && <BoardMenu items={menuItems} isOwner={isOwner} onExit={exitMeeting} onClose={() => setMenuOpen(false)} />}

      {lockable && !settingsOpen && (
        <MobileBar
          painting={paintOn}
          canPaint={canEdit(myPid)}
          editLabel={editLabel}
          brush={brush}
          setBrush={setBrush}
          placeLabel={cfg.place ? cfg.place.name : originCount ? `장소 · 출발지 ${originCount}/${people.length}` : '장소 정하기'}
          placeOpen={placeFull}
          onPlace={() => setPlaceOpen((o) => !o)}
          onStart={startEdit}
          onUndo={undo}
          canUndo={undoStack.length > 0}
          onDone={finishEdit}
        />
      )}
      <div className="sr-only" aria-live="polite">{announce}</div>
    </div>
  )
}

/** 장소 한 줄: 정해졌으면 이름·역·지도 링크, 아니면 출발지 입력 현황 */
function PlaceLine({ place, originCount, total, linkClass }) {
  if (!place) return <span className="opacity-85">어디서 만날까요? 출발지 입력 {originCount}/{total}명</span>
  return (
    <>
      <span className="font-semibold">📍 {place.name}</span>
      {place.station && <span className="opacity-85">{place.station} 근처</span>}
      <a href={place.url} target="_blank" rel="noreferrer" className={linkClass}>지도 보기</a>
    </>
  )
}

function PenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  )
}

/** 모바일 하단 고정 바: 평소엔 [장소] + [내 시간 칠하기], 칠하는 중엔 칠하기 도구 + 되돌리기 · 다 했어요 (자동 저장). */
function MobileBar({ painting, canPaint, editLabel, brush, setBrush, placeLabel, placeOpen, onPlace, onStart, onUndo, canUndo, onDone }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-[color-mix(in_oklab,var(--sheet)_92%,transparent)] px-3 pt-2.5 shadow-[0_-8px_24px_-12px_rgba(42,40,56,.18)] backdrop-blur"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom, 0px))' }}
    >
      {painting ? (
        <div className="mx-auto flex max-w-[560px] flex-col gap-2">
          <Palette brush={brush} setBrush={setBrush} compact />
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <button type="button" className="btn min-h-[48px]" disabled={!canUndo} onClick={onUndo}>되돌리기</button>
            <button type="button" className="btn-primary min-h-[48px]" onClick={onDone}>다 했어요 · 결과 보기</button>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex max-w-[560px] items-center gap-2">
          <button type="button" className={`btn min-h-[48px] min-w-0 ${canPaint ? 'max-w-[45%] shrink' : 'flex-1'}`} aria-pressed={placeOpen} onClick={onPlace}>
            <span className="truncate">{placeOpen ? '시간표 보기' : placeLabel}</span>
          </button>
          {canPaint && (
            <button type="button" className="btn-primary min-h-[48px] flex-1" onClick={onStart}>
              <PenIcon />
              {editLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
