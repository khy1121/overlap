import { useState } from 'react'
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { kakaoToLink, searchKeyword, toMeetingPlace } from '@overlap/core/api/places'
import { supabase } from '../lib/supabase'
import { type, useTheme } from '../lib/theme'
import { Button, Card } from '../ui'

/**
 * 만날 장소 (앱 1차): 정한 장소 보기 · 카카오맵 길찾기 · 키워드로 찾아 정하기 · 지우기.
 * 검색은 서버 함수(kakao-local)로 해요. 출발지로 중간 지점 찾기는 다음 단계에서 (웹에는 있어요).
 */
export default function PlaceCard({ place, onChange }) {
  const { c, radius } = useTheme()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function search() {
    if (!query.trim()) return
    setBusy(true)
    setError('')
    try {
      setResults(await searchKeyword(supabase, query.trim()))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const close = () => { setOpen(false); setResults(null); setQuery(''); setError('') }

  return (
    <>
      <Card style={{ paddingVertical: 12, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[type.caption, { flex: 1, color: c['ink-2'], fontWeight: '700' }]}>만날 장소</Text>
          {place ? <Button small kind="plain" label="바꾸기" onPress={() => setOpen(true)} /> : null}
        </View>
        {place ? (
          <>
            <Text style={[type.heading, { color: c.ink }]} numberOfLines={1}>{place.name}</Text>
            {place.address ? <Text style={[type.caption, { color: c['ink-2'] }]} numberOfLines={1}>{place.address}{place.station ? ` · ${place.station}` : ''}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Button small kind="soft" label="길찾기" onPress={() => Linking.openURL(kakaoToLink(place))} style={{ flex: 1 }} />
              {place.url ? <Button small kind="plain" label="장소 정보" onPress={() => Linking.openURL(place.url)} style={{ flex: 1 }} /> : null}
            </View>
          </>
        ) : (
          <Button small kind="soft" label="장소 정하기" onPress={() => setOpen(true)} />
        )}
      </Card>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: c.paper, padding: 16, paddingTop: 48, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[type.title, { flex: 1, color: c.ink }]}>장소 찾기</Text>
            <Button small kind="plain" label="닫기" onPress={close} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: c.sheet, color: c.ink, borderRadius: radius.md, borderColor: c.rule }]}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={search}
              returnKeyType="search"
              placeholder="예: 강남역 카페, 홍대 고깃집"
              placeholderTextColor={c['ink-2']}
              autoFocus
            />
            <Button small label="찾기" busy={busy} onPress={search} style={{ minHeight: 48 }} />
          </View>
          {error ? <Text style={[type.caption, { color: c.no, fontWeight: '600' }]}>{error}</Text> : null}
          {busy && !results ? <ActivityIndicator color={c.pen} /> : null}
          {results && !results.length ? <Text style={[type.body, { color: c['ink-2'] }]}>찾는 장소가 없어요. 다른 이름으로 찾아보세요.</Text> : null}
          <FlatList
            data={results || []}
            keyExtractor={(p) => String(p.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
            renderItem={({ item: p }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => { onChange(toMeetingPlace(p)); close() }}
                style={({ pressed }) => [styles.row, { backgroundColor: c.sheet, borderRadius: radius.md, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[type.body, { color: c.ink, fontWeight: '700' }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[type.caption, { color: c['ink-2'] }]} numberOfLines={1}>{[p.category, p.address].filter(Boolean).join(' · ')}</Text>
              </Pressable>
            )}
          />
          {place ? <Button kind="danger" label="정한 장소 지우기" onPress={() => { onChange(null); close() }} /> : null}
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  input: { minHeight: 48, paddingHorizontal: 12, fontSize: 16, borderWidth: 1 },
  row: { padding: 14, gap: 2 },
})
