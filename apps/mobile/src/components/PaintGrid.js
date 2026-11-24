import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native'
import { dayLabel, nDays } from '@overlap/core/schedule'
import { keysOf } from '@overlap/core/parts'
import { fill, longValue, paintState, tapValue } from '@overlap/core/paint'
import { type, useTheme } from '../lib/theme'

const CELL_H = 52
const GAP = 6
const LONG_MS = 450

/**
 * 큰 칸 칠하기 (시안 그대로): 되는 시간만, 한 번에 여러 칸.
 * - 누르기: 돼요(✓) ↔ 빈칸 / 길게 누르기: 애매해요(~) ↔ 빈칸
 * - 쭉 긋기: 시작 칸이 빈칸이면 칠하고, 칠한 칸이면 지우면서 지나간 칸 모두
 * - 요일·시간대 이름 누르기: 그 줄 전체 (전부 돼요면 지우기)
 * onBegin(): 한 번의 동작 시작(되돌리기 기록용), onSet(next): 칸 바꾸기, onStroke(true/false): 손가락이 칸 위에 있는 동안(화면 스크롤 잠그기)
 * 칸 위에서는 칠하기만 하고, 화면 스크롤은 왼쪽 요일 줄·칸 바깥에서 해요.
 */
export default function PaintGrid({ cfg, parts, cells, onBegin, onSet, onLongHint, onStroke }) {
  const { c, radius } = useTheme()
  const days = nDays(cfg)
  const [width, setWidth] = useState(0)
  const [pressing, setPressing] = useState(null)
  const g = useRef(null) // 진행 중인 손가락 동작
  const cellsRef = useRef(cells)
  cellsRef.current = cells

  const cellAt = (x, y) => {
    if (!width) return null
    const w = (width - GAP * (parts.length - 1)) / parts.length
    const col = Math.floor(x / (w + GAP))
    const row = Math.floor(y / (CELL_H + GAP))
    if (col < 0 || col >= parts.length || row < 0 || row >= days) return null
    const keys = keysOf(cfg, row, parts[col])
    return keys.length ? { id: `${row}-${col}`, keys } : null
  }
  const setLine = (keys) => {
    if (!keys.length) return
    onBegin()
    onSet(fill(cellsRef.current, keys, tapValue(cellsRef.current, keys)))
  }

  const responder = {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false, // 긋는 중에 스크롤이 가져가지 않게
    onResponderGrant: (e) => {
      const hit = cellAt(e.nativeEvent.locationX, e.nativeEvent.locationY)
      if (!hit) { g.current = null; return }
      onStroke?.(true)
      const value = tapValue(cellsRef.current, hit.keys)
      g.current = { start: hit, last: hit.id, moved: false, long: false, value }
      setPressing(hit.id)
      g.current.timer = setTimeout(() => {
        const cur = g.current
        if (!cur || cur.moved) return
        cur.long = true
        setPressing(null)
        Vibration.vibrate(15)
        onBegin()
        onSet(fill(cellsRef.current, hit.keys, longValue(cellsRef.current, hit.keys)))
      }, LONG_MS)
    },
    onResponderMove: (e) => {
      const cur = g.current
      if (!cur || cur.long) return
      const hit = cellAt(e.nativeEvent.locationX, e.nativeEvent.locationY)
      if (!hit || hit.id === cur.last) return
      let next = cellsRef.current
      if (!cur.moved) {
        cur.moved = true
        clearTimeout(cur.timer)
        setPressing(null)
        onBegin()
        next = fill(next, cur.start.keys, cur.value)
      }
      cur.last = hit.id
      next = fill(next, hit.keys, cur.value)
      cellsRef.current = next
      onSet(next)
    },
    onResponderRelease: () => {
      const cur = g.current
      g.current = null
      setPressing(null)
      onStroke?.(false)
      if (!cur) return
      clearTimeout(cur.timer)
      if (!cur.moved && !cur.long) {
        onBegin()
        onSet(fill(cellsRef.current, cur.start.keys, cur.value))
        onLongHint?.()
      }
    },
    onResponderTerminate: () => { if (g.current) clearTimeout(g.current.timer); g.current = null; setPressing(null); onStroke?.(false) },
  }

  const look = (st) => ({
    y: { bg: c.yes, border: c.yes, fg: '#fff', mark: '✓' },
    m: { bg: c['maybe-soft'], border: c.maybe, fg: c.ink, mark: '~' },
    mix: { bg: c['yes-soft'], border: c.yes, fg: c.ink, mark: '·' },
    '': { bg: c.sheet, border: c.rule, fg: c['ink-2'], mark: '' },
  }[st])

  return (
    <View style={{ gap: GAP }}>
      {/* 시간대 머리: 누르면 그 시간대 전체 */}
      <View style={styles.row}>
        <View style={styles.labelCol} />
        <View style={[styles.flexRow, { flex: 1 }]}>
          {parts.map((p) => (
            <Pressable
              key={p.from}
              accessibilityRole="button"
              accessibilityLabel={`${p.label} 전체`}
              onPress={() => setLine(Array.from({ length: days }, (_, d) => keysOf(cfg, d, p)).flat())}
              style={({ pressed }) => [styles.head, pressed && { backgroundColor: c['rule-2'] }]}
            >
              <Text style={[type.caption, { fontWeight: '700', color: c.ink }]}>{p.label}</Text>
              {p.sub ? <Text style={{ fontSize: 11, color: c['ink-2'] }}>{p.sub}</Text> : null}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        {/* 요일 줄: 누르면 그날 전체 (여기서 위아래로 밀면 화면이 움직여요) */}
        <View style={[styles.labelCol, { gap: GAP }]}>
          {Array.from({ length: days }, (_, d) => {
            const [md, dow] = dayLabel(cfg, d).split(' ')
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${dayLabel(cfg, d)} 하루 전체`}
                onPress={() => setLine(parts.flatMap((p) => keysOf(cfg, d, p)))}
                style={({ pressed }) => [styles.day, pressed && { backgroundColor: c['rule-2'] }]}
              >
                <Text style={[type.body, { fontWeight: '700', color: c.ink }]}>{dow.replace(/[()]/g, '')}</Text>
                <Text style={{ fontSize: 11, color: c['ink-2'] }}>{md}</Text>
              </Pressable>
            )
          })}
        </View>

        {/* 칸: 손가락 동작은 이 판 하나가 받아요 (칸들은 그림만) */}
        <View style={{ flex: 1 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...responder}>
          <View pointerEvents="none" style={{ gap: GAP }}>
            {Array.from({ length: days }, (_, d) => (
              <View key={d} style={styles.flexRow}>
                {parts.map((p, col) => {
                  const keys = keysOf(cfg, d, p)
                  const st = paintState(cells, keys)
                  if (st === 'x') return <View key={p.from} style={[styles.cell, { borderRadius: 12, backgroundColor: c['rule-2'], opacity: 0.5 }]} />
                  const l = look(st)
                  const id = `${d}-${col}`
                  return (
                    <View
                      key={p.from}
                      accessible
                      accessibilityLabel={`${dayLabel(cfg, d)} ${p.label}: ${st === 'y' ? '돼요' : st === 'm' ? '애매해요' : st === 'mix' ? '일부 돼요' : '안 돼요'}`}
                      style={[styles.cell, { borderRadius: 12, backgroundColor: l.bg, borderColor: l.border, borderWidth: st === 'm' ? 2 : 1, transform: [{ scale: pressing === id ? 0.94 : 1 }] }]}
                    >
                      {st === 'm' ? <View style={[StyleSheet.absoluteFill, styles.stripes]}>{STRIPES.map((i) => <View key={i} style={[styles.stripe, { left: i * 12 - 30, backgroundColor: c.maybe }]} />)}</View> : null}
                      <Text style={{ fontSize: 18, fontWeight: '800', color: l.fg }}>{l.mark}</Text>
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  )
}

const STRIPES = Array.from({ length: 14 }, (_, i) => i)

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: GAP },
  flexRow: { flexDirection: 'row', gap: GAP },
  labelCol: { width: 48 },
  head: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  day: { height: CELL_H, justifyContent: 'center', paddingLeft: 4, borderRadius: 10 },
  cell: { flex: 1, height: CELL_H, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stripes: { overflow: 'hidden', opacity: 0.55 },
  stripe: { position: 'absolute', top: -20, width: 4, height: 100, transform: [{ rotate: '45deg' }] },
})
