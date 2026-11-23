import { useCallback, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { DAYS } from '@overlap/core/schedule'
import { confirmedTime, fetchMyEntries, fetchMyMeetings, hm, meetingSpan } from '@overlap/core/api/meetings'
import { supabase } from '../lib/supabase'
import { displayName } from '../lib/auth'
import { type, useTheme } from '../lib/theme'
import { Avatar, Button, MeetingRow, Section } from '../ui'

const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`

/**
 * 홈 (웹 홈과 같은 구성): [내가 칠할 약속 카드] → 다가오는 약속 → 조율 중, 아래 고정 '새 약속 만들기'.
 */
export default function HomeScreen({ session, navigation }) {
  const { c, radius } = useTheme()
  const uid = session.user.id
  const [list, setList] = useState(null)
  const [entered, setEntered] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const load = useCallback(async () => {
    const [ms, es] = await Promise.all([fetchMyMeetings(supabase), fetchMyEntries(supabase, uid)])
    setList(ms)
    setEntered(es)
  }, [uid])
  // 탭으로 돌아올 때마다 새로
  useFocusEffect(useCallback(() => { load() }, [load]))

  const now = new Date()
  const upcoming = (list || []).map((m) => ({ m, t: confirmedTime(m) })).filter((x) => x.t && x.t.end > now).sort((a, b) => a.t.start - b.t.start).slice(0, 3)
  const ongoing = (list || []).filter((m) => !confirmedTime(m) && meetingSpan(m).end >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const todo = entered ? ongoing.filter((m) => !entered.has(m.id)) : []
  const first = todo[0]
  const rest = ongoing.filter((m) => m !== first).slice(0, 6)
  const name = displayName(session.user)

  return (
    <View style={{ flex: 1, backgroundColor: c.paper }}>
      <ScrollView
        contentContainerStyle={styles.wrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
      >
        <View style={styles.head}>
          <Text style={[type.heading, { color: c.ink, fontWeight: '800' }]}>Overlap</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="설정" onPress={() => navigation.navigate('Settings')} hitSlop={10}>
            <Avatar name={name} size={32} />
          </Pressable>
        </View>
        <Text style={[type.title, { color: c.ink }]}>
          {name || '반가워요'}님,{'\n'}{todo.length ? `칠할 약속이 ${todo.length}개 있어요` : '어떤 약속을 잡아 볼까요?'}
        </Text>

        {first && (
          <View style={[styles.todo, { backgroundColor: c['pen-soft'], borderRadius: radius.md }]}>
            <Text style={[type.caption, { color: c.accent, fontWeight: '600' }]}>내 시간 입력 필요 · {first.participants?.[0]?.count ?? 0}명 참여{first.owner === uid ? ' · 내가 만듦' : ''}</Text>
            <Text numberOfLines={1} style={{ fontSize: 19, lineHeight: 26, fontWeight: '800', color: c.ink }}>{first.title}</Text>
            <Text style={[type.caption, { color: c['ink-2'] }]}>{md(meetingSpan(first).start)}–{md(meetingSpan(first).end)}</Text>
            <Button label="시간 칠하기" onPress={() => navigation.navigate('Board', { mid: first.id })} style={{ marginTop: 8 }} />
          </View>
        )}

        <Section title="다가오는 약속" empty="확정된 약속이 아직 없어요." loading={list === null}>
          {upcoming.map(({ m, t }, i) => (
            <MeetingRow
              key={m.id}
              last={i === upcoming.length - 1}
              top={`${t.start.getMonth() + 1}월`}
              main={t.start.getDate()}
              title={m.title}
              meta={`(${DAYS[t.start.getDay()]}) ${t.open ? `${hm(t.start)}부터` : `${hm(t.start)}–${hm(t.end)}`}${m.place?.name ? ` · ${m.place.name}` : ''}`}
              onPress={() => navigation.navigate('Board', { mid: m.id })}
            />
          ))}
        </Section>

        <Section title="조율 중" empty={first ? '다른 조율 중인 약속은 없어요.' : '조율 중인 약속이 없어요.'} loading={list === null}>
          {rest.map((m, i) => {
            const s = meetingSpan(m)
            return (
              <MeetingRow
                key={m.id}
                last={i === rest.length - 1}
                top="참여"
                main={`${m.participants?.[0]?.count ?? 0}명`}
                title={m.title}
                meta={`${md(s.start)}–${md(s.end)}${m.owner === uid ? ' · 내가 만듦' : ''}`}
                tag={entered && !entered.has(m.id) ? '입력 전' : null}
                onPress={() => navigation.navigate('Board', { mid: m.id })}
              />
            )
          })}
        </Section>
      </ScrollView>
      <View style={[styles.fab, { backgroundColor: c.paper }]}>
        <Button label="+ 새 약속 만들기" onPress={() => navigation.navigate('NewMeeting')} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 56, paddingBottom: 100, gap: 18 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todo: { padding: 16, gap: 2 },
  fab: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingVertical: 10 },
})
