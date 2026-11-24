import { useEffect, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { deleteAccount, myProfile, updateMyName } from '@overlap/core/api/profile'
import { KINDS, loadPrefs, savePrefs, sendTestPush } from '@overlap/core/api/notify'
import { appPushState, disableAppPush, enableAppPush } from '../lib/push'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { type, useTheme } from '../lib/theme'
import { openPrivacy, openTerms } from '../lib/web'
import { Button, Card } from '../ui'

/**
 * 설정: 표시 이름 · 알림(이 기기 켜기, 종류별, 테스트) · 이용약관 · 개인정보처리방침 · 로그아웃 · 회원 탈퇴.
 * 화면 테마는 기기 설정을 따라요.
 */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets() // 맨 아래 항목(회원 탈퇴)이 내비게이션 바에 가리지 않게
  const { c, radius } = useTheme()
  const [name, setName] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [confirm, setConfirm] = useState('')

  const [push, setPush] = useState(null) // appPushState 결과
  const [prefs, setPrefs] = useState(null)
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => { myProfile(supabase).then((p) => { setName(p?.name || ''); setSaved(p?.name || '') }) }, [])
  useEffect(() => {
    appPushState().then(setPush).catch(() => setPush('off'))
    loadPrefs(supabase).then(setPrefs).catch(() => {})
  }, [])

  async function togglePush(on) {
    setPushBusy(true)
    try {
      if (on) await enableAppPush()
      else await disableAppPush()
    } catch (e) {
      Alert.alert('', e.message)
    }
    setPush(await appPushState().catch(() => 'off'))
    setPushBusy(false)
  }
  async function toggleKind(key, on) {
    const next = { ...prefs, [key]: on }
    setPrefs(next)
    try { await savePrefs(supabase, next) } catch (e) { setPrefs(prefs); Alert.alert('', e.message) }
  }
  async function logout() {
    await disableAppPush() // 이 기기로 다른 계정 알림이 오지 않게
    await signOut()
  }

  async function saveName() {
    setBusy(true)
    try {
      const v = await updateMyName(supabase, name)
      setName(v)
      setSaved(v)
      Alert.alert('', '이름을 바꿨어요')
    } catch (e) {
      Alert.alert('', e.message)
    } finally {
      setBusy(false)
    }
  }
  async function withdraw() {
    setBusy(true)
    try {
      await deleteAccount(supabase, confirm) // 성공하면 로그아웃돼서 로그인 화면으로
    } catch (e) {
      Alert.alert('', e.message)
      setBusy(false)
    }
  }

  const Row = ({ label, onPress, danger }) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, { borderColor: c.rule }, pressed && { opacity: 0.6 }]}>
      <Text style={[type.body, { color: danger ? c.no : c.ink, fontWeight: '600' }]}>{label}</Text>
      <Text style={{ color: c['ink-2'] }}>›</Text>
    </Pressable>
  )

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={[styles.wrap, { paddingBottom: 20 + insets.bottom }]} keyboardShouldPersistTaps="handled">
      <Card style={{ paddingVertical: 12, gap: 6 }}>
        <Text style={[type.caption, { color: c['ink-2'], fontWeight: '600' }]}>표시 이름</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput style={[styles.input, { flex: 1, backgroundColor: c['rule-2'], color: c.ink, borderRadius: radius.md }]} value={name} onChangeText={setName} maxLength={20} />
          <Button small label="저장" busy={busy} disabled={!name.trim() || name.trim() === saved} onPress={saveName} style={{ minHeight: 48 }} />
        </View>
        <Text style={[type.caption, { color: c['ink-2'] }]}>친구 목록과 약속 참여자 목록에 보이는 이름이에요. 로그인할 때는 가입할 때 쓴 이름을 그대로 입력해 주세요.</Text>
      </Card>

      <Card style={{ paddingVertical: 6 }}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[type.body, { color: c.ink, fontWeight: '600' }]}>이 기기에서 알림 받기</Text>
            <Text style={[type.caption, { color: c['ink-2'] }]}>{{ on: '켜져 있어요', off: '꺼져 있어요', denied: '폰 설정에서 막혀 있어요', 'no-project': '앱 설치판에서 켤 수 있어요' }[push] || '확인하는 중…'}</Text>
          </View>
          <Switch accessibilityLabel="이 기기에서 알림 받기" value={push === 'on'} disabled={pushBusy || !['on', 'off'].includes(push)} onValueChange={togglePush} trackColor={{ true: c.pen }} />
        </View>
        {push === 'denied' && <Button small kind="plain" label="폰 알림 설정 열기" onPress={() => Linking.openSettings()} style={{ marginBottom: 8 }} />}
        {push === 'on' && prefs && (
          <>
            {KINDS.map((k) => (
              <View key={k.key} style={[styles.switchRow, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.rule }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { color: c.ink }]}>{k.label}</Text>
                  <Text style={[type.caption, { color: c['ink-2'] }]}>{k.desc}</Text>
                </View>
                <Switch accessibilityLabel={k.label} value={prefs[k.key] !== false} onValueChange={(v) => toggleKind(k.key, v)} trackColor={{ true: c.pen }} />
              </View>
            ))}
            <Button small kind="soft" label="테스트 알림 보내기" onPress={async () => { try { await sendTestPush(supabase) } catch (e) { Alert.alert('', e.message) } }} style={{ marginVertical: 8 }} />
          </>
        )}
      </Card>

      <Card>
        <Row label="이용약관" onPress={openTerms} />
        <Row label="개인정보처리방침" onPress={openPrivacy} />
        <Row label="로그아웃" onPress={logout} />
      </Card>

      {withdrawOpen ? (
        <Card style={{ paddingVertical: 14, gap: 10 }}>
          <Text style={[type.body, { color: c.ink }]}>프로필, 입력한 시간, 친구·친구 신청, 알림 설정이 바로 삭제되고 되돌릴 수 없어요. 내가 만든 약속은 다른 참여자에게 넘어가고, 혼자인 약속은 삭제돼요.</Text>
          <TextInput style={[styles.input, { backgroundColor: c['rule-2'], color: c.ink, borderRadius: radius.md }]} value={confirm} onChangeText={setConfirm} placeholder="계속하려면 ‘탈퇴’를 입력해 주세요" placeholderTextColor={c['ink-2']} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button kind="plain" label="취소" onPress={() => { setWithdrawOpen(false); setConfirm('') }} style={{ flex: 1 }} />
            <Button kind="danger" label="탈퇴하기" busy={busy} disabled={confirm.trim() !== '탈퇴'} onPress={withdraw} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Pressable onPress={() => setWithdrawOpen(true)} accessibilityRole="button" style={{ alignSelf: 'center', padding: 8 }}>
          <Text style={[type.caption, { color: c['ink-2'] }]}>회원 탈퇴</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 20, gap: 16 },
  input: { minHeight: 48, paddingHorizontal: 12, fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
})
