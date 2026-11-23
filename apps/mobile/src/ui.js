// 앱 화면에서 같이 쓰는 작은 조각들 (웹의 sheet · 한 줄 행 · 버튼과 같은 모양)
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { type, useTheme } from './lib/theme'

/** 흰 카드 */
export function Card({ children, style, pad = 14 }) {
  const { c, radius } = useTheme()
  return <View style={[{ backgroundColor: c.sheet, borderRadius: radius.md, paddingHorizontal: pad, paddingVertical: 4 }, style]}>{children}</View>
}

/** 회색 작은 제목 + 카드 묶음. children이 없으면 빈 문구 */
export function Section({ title, right, empty, loading, children }) {
  const { c } = useTheme()
  const items = [].concat(children || []).filter(Boolean)
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.sectionHead}>
        <Text style={[type.caption, { color: c['ink-2'], fontWeight: '700' }]}>{title}</Text>
        {right}
      </View>
      <Card>
        {loading ? <Text style={[type.body, styles.empty, { color: c['ink-2'] }]}>불러오는 중…</Text> : items.length ? items : <Text style={[type.body, styles.empty, { color: c['ink-2'] }]}>{empty}</Text>}
      </Card>
    </View>
  )
}

/** 한 줄 약속 행: 왼쪽 타일(날짜·입력 현황) + 제목·설명 + 꼬리표 */
export function MeetingRow({ top, main, title, meta, tag, onPress, last }) {
  const { c } = useTheme()
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.rule }, pressed && { opacity: 0.6 }]}>
      <View style={[styles.tile, { backgroundColor: c['pen-soft'] }]}>
        <Text style={[type.caption, { color: c.accent, fontWeight: '600' }]}>{top}</Text>
        <Text style={{ fontSize: 17, lineHeight: 22, fontWeight: '800', color: c.accent }}>{main}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={[type.body, { color: c.ink, fontWeight: '600', flexShrink: 1 }]}>{title}</Text>
          {tag ? <Text style={[styles.tag, { backgroundColor: c['maybe-soft'], color: c.ink }]}>{tag}</Text> : null}
        </View>
        <Text numberOfLines={1} style={[type.caption, { color: c['ink-2'] }]}>{meta}</Text>
      </View>
    </Pressable>
  )
}

/** 버튼: primary(진한 파랑) · soft(연한 파랑) · plain(회색) · danger(빨강 글자) */
export function Button({ label, onPress, kind = 'primary', busy, disabled, style, small }) {
  const { c, radius } = useTheme()
  const look = {
    primary: { bg: c['pen-strong'], fg: c['pen-ink'] },
    soft: { bg: c['pen-soft'], fg: c.accent },
    plain: { bg: c['rule-2'], fg: c.ink },
    danger: { bg: c['rule-2'], fg: c.no },
  }[kind]
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={busy || disabled}
      style={({ pressed }) => [{ minHeight: small ? 36 : 52, paddingHorizontal: small ? 12 : 16, borderRadius: radius.md, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.5 : pressed || busy ? 0.8 : 1 }, style]}
    >
      {busy ? <ActivityIndicator color={look.fg} /> : <Text style={[small ? type.caption : type.heading, { color: look.fg, fontWeight: '700' }]}>{label}</Text>}
    </Pressable>
  )
}

/** 이름 첫 글자 동그라미 */
export function Avatar({ name, size = 36 }) {
  const { c } = useTheme()
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c['pen-soft'], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.accent, fontWeight: '700', fontSize: size * 0.4 }}>{(name || '?').trim().slice(0, 1)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  empty: { paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  tile: { width: 48, paddingVertical: 4, alignItems: 'center', borderRadius: 12 },
  tag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, borderRadius: 999, overflow: 'hidden' },
})
