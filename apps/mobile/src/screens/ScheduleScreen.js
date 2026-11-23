import { useCallback, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { DAYS } from '@overlap/core/schedule'
import { confirmedTime, fetchMyMeetings, hm, meetingSpan } from '@overlap/core/api/meetings'
import { supabase } from '../lib/supabase'
import { type, useTheme } from '../lib/theme'
import { MeetingRow, Section } from '../ui'

const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`

/**
 * 내 일정 (1차): 확정된 약속을 날짜순 목록으로 (앞으로 / 지난 30일), 조율 중인 약속.
 * 웹의 달력 보기와 Google 캘린더 겹쳐 보기는 다음 단계에서.
 */
export default function ScheduleScreen({ navigation }) {
  const { c } = useTheme()
  const [list, setList] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const load = useCallback(async () => setList(await fetchMyMeetings(supabase)), [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const now = new Date()
  const monthAgo = new Date(now.getTime() - 30 * 86400000)
  const confirmed = (list || []).map((m) => ({ m, t: confirmedTime(m) })).filter((x) => x.t)
  const next = confirmed.filter((x) => x.t.end > now).sort((a, b) => a.t.start - b.t.start)
  const past = confirmed.filter((x) => x.t.end <= now && x.t.start >= monthAgo).sort((a, b) => b.t.start - a.t.start)
  const pending = (list || []).filter((m) => !confirmedTime(m) && meetingSpan(m).end >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const row = ({ m, t }, i, arr) => (
    <MeetingRow
      key={m.id}
      last={i === arr.length - 1}
      top={`${t.start.getMonth() + 1}월`}
      main={t.start.getDate()}
      title={m.title}
      meta={`(${DAYS[t.start.getDay()]}) ${t.open ? `${hm(t.start)}부터` : `${hm(t.start)}–${hm(t.end)}`}${m.place?.name ? ` · ${m.place.name}` : ''}`}
      onPress={() => navigation.navigate('Board', { mid: m.id })}
    />
  )

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={styles.wrap}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
    >
      <Text style={[type.title, { color: c.ink }]}>내 일정</Text>
      <Section title="앞으로" empty="확정된 약속이 아직 없어요." loading={list === null}>{next.map(row)}</Section>
      <Section title="조율 중" empty="조율 중인 약속이 없어요." loading={list === null}>
        {pending.map((m, i) => {
          const s = meetingSpan(m)
          return <MeetingRow key={m.id} last={i === pending.length - 1} top="참여" main={`${m.participants?.[0]?.count ?? 0}명`} title={m.title} meta={`${md(s.start)}–${md(s.end)}`} onPress={() => navigation.navigate('Board', { mid: m.id })} />
        })}
      </Section>
      {past.length > 0 && <Section title="지난 30일">{past.map(row)}</Section>}
    </ScrollView>
  )
}

const styles = StyleSheet.create({ wrap: { padding: 20, paddingTop: 56, gap: 18 } })
