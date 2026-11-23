import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { DAYS } from '@overlap/core/schedule'
import { confirmedTime, fetchMyMeetings, hm, meetingSpan } from '@overlap/core/api/meetings'
import { supabase } from '../lib/supabase'
import { displayName, signOut } from '../lib/auth'
import { type, useTheme } from '../lib/theme'

const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`

/**
 * 홈 (1단계): 내 약속 목록을 웹과 같은 조회 함수로 보여 줘요.
 * 하단 탭·약속 화면·칠하기는 다음 PR에서 이어서 만들어요.
 */
export default function HomeScreen({ session }) {
  const { c, radius } = useTheme()
  const [list, setList] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const load = useCallback(async () => setList(await fetchMyMeetings(supabase)), [])
  useEffect(() => { load() }, [load])

  const now = new Date()
  const upcoming = (list || []).map((m) => ({ m, t: confirmedTime(m) })).filter((x) => x.t && x.t.end > now).sort((a, b) => a.t.start - b.t.start)
  const ongoing = (list || []).filter((m) => !confirmedTime(m) && meetingSpan(m).end >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))

  const Row = ({ top, main, title, meta }) => (
    <View style={[styles.row, { borderColor: c['rule-2'] }]}>
      <View style={[styles.tile, { backgroundColor: c['pen-soft'], borderRadius: 12 }]}>
        <Text style={[type.caption, { color: c.accent, fontWeight: '600' }]}>{top}</Text>
        <Text style={{ fontSize: 17, fontWeight: '800', color: c.accent }}>{main}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[type.body, { color: c.ink, fontWeight: '600' }]}>{title}</Text>
        <Text numberOfLines={1} style={[type.caption, { color: c['ink-2'] }]}>{meta}</Text>
      </View>
    </View>
  )
  const Section = ({ title, empty, children }) => (
    <View style={{ gap: 6 }}>
      <Text style={[type.caption, { color: c['ink-2'], fontWeight: '700' }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: c.sheet, borderRadius: radius.md }]}>
        {list === null ? <Text style={{ color: c['ink-2'], paddingVertical: 10 }}>불러오는 중…</Text> : children?.length ? children : <Text style={{ color: c['ink-2'], paddingVertical: 10 }}>{empty}</Text>}
      </View>
    </View>
  )

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
    >
      <View style={styles.head}>
        <Text style={[type.heading, { color: c.ink }]}>Overlap</Text>
        <Pressable accessibilityRole="button" onPress={signOut} hitSlop={12}>
          <Text style={[type.caption, { color: c['ink-2'] }]}>로그아웃</Text>
        </Pressable>
      </View>
      <Text style={[type.title, { color: c.ink }]}>{displayName(session.user) || '반가워요'}님,{'\n'}어떤 약속을 잡아 볼까요?</Text>
      <Section title="다가오는 약속" empty="확정된 약속이 아직 없어요.">
        {upcoming.slice(0, 3).map(({ m, t }) => (
          <Row key={m.id} top={`${t.start.getMonth() + 1}월`} main={t.start.getDate()} title={m.title} meta={`(${DAYS[t.start.getDay()]}) ${t.open ? `${hm(t.start)}부터` : `${hm(t.start)}–${hm(t.end)}`}`} />
        ))}
      </Section>
      <Section title="조율 중" empty="조율 중인 약속이 없어요.">
        {ongoing.slice(0, 6).map((m) => {
          const s = meetingSpan(m)
          return <Row key={m.id} top="참여" main={`${m.participants?.[0]?.count ?? 0}명`} title={m.title} meta={`${md(s.start)}–${md(s.end)}`} />
        })}
      </Section>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 60, gap: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  card: { paddingHorizontal: 14, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  tile: { width: 48, paddingVertical: 4, alignItems: 'center' },
})
