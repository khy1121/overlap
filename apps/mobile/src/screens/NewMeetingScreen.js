import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MAX_DAYS, durText, nSlots, rangeText } from '@overlap/core/schedule'
import { TIME_PRESETS, addDays, datePresets } from '@overlap/core/presets'
import { createMeeting, newMeetingPlan } from '@overlap/core/newMeeting'
import { supabase } from '../lib/supabase'
import { type, useTheme } from '../lib/theme'
import { Avatar, Button } from '../ui'

const TITLE_IDEAS = ['팀 회의', '스터디', '저녁 약속', '점심 약속', '동아리 모임', '조별 과제']
const DURS = [2, 4, 6, 8, 10] // 30분 칸 단위: 1~5시간
const md = (s) => (s ? `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}` : '')

/**
 * 새 약속 (웹 새 약속과 같은 5문항): 무슨 약속 · 언제쯤 · 몇 시쯤 · 얼마나 · 누구랑.
 * 빠른 선택 칩 한 줄씩, '직접'을 누르면 ◀ ▶ 로 날짜·시각을 정해요 (날짜 입력 창 없이 엄지로).
 * 만들면 바로 그 약속 화면으로 (고른 친구는 바로 초대).
 */
export default function NewMeetingScreen({ navigation }) {
  // Android 15+(SDK 58)는 화면을 내비게이션 바 아래까지 그려요. 아래 고정 영역은 그만큼 띄워요
  const insets = useSafeAreaInsets()
  const { c, radius } = useTheme()
  const presets = datePresets()
  const [form, setForm] = useState(() => {
    const next = presets.find((p) => p.key === 'next')
    return { title: '', start: next.start, end: next.end, from: 9, to: 22, split: false, startHour: 9, endHour: 22, dur: 2, count: 4 }
  })
  const [customDate, setCustomDate] = useState(false)
  const [customTime, setCustomTime] = useState(false)
  const [countTouched, setCountTouched] = useState(false)
  const [friends, setFriends] = useState(null)
  const [picked, setPicked] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [titleErr, setTitleErr] = useState(false)
  const [submitErr, setSubmitErr] = useState('')
  const patch = (p) => setForm((f) => ({ ...f, ...p }))

  useEffect(() => { supabase.rpc('my_friends').then(({ data, error }) => setFriends(error ? [] : data)) }, [])

  const { days, one, split, cfg, err } = newMeetingPlan(form)
  const maxDur = Math.max(1, Math.min(24, nSlots(cfg) || 1))
  const datePreset = customDate ? null : presets.find((p) => p.start === form.start && p.end === form.end)
  const timePreset = customTime || split ? null : TIME_PRESETS.find((p) => p.from === cfg.from && p.to === cfg.to)
  const setCount = (n) => { setCountTouched(true); patch({ count: Math.max(1, Math.min(50, n)) }) }
  const pickFriends = (next) => {
    setPicked(next)
    if (!countTouched) patch({ count: Math.max(4, next.size + 1) }) // 인원을 직접 안 바꿨으면 '나 + 고른 친구' 이상
  }

  async function create() {
    setSubmitErr('')
    if (!form.title.trim()) { setTitleErr(true); return }
    if (err) return
    setBusy(true)
    try {
      const { mid, invited, failed } = await createMeeting(supabase, form, [...picked])
      navigation.replace('Board', { mid, created: { invited, failed } })
    } catch (e) {
      setSubmitErr(e.message)
      setBusy(false)
    }
  }

  const len = Math.max(1, days)
  const dateAside = days >= 1 && days <= MAX_DAYS ? (one ? md(form.start) : `${md(form.start)}–${md(form.end)}`) : null
  const timeAside = split ? `첫날 ${form.startHour}시 ~ 마지막 날 ${form.endHour}시` : `${cfg.from}–${cfg.to}시`
  const panel = { backgroundColor: c.sheet, borderRadius: radius.md, padding: 12, gap: 8 }

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingBottom: 150 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <Q title="무슨 약속이에요?">
          <TextInput
            style={[styles.input, { backgroundColor: c.sheet, color: c.ink, borderRadius: radius.md, borderColor: titleErr ? c.no : c.rule }]}
            value={form.title}
            onChangeText={(t) => { patch({ title: t }); setTitleErr(false) }}
            placeholder="약속 이름"
            placeholderTextColor={c['ink-2']}
            maxLength={40}
            accessibilityLabel="약속 이름"
          />
          {titleErr && <Text style={[type.caption, { color: c.no, fontWeight: '600' }]}>약속 이름을 정해 주세요. 아래 추천을 눌러도 돼요.</Text>}
          <Row>{TITLE_IDEAS.map((t) => <Chip key={t} on={form.title === t} label={t} onPress={() => { patch({ title: t }); setTitleErr(false) }} />)}</Row>
        </Q>

        <Q title="언제쯤?" aside={dateAside}>
          <Row>
            {presets.map((p) => <Chip key={p.key} on={datePreset?.key === p.key} label={p.label} onPress={() => { setCustomDate(false); patch({ start: p.start, end: p.end }) }} />)}
            <Chip on={!datePreset} label="직접" onPress={() => setCustomDate(true)} />
          </Row>
          {!datePreset && (
            <View style={panel}>
              {/* 시작일을 옮기면 기간 길이는 그대로 */}
              <Stepper label="시작 날짜" value={md(form.start)} onMinus={() => patch({ start: addDays(form.start, -1), end: addDays(form.end, -1) })} onPlus={() => patch({ start: addDays(form.start, 1), end: addDays(form.end, 1) })} />
              <Stepper label="기간" value={`${len}일`} minusOff={len <= 1} plusOff={len >= MAX_DAYS} onMinus={() => patch({ end: addDays(form.start, len - 2) })} onPlus={() => patch({ end: addDays(form.start, len) })} />
            </View>
          )}
        </Q>

        <Q title="몇 시쯤?" aside={timeAside}>
          <Row>
            {TIME_PRESETS.map((p) => <Chip key={p.key} on={timePreset?.key === p.key} label={p.label} sub={p.sub} onPress={() => { setCustomTime(false); patch({ from: p.from, to: p.to, split: false }) }} />)}
            <Chip on={!timePreset} label="직접" onPress={() => setCustomTime(true)} />
          </Row>
          {!timePreset && (
            <View style={panel}>
              <Stepper label={one ? '시작' : '매일 시작'} value={`${form.from}시`} minusOff={form.from <= 0} plusOff={form.from >= form.to - 1} onMinus={() => patch({ from: form.from - 1 })} onPlus={() => patch({ from: form.from + 1 })} />
              <Stepper label={one ? '끝' : '매일 끝'} value={`${form.to}시`} minusOff={form.to <= form.from + 1} plusOff={form.to >= 24} onMinus={() => patch({ to: form.to - 1 })} onPlus={() => patch({ to: form.to + 1 })} />
              {!one && (
                <View style={[styles.stepRow, { gap: 8 }]}>
                  <Text style={[type.caption, { flex: 1, color: c['ink-2'] }]}>첫날 시작·마지막 날 끝 시각은 따로 정하기 (예: 오늘 12시 ~ 모레 22시)</Text>
                  <Switch value={form.split} onValueChange={(v) => patch({ split: v, startHour: form.from, endHour: form.to })} trackColor={{ true: c.pen }} />
                </View>
              )}
              {split && (
                <>
                  <Stepper label="첫날 시작" value={`${form.startHour}시`} minusOff={form.startHour <= 0} plusOff={form.startHour >= 23} onMinus={() => patch({ startHour: form.startHour - 1 })} onPlus={() => patch({ startHour: form.startHour + 1 })} />
                  <Stepper label="마지막 날 끝" value={`${form.endHour}시`} minusOff={form.endHour <= 1} plusOff={form.endHour >= 24} onMinus={() => patch({ endHour: form.endHour - 1 })} onPlus={() => patch({ endHour: form.endHour + 1 })} />
                </>
              )}
            </View>
          )}
        </Q>

        <Q title="얼마나?" aside={durText(form.dur)}>
          <Row>
            {DURS.filter((d) => d <= maxDur).map((d) => <Chip key={d} on={form.dur === d} label={durText(d)} onPress={() => patch({ dur: d })} />)}
          </Row>
          <View style={panel}>
            <Stepper label="30분씩" value={durText(form.dur)} minusOff={form.dur <= 1} plusOff={form.dur >= maxDur} onMinus={() => patch({ dur: form.dur - 1 })} onPlus={() => patch({ dur: form.dur + 1 })} />
          </View>
        </Q>

        <Q
          title="누구랑?"
          aside={(
            <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityLabel="예상 인원 (나 포함)">
              <Pressable accessibilityLabel="인원 줄이기" onPress={() => setCount(form.count - 1)} style={styles.round} hitSlop={6}><Text style={[type.heading, { color: c['ink-2'] }]}>−</Text></Pressable>
              <Text style={[type.caption, { color: c.accent, fontWeight: '700' }]}>나 포함 {form.count}명</Text>
              <Pressable accessibilityLabel="인원 늘리기" onPress={() => setCount(form.count + 1)} style={styles.round} hitSlop={6}><Text style={[type.heading, { color: c['ink-2'] }]}>+</Text></Pressable>
            </View>
          )}
        >
          {friends === null && <Text style={[type.caption, { color: c['ink-2'] }]}>친구 목록을 불러오는 중…</Text>}
          {friends?.length === 0 && <Text style={[type.caption, { color: c['ink-2'] }]}>저장된 친구가 없어요. 만든 뒤 링크로 초대할 수 있어요.</Text>}
          {friends?.length > 0 && (
            <Row>
              <Pressable onPress={() => pickFriends(picked.size === friends.length ? new Set() : new Set(friends.map((f) => f.user_id)))} style={[styles.chip, { paddingHorizontal: 8 }]}>
                <Text style={[type.caption, { color: c.accent, fontWeight: '700' }]}>{picked.size === friends.length ? '모두 해제' : '모두 선택'}</Text>
              </Pressable>
              {friends.map((f) => {
                const on = picked.has(f.user_id)
                return (
                  <Pressable
                    key={f.user_id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => { const n = new Set(picked); n.has(f.user_id) ? n.delete(f.user_id) : n.add(f.user_id); pickFriends(n) }}
                    style={[styles.chip, { paddingLeft: 4, backgroundColor: on ? c['pen-strong'] : c.sheet, borderColor: on ? c['pen-strong'] : c.rule }]}
                  >
                    <Avatar name={f.name} size={28} />
                    <Text style={[type.caption, { fontWeight: '700', color: on ? c['pen-ink'] : c.ink }]}>{f.name || '이름 없음'}{on ? ' ✓' : ''}</Text>
                  </Pressable>
                )
              })}
            </Row>
          )}
        </Q>
      </ScrollView>

      {/* 아래 고정: 요약 한 줄 + 만들기 */}
      <View style={[styles.bottom, { backgroundColor: c.sheet, borderColor: c.rule, paddingBottom: 12 + insets.bottom }]}>
        {err || submitErr ? (
          <Text style={[type.caption, { textAlign: 'center', color: c.no, fontWeight: '600' }]}>{err || submitErr}</Text>
        ) : (
          <Text style={[type.caption, { textAlign: 'center', color: c['ink-2'] }]}>
            {rangeText(cfg)}{'\n'}{days > 2 ? `가운데 날 ${cfg.from}–${cfg.to}시 · ` : ''}{durText(form.dur)} · {form.count}명{picked.size ? ` · 친구 ${picked.size}명 바로 초대` : ''}
          </Text>
        )}
        <Button label={busy ? '만드는 중…' : picked.size ? `만들고 친구 ${picked.size}명 초대하기` : '약속 만들기'} busy={busy} disabled={Boolean(err)} onPress={create} />
      </View>
    </View>
  )
}

