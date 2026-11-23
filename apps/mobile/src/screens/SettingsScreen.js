import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { deleteAccount, myProfile, updateMyName } from '@overlap/core/api/profile'
import { supabase } from '../lib/supabase'
import { signOut } from '../lib/auth'
import { type, useTheme } from '../lib/theme'
import { openPrivacy } from '../lib/web'
import { Button, Card } from '../ui'

/**
 * 설정 (1차): 표시 이름 · 개인정보처리방침 · 로그아웃 · 회원 탈퇴.
 * 화면 테마는 기기 설정을 따라요. 알림(앱 푸시)은 #19에서.
 */
export default function SettingsScreen() {
  const { c, radius } = useTheme()
  const [name, setName] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [confirm, setConfirm] = useState('')

  useEffect(() => { myProfile(supabase).then((p) => { setName(p?.name || ''); setSaved(p?.name || '') }) }, [])

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
    <ScrollView style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Card style={{ paddingVertical: 12, gap: 6 }}>
        <Text style={[type.caption, { color: c['ink-2'], fontWeight: '600' }]}>표시 이름</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput style={[styles.input, { flex: 1, backgroundColor: c['rule-2'], color: c.ink, borderRadius: radius.md }]} value={name} onChangeText={setName} maxLength={20} />
          <Button small label="저장" busy={busy} disabled={!name.trim() || name.trim() === saved} onPress={saveName} style={{ minHeight: 48 }} />
        </View>
        <Text style={[type.caption, { color: c['ink-2'] }]}>친구 목록과 약속 참여자 목록에 보이는 이름이에요. 로그인할 때는 가입할 때 쓴 이름을 그대로 입력해 주세요.</Text>
      </Card>

      <Card>
        <Row label="개인정보처리방침" onPress={openPrivacy} />
        <Row label="로그아웃" onPress={signOut} />
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth },
})
