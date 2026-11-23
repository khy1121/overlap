import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { useMeeting } from '@overlap/core/hooks/useMeeting'
import { briefRange, dayLabel, durText, evaluate, nDays, spanText, timeText } from '@overlap/core/schedule'
import { keysOf, partsOf } from '@overlap/core/parts'
import { meetingLink } from '@overlap/core/site'
import { supabase } from '../lib/supabase'
import { type, useTheme } from '../lib/theme'
import { Avatar, Button, Card } from '../ui'
import PlaceCard from '../components/PlaceCard'
import { applyBusy, fetchBusy } from '@overlap/core/api/calendar'
import { canGoogle, requestCalendarToken } from '../lib/gcal'

// 큰 칸 한 칸의 상태: 모두 같으면 그 값(y/m/n), 하나도 없으면 u, 섞였으면 mix
function stateOf(cells, keys) {
  if (!keys.length) return 'x'
  const vals = new Set(keys.map((k) => cells[k] || 'u'))
  return vals.size === 1 ? [...vals][0] : 'mix'
}
// 누를 때마다: (빈칸·일부) → 가능 → 안 돼요 → 조율 → 빈칸 (웹 큰 칸과 같아요)
const NEXT = { u: 'y', mix: 'y', y: 'n', n: 'm', m: 'u' }
const LABEL = { y: '가능', m: '조율', n: '안 돼요', u: '미입력', mix: '일부' }

/**
 * 약속 화면 (앱 1차): 웹과 같은 useMeeting 훅으로 불러오고 실시간으로 맞춰요.
 * - 모두 겹쳐 보기: 좋은 시간 카드 3개(확정) + 큰 칸 겹쳐 보기(몇 명 되는지)
 * - 내 시간 칠하기: 큰 칸(요일 × 시간대)을 누르면 바로 칠해지고 0.8초 뒤 자동 저장, 되돌리기
 * 만날 장소: 키워드로 찾아 정하기·길찾기 (중간 지점 찾기는 웹에서)
 * 30분 단위 다듬기·후보 투표·참석자 꼭/선택은 다음 단계에서.
 */