// 화면 밖에 둬야 글자를 칠 때 입력칸이 다시 만들어지지 않아요
function Chip({ on, label, sub, onPress }) {
  const { c } = useTheme()
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress} style={[styles.chip, { backgroundColor: on ? c['pen-strong'] : c.sheet, borderColor: on ? c['pen-strong'] : c.rule }]}>
      <Text style={[type.caption, { fontWeight: '700', color: on ? c['pen-ink'] : c.ink }]}>{label}</Text>
      {sub ? <Text style={{ fontSize: 12, color: on ? c['pen-ink'] : c['ink-2'], opacity: 0.85 }}>{sub}</Text> : null}
    </Pressable>
  )
}
const Row = ({ children }) => <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 8 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
// ◀ 값 ▶ 한 줄
function Stepper({ label, value, onMinus, onPlus, minusOff, plusOff }) {
  const { c } = useTheme()
  return (
    <View style={styles.stepRow}>
      <Text style={[type.caption, { width: 72, color: c['ink-2'], fontWeight: '600' }]}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 줄이기`} disabled={minusOff} onPress={onMinus} style={[styles.stepBtn, { backgroundColor: c['rule-2'], opacity: minusOff ? 0.4 : 1 }]}><Text style={[type.heading, { color: c.ink }]}>‹</Text></Pressable>
      <Text style={[type.body, { flex: 1, textAlign: 'center', fontWeight: '700', color: c.ink }]}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 늘리기`} disabled={plusOff} onPress={onPlus} style={[styles.stepBtn, { backgroundColor: c['rule-2'], opacity: plusOff ? 0.4 : 1 }]}><Text style={[type.heading, { color: c.ink }]}>›</Text></Pressable>
    </View>
  )
}
// 질문 한 덩어리: 제목 줄(오른쪽에 고른 값) + 선택지
function Q({ title, aside, children }) {
  const { c } = useTheme()
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 28 }}>
        <Text style={[type.heading, { flex: 1, color: c.ink }]}>{title}</Text>
        {typeof aside === 'string' ? <Text style={[type.caption, { color: c.accent, fontWeight: '700' }]}>{aside}</Text> : aside}
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 150, gap: 22 },
  input: { minHeight: 52, paddingHorizontal: 14, fontSize: 16, borderWidth: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: { width: 44, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  round: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
})
