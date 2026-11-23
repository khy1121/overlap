import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { ageOf, dotted, parseBirth } from '@overlap/core/identity'
import { signIn, signUp } from '../lib/auth'
import { type, useTheme } from '../lib/theme'

/**
 * 이름·생년월일 로그인 / 회원가입 (웹 AuthForm과 같은 규칙).
 * 카카오 로그인은 앱용 흐름이 필요해서 #19에서 붙여요.
 */
export default function LoginScreen() {
  const { c, radius } = useTheme()
  const [tab, setTab] = useState('login')
  const [form, setForm] = useState({ name: '', birth: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const signup = tab === 'signup'
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  async function submit() {
    setError('')
    const birth = parseBirth(form.birth)
    if (!form.name.trim()) return setError('이름을 입력해 주세요.')
    if (!birth) return setError('생년월일을 8자리(19990315)나 6자리(990315)로 입력해 주세요.')
    if (signup && ageOf(birth) < 14) return setError('만 14세 이상만 가입할 수 있어요.')
    if (form.password.length < 6) return setError('비밀번호는 6자 이상이에요.')
    if (signup && form.password !== form.confirm) return setError('비밀번호가 서로 달라요.')
    setBusy(true)
    try {
      await (signup ? signUp({ ...form, birth }) : signIn({ ...form, birth }))
      // 로그인되면 App이 세션 변화를 받아 홈으로 넘어가요
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const input = [styles.input, { backgroundColor: c['rule-2'], color: c.ink, borderRadius: radius.md }]
  const label = [type.caption, { color: c['ink-2'], fontWeight: '600' }]
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={[type.title, { color: c.ink }]}>
          모두 되는 시간,{'\n'}
          <Text style={{ color: c.accent }}>Overlap</Text>이 찾아 드려요
        </Text>
        <Text style={[type.body, { color: c['ink-2'], marginTop: 6 }]}>각자 되는 시간을 칠하면 겹치는 시간을 골라 제안해요.</Text>

        <View style={[styles.card, { backgroundColor: c.sheet, borderRadius: radius.lg }]}>
          <View style={[styles.seg, { backgroundColor: c['rule-2'] }]} accessibilityRole="tablist">
            {[['login', '로그인'], ['signup', '회원가입']].map(([k, t]) => (
              <Pressable
                key={k}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === k }}
                onPress={() => { setTab(k); setError('') }}
                style={[styles.segItem, tab === k && { backgroundColor: c.sheet }]}
              >
                <Text style={[type.body, { fontWeight: '600', color: tab === k ? c.ink : c['ink-2'] }]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={label}>이름</Text>
          <TextInput style={input} value={form.name} onChangeText={set('name')} placeholder="홍길동" placeholderTextColor={c['ink-2']} maxLength={20} autoComplete="name" />
          <Text style={label}>생년월일</Text>
          <TextInput
            style={input}
            value={dotted(form.birth.replace(/\D/g, ''))}
            onChangeText={(v) => set('birth')(v.replace(/\D/g, '').slice(0, 8))}
            placeholder="예: 990315"
            placeholderTextColor={c['ink-2']}
            keyboardType="number-pad"
          />
          <Text style={label}>비밀번호</Text>
          <TextInput style={input} value={form.password} onChangeText={set('password')} secureTextEntry placeholder={signup ? '6자 이상' : ''} placeholderTextColor={c['ink-2']} />
          {signup && (
            <>
              <Text style={label}>비밀번호 확인</Text>
              <TextInput style={input} value={form.confirm} onChangeText={set('confirm')} secureTextEntry />
            </>
          )}
          {!!error && (
            <Text style={[type.caption, styles.error, { backgroundColor: c['no-soft'], color: c.ink, borderRadius: radius.md }]} accessibilityRole="alert">{error}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [styles.primary, { backgroundColor: c['pen-strong'], borderRadius: radius.md, opacity: busy || pressed ? 0.8 : 1 }]}
          >
            {busy ? <ActivityIndicator color={c['pen-ink']} /> : <Text style={[type.heading, { color: c['pen-ink'] }]}>{signup ? '가입하고 시작하기' : '로그인'}</Text>}
          </Pressable>
          <Text style={[type.caption, { color: c['ink-2'] }]}>
            {signup
              ? '이름과 생년월일이 같은 계정은 하나만 만들 수 있어요. 생년월일은 로그인 확인에만 쓰고 그대로 저장하지 않아요. 만 14세 이상만 가입할 수 있어요.'
              : '비밀번호를 잊으면 되찾을 수 없어요. 가입할 때 쓴 이름과 생년월일을 그대로 입력해 주세요.'}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  wrap: { padding: 20, paddingTop: 72, gap: 4 },
  card: { marginTop: 24, padding: 20, gap: 8 },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 4, marginBottom: 8 },
  segItem: { flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, paddingHorizontal: 14, fontSize: 16 },
  error: { padding: 12, overflow: 'hidden' },
  primary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
})
