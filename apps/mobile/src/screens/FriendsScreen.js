import { useCallback, useState } from 'react'
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { cancelRequest, myRequests, requestByCode, respondRequest, resultText } from '@overlap/core/api/friends'
import { fetchFriends, formatCode, myProfile, removeFriend } from '@overlap/core/api/profile'
import { PROD_ORIGIN } from '@overlap/core/site'
import { supabase } from '../lib/supabase'
import { type, useTheme } from '../lib/theme'
import { Avatar, Button, Card, Section } from '../ui'

const fmt = (d) => { const [, m, day] = d.split('-').map(Number); return `${m}/${day}` }

/** 친구 (웹 친구 화면과 같은 구성): 내 코드 한 줄 · 코드로 신청 · 받은 신청 · 친구 목록 · 보낸 신청 */
export default function FriendsScreen() {
  const { c, radius } = useTheme()
  const [me, setMe] = useState(null)
  const [reqs, setReqs] = useState([])
  const [friends, setFriends] = useState(null)
  const [total, setTotal] = useState(0)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const [p, r, f] = await Promise.all([myProfile(supabase), myRequests(supabase), fetchFriends(supabase, 0, 50)])
    setMe(p)
    setReqs(r)
    setFriends(f.rows)
    setTotal(f.total)
  }, [])
  useFocusEffect(useCallback(() => { load() }, [load]))

  const myCode = formatCode(me?.invite_code)
  const incoming = reqs.filter((x) => x.direction === 'in')
  const outgoing = reqs.filter((x) => x.direction === 'out')
  const say = (msg) => Alert.alert('', msg)

  async function add() {
    if (!code.trim()) return
    setBusy(true)
    try {
      const res = await requestByCode(supabase, code)
      setCode('')
      say(resultText(res.result, res.name))
      load()
    } catch (e) {
      say(e.message)
    } finally {
      setBusy(false)
    }
  }
  const act = (fn, msg) => async () => { try { await fn(); if (msg) say(msg); load() } catch (e) { say(e.message) } }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.paper }}
      contentContainerStyle={styles.wrap}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
    >
      <Text style={[type.title, { color: c.ink }]}>친구</Text>

      <Card style={{ paddingVertical: 12 }}>
        <View style={styles.line}>
          <View style={{ flex: 1 }}>
            <Text style={[type.caption, { color: c['ink-2'] }]}>내 친구 코드</Text>
            <Text style={{ fontSize: 19, fontWeight: '800', letterSpacing: 2, color: c.ink }}>{myCode || '····-····'}</Text>
          </View>
          <Button small kind="soft" label="코드 보내기" disabled={!myCode} onPress={() => Share.share({ message: `Overlap에서 친구 추가해 줘! 내 초대 코드: ${myCode}\n${PROD_ORIGIN}` })} />
        </View>
        <View style={[styles.line, { paddingTop: 10 }]}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: c['rule-2'], color: c.ink, borderRadius: radius.md }]}
            value={code}
            onChangeText={setCode}
            placeholder="친구 코드 (예: K7PQ-3M9X)"
            placeholderTextColor={c['ink-2']}
            autoCapitalize="characters"
            maxLength={12}
          />
          <Button small label="신청" busy={busy} onPress={add} style={{ minHeight: 44 }} />
        </View>
      </Card>
      <Text style={[type.caption, { color: c['ink-2'], marginTop: -10 }]}>같은 약속에 들어온 사람은 약속 화면 참여자 줄에서 바로 친구 신청할 수 있어요.</Text>

      {incoming.length > 0 && (
        <Section title={`받은 신청 ${incoming.length}`}>
          {incoming.map((r) => (
            <View key={r.id} style={styles.person}>
              <Avatar name={r.name} />
              <Text numberOfLines={1} style={[type.body, { flex: 1, color: c.ink, fontWeight: '600' }]}>{r.name || '이름 없음'}</Text>
              <Button small kind="plain" label="거절" onPress={act(() => respondRequest(supabase, r.id, false), '신청을 거절했어요')} />
              <Button small label="수락" onPress={act(() => respondRequest(supabase, r.id, true), `${r.name || '친구'}님과 친구가 됐어요`)} />
            </View>
          ))}
        </Section>
      )}

      <Section title={`친구 ${total}명`} empty="아직 친구가 없어요. 친구 코드를 주고받으면 친구가 돼요." loading={friends === null}>
        {(friends || []).map((f) => (
          <View key={f.user_id} style={styles.person}>
            <Avatar name={f.name} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={[type.body, { color: c.ink, fontWeight: '600' }]}>{f.name || '이름 없음'}</Text>
              {f.last_date ? <Text numberOfLines={1} style={[type.caption, { color: c['ink-2'] }]}>최근 함께 {fmt(f.last_date)} · {f.last_title}</Text> : null}
            </View>
            <Button
              small
              kind="plain"
              label="끊기"
              onPress={() => Alert.alert('친구 끊기', `${f.name || '이 친구'}님과 친구를 끊을까요?`, [
                { text: '취소', style: 'cancel' },
                { text: '끊기', style: 'destructive', onPress: act(() => removeFriend(supabase, f.user_id)) },
              ])}
            />
          </View>
        ))}
      </Section>

      {outgoing.length > 0 && (
        <Section title="수락 기다리는 중">
          {outgoing.map((r) => (
            <View key={r.id} style={styles.person}>
              <Avatar name={r.name} size={30} />
              <Text numberOfLines={1} style={[type.body, { flex: 1, color: c.ink }]}>{r.name || '이름 없음'}</Text>
              <Button small kind="plain" label="신청 취소" onPress={act(() => cancelRequest(supabase, r.id), '신청을 취소했어요')} />
            </View>
          ))}
        </Section>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 56, gap: 18 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { minHeight: 44, paddingHorizontal: 12, fontSize: 15 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
})