export default function BoardScreen({ route, navigation }) {
  const { mid } = route.params
  const { c, radius } = useTheme()
  const m = useMeeting(supabase, mid, (msg) => Alert.alert('', msg))
  const { cfg, people, myPid, updateCfg, updatePerson } = m
  const me = people.find((p) => p.id === myPid)
  const myCells = me?.cells || {}
  const [mode, setMode] = useState(null) // 'all' | 'edit' (처음엔 칠했는지에 따라)
  const [draft, setDraft] = useState(null)
  const [undo, setUndo] = useState([])
  const [saveState, setSaveState] = useState('idle')
  const [open, setOpen] = useState(0)

  useEffect(() => { if (cfg?.title) navigation.setOptions({ title: cfg.title }) }, [cfg?.title, navigation])
  // 방금 만든 약속: 친구 초대 결과와 링크 보내기 (한 번만)
  const created = route.params?.created
  useEffect(() => {
    if (!created || !cfg) return
    navigation.setParams({ created: undefined })
    const head = created.invited ? `친구 ${created.invited}명을 초대했어요.` : '약속을 만들었어요.'
    const tail = created.failed ? ` (${created.failed}명은 초대하지 못했어요)` : ''
    Alert.alert(head + tail, '다른 사람에게는 링크를 보내 주세요. 내 시간도 먼저 칠해 두면 좋아요.', [
      { text: '나중에', style: 'cancel' },
      { text: '링크 보내기', onPress: () => Share.share({ message: `${cfg.title}
되는 시간을 칠해 주세요!
${meetingLink(mid)}` }) },
    ])
  }, [created, cfg, mid, navigation])
  // 처음 열 때: 이미 칠했으면 겹쳐 보기, 아직이면 바로 칠하기
  useEffect(() => {
    if (m.status !== 'ready' || !myPid || mode) return
    setMode(Object.keys(myCells).length ? 'all' : 'edit')
  }, [m.status, myPid, mode, myCells])
  useEffect(() => {
    if (mode === 'edit' && draft === null && me) setDraft({ ...myCells })
    if (mode === 'all' && draft !== null) setDraft(null)
  }, [mode, draft, me, myCells])

  // 자동 저장: 마지막으로 칠하고 0.8초 뒤 한 번
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(myCells)
  const flush = useRef(null)
  useEffect(() => {
    if (!dirty) { flush.current = null; return }
    setSaveState('saving')
    const save = () => { updatePerson(myPid, { cells: draft }); setSaveState('saved') }
    const t = setTimeout(save, 800)
    flush.current = () => { clearTimeout(t); save() }
    return () => clearTimeout(t)
  }, [draft, dirty, myPid, updatePerson])
  // 화면을 떠날 때 남은 저장을 바로
  useEffect(() => navigation.addListener('beforeRemove', () => flush.current?.()), [navigation])

  const shown = useMemo(() => (draft ? people.map((p) => (p.id === myPid ? { ...p, cells: draft } : p)) : people), [people, draft, myPid])
  const result = useMemo(() => {
    if (!cfg) return null
    const inPs = shown.filter((p) => p.role !== 'absent')
    return evaluate({ ...cfg, count: Math.max(1, cfg.count - (shown.length - inPs.length)) }, inPs)
  }, [cfg, shown])
  const apply = useCallback((next) => { setUndo((u) => [...u.slice(-29), draft]); setDraft(next) }, [draft])
  // Google 캘린더 free/busy로 채우기 (일정 제목·내용은 받지 않아요). 반영 방법은 고르게, 되돌리기 가능
  const [gBusy, setGBusy] = useState(false)
  async function fromGoogle() {
    setGBusy(true)
    try {
      const token = await requestCalendarToken()
      if (!token) return
      const found = await fetchBusy(token, cfg)
      const pick = (fillFree) => {
        const { next, changed } = applyBusy(draft || {}, found, { markBusy: true, fillFree })
        apply(next)
        Alert.alert('', changed ? `${changed / 2}시간을 채웠어요. 마음에 안 들면 되돌리기를 눌러 주세요.` : '바뀐 칸이 없어요.')
      }
      Alert.alert(
        `바쁜 시간 ${found.busyKeys.length / 2}시간을 찾았어요`,
        '일정 제목이나 내용은 가져오지 않아요. 어떻게 채울까요?',
        [
          { text: '취소', style: 'cancel' },
          { text: '바쁜 시간만 안 돼요로', onPress: () => pick(false) },
          { text: '빈 시간은 가능으로도', onPress: () => pick(true) },
        ],
      )
    } catch (e) {
      Alert.alert('', e.message)
    } finally {
      setGBusy(false)
    }
  }

  if (m.status === 'error') {
    return <View style={[styles.center, { backgroundColor: c.paper }]}><Text style={[type.body, { color: c.ink }]}>약속을 열 수 없어요 ({m.error === 'not_found' ? '링크를 확인해 주세요' : m.error === 'deleted' ? '삭제된 약속이에요' : m.error})</Text></View>
  }
  if (m.status === 'loading' || !cfg || !result) {
    return <View style={[styles.center, { backgroundColor: c.paper }]}><ActivityIndicator color={c.pen} /></View>
  }

  const n = result.n
  const parts = partsOf(cfg)
  const days = nDays(cfg)
  const picked = cfg.picked
  const top = result.rec.slice(0, 3)
  const byId = Object.fromEntries(people.map((p) => [p.id, p]))
  const names = (ids) => ids.map((id) => byId[id]?.name || '이름 없음').join(', ')
  const confirm = (w) => { updateCfg({ picked: { d: w.d, s: w.s, dur: cfg.dur } }); Alert.alert('', '확정했어요. 모두에게 보여요.') }
  const share = () => Share.share({ message: `${cfg.title}\n되는 시간을 칠해 주세요!\n${meetingLink(mid)}` })
  const entered = people.filter((p) => Object.keys(p.cells || {}).length).length

  // 큰 칸 한 칸: 칠하기 모드면 내 상태, 겹쳐 보기면 되는 사람 수(절반 이상 가능·조율)
  const cell = (d, part) => {
    const keys = keysOf(cfg, d, part)
    if (!keys.length) return <View key={part.from} style={[styles.cell, { backgroundColor: c['rule-2'], opacity: 0.4, borderRadius: 12 }]} />
    if (mode === 'edit') {
      const st = stateOf(draft || {}, keys)
      const look = { y: [c['yes-soft'], c.yes], m: [c['maybe-soft'], c.maybe], n: [c['rule-2'], 'transparent'], u: [c.sheet, c.rule], mix: [c.sheet, c.yes] }[st]
      return (
        <Pressable
          key={part.from}
          accessibilityRole="button"
          accessibilityLabel={`${dayLabel(cfg, d)} ${part.label}: ${LABEL[st]}`}
          onPress={() => { const next = { ...draft }; const v = NEXT[st]; keys.forEach((k) => { if (v === 'u') delete next[k]; else next[k] = v }); apply(next) }}
          style={[styles.cell, { backgroundColor: look[0], borderColor: look[1], borderWidth: st === 'y' || st === 'm' ? 2 : 1, borderRadius: 12 }]}
        >
          <Text style={[type.body, { fontWeight: '700', color: st === 'n' || st === 'u' ? c['ink-2'] : c.ink }]}>{LABEL[st]}</Text>
        </Pressable>
      )
    }
    const ok = shown.filter((p) => keys.filter((k) => ['y', 'm'].includes(p.cells?.[k])).length * 2 >= keys.length).length
    const ratio = n ? ok / n : 0
    return (
      <View key={part.from} accessibilityLabel={`${dayLabel(cfg, d)} ${part.label}: ${ok}명 가능`} style={[styles.cell, { backgroundColor: c.sheet, borderRadius: 12, borderWidth: ratio ? 0 : 1, borderColor: c.rule, overflow: 'hidden' }]}>
        {ratio ? <View style={[StyleSheet.absoluteFill, { backgroundColor: c.yes, opacity: 0.2 + ratio * 0.8 }]} /> : null}
        <Text style={[type.body, { fontWeight: '700', color: ratio > 0.5 ? '#fff' : c.ink }]}>{ok}명</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <Pressable onPress={share} accessibilityRole="button" accessibilityLabel="초대 링크 보내기">
          <Text style={[type.caption, { color: c['ink-2'] }]}>{briefRange(cfg)} · {durText(cfg.dur)} · {cfg.count}명 예상</Text>
        </Pressable>

        <View style={styles.people}>
          <View style={{ flexDirection: 'row', gap: -6, flex: 1 }}>
            {people.slice(0, 8).map((p) => <View key={p.id} style={{ marginRight: -6 }}><Avatar name={p.id === myPid ? '나' : p.name} size={30} /></View>)}
          </View>
          <Text style={[type.caption, { color: c['ink-2'] }]}>{entered}/{n}명 입력</Text>
          <Button small kind="soft" label="초대" onPress={share} />
        </View>

        {picked ? (
          <View style={[styles.banner, { backgroundColor: c['pen-strong'], borderRadius: radius.md }]}>
            <Text style={[type.caption, { color: c['pen-ink'] }]}>약속이 잡혔어요</Text>
            <Text style={{ fontSize: 20, lineHeight: 28, fontWeight: '800', color: c['pen-ink'] }}>{dayLabel(cfg, picked.d)} {timeText(cfg, picked.s, picked.dur)}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
              <Button small kind="plain" label="공지 보내기" onPress={() => Share.share({ message: `${cfg.title} 시간 확정\n${dayLabel(cfg, picked.d)} ${timeText(cfg, picked.s, picked.dur)}${cfg.place?.name ? `\n장소: ${cfg.place.name}` : ''}\n${meetingLink(mid)}` })} />
              <Button small kind="plain" label="확정 취소" onPress={() => updateCfg(cfg.autoConfirm ? { picked: null, autoConfirm: false } : { picked: null })} />
            </View>
          </View>
        ) : null}

        {/* 장소: 시간이 잡혔거나 이미 정해 둔 장소가 있을 때 */}
        {(picked || cfg.place) && <PlaceCard place={cfg.place} onChange={(place) => updateCfg({ place })} />}

        <View style={[styles.seg, { backgroundColor: c['rule-2'] }]}>
          {[['all', '모두 겹쳐 보기'], ['edit', '내 시간 칠하기']].map(([k, t]) => (
            <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: mode === k }} onPress={() => { if (k === 'all') flush.current?.(); setMode(k) }} style={[styles.segItem, mode === k && { backgroundColor: c.sheet }]}>
              <Text style={[type.caption, { fontWeight: '700', color: mode === k ? c.ink : c['ink-2'] }]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {mode === 'all' && !picked && (
          <View style={{ gap: 8 }}>
            {!top.length ? (
              <Card style={{ paddingVertical: 12 }}><Text style={[type.body, { color: c['ink-2'] }]}>{result.entered ? '아직 겹치는 시간이 없어요.' : '아직 아무도 입력하지 않았어요. 내 시간을 칠하고 사람들을 초대해 보세요.'}</Text></Card>
            ) : top.map((w, i) => {
              const extra = [w.g.m.length && `${names(w.g.m)} 조율`, w.g.n.length && `${names(w.g.n)} 불가`, w.g.u.length + w.missing && `${w.g.u.length + w.missing}명 미입력`].filter(Boolean)
              return (
                <Pressable key={`${w.d}-${w.s}`} onPress={() => setOpen(i)} style={[styles.topCard, { backgroundColor: c.sheet, borderRadius: radius.md, borderColor: c.pen, borderWidth: open === i ? 2 : 0 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.rank, { backgroundColor: i === 0 ? c['pen-strong'] : c['rule-2'] }]}><Text style={{ fontWeight: '700', color: i === 0 ? c['pen-ink'] : c['ink-2'] }}>{i + 1}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.body, { fontWeight: '700', color: c.ink }]}>{dayLabel(cfg, w.d)} {timeText(cfg, w.s)}</Text>
                      <Text numberOfLines={1} style={[type.caption, { color: c['ink-2'] }]}>{w.all ? `${n}명 모두 가능` : `${w.g.y.length}/${n}명 가능`}{extra.length ? ` · ${extra.join(' · ')}` : ''}</Text>
                    </View>
                  </View>
                  {open === i && (
                    <View style={{ gap: 6, marginTop: 8 }}>
                      {spanText(cfg, w) ? <Text style={[type.caption, { color: c.accent, fontWeight: '600' }]}>{spanText(cfg, w)}</Text> : null}
                      <Button label="이 시간으로 확정" onPress={() => confirm(w)} />
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
        )}

        {mode === 'edit' && (
          <View style={[styles.toolbar, { backgroundColor: c['rule-2'], borderRadius: radius.md }]}>
            <Text style={[type.caption, { flex: 1, fontWeight: '700', color: saveState === 'saved' ? c.yes : c['ink-2'] }]}>{saveState === 'saving' ? '저장 중…' : saveState === 'saved' ? '저장됨 ✓' : '칸을 누르면 바로 저장돼요'}</Text>
            <Button small kind="plain" label="전부 가능" onPress={() => { const next = {}; for (let d = 0; d < days; d++) for (const p of parts) for (const k of keysOf(cfg, d, p)) next[k] = 'y'; apply(next) }} />
            <Button small kind="plain" label="되돌리기" disabled={!undo.length} onPress={() => { const prev = undo[undo.length - 1]; setUndo((u) => u.slice(0, -1)); setDraft(prev) }} />
          </View>
        )}
        {mode === 'edit' && canGoogle && <Button small kind="soft" label="Google 캘린더에서 채우기" busy={gBusy} onPress={fromGoogle} />}

        <Card style={{ paddingVertical: 12, gap: 6 }}>
          <View style={styles.gridRow}>
            <View style={styles.dayLabel} />
            {parts.map((p) => (
              <View key={p.from} style={{ flex: 1, alignItems: 'center' }}>
                <Text style={[type.caption, { fontWeight: '700', color: c.ink }]}>{p.label}</Text>
                {p.sub ? <Text style={{ fontSize: 11, color: c['ink-2'] }}>{p.sub}</Text> : null}
              </View>
            ))}
          </View>
          {Array.from({ length: days }, (_, d) => {
            const [mdText, dow] = dayLabel(cfg, d).split(' ')
            return (
              <View key={d} style={styles.gridRow}>
                <View style={styles.dayLabel}>
                  <Text style={[type.body, { fontWeight: '700', color: c.ink }]}>{dow.replace(/[()]/g, '')}</Text>
                  <Text style={{ fontSize: 11, color: c['ink-2'] }}>{mdText}</Text>
                </View>
                {parts.map((p) => cell(d, p))}
              </View>
            )
          })}
          <Text style={[type.caption, { color: c['ink-2'], marginTop: 4 }]}>
            {mode === 'edit' ? '칸을 누를 때마다 가능 → 안 돼요 → 조율 · 30분 단위 다듬기는 웹에서' : '진할수록 많이 돼요 · 숫자는 그 시간대에 되는 사람 수'}
          </Text>
        </Card>
      </ScrollView>
      {mode === 'edit' && (
        <View style={[styles.bottom, { backgroundColor: c.paper, borderColor: c.rule }]}>
          <Button label="다 했어요 · 결과 보기" onPress={() => { flush.current?.(); setMode('all') }} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  wrap: { padding: 16, paddingBottom: 110, gap: 12 },
  people: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  banner: { padding: 16, gap: 2 },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  segItem: { flex: 1, minHeight: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  topCard: { padding: 14 },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  gridRow: { flexDirection: 'row', alignItems: 'stretch', gap: 6 },
  dayLabel: { width: 44, justifyContent: 'center' },
  cell: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
})
