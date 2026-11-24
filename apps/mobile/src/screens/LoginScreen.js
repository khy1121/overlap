import { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { dotted, parseBirth } from '@overlap/core/identity'
import { checkEmailSignup, openPasswordReset, signIn, signInEmail, signInWithGoogle, signInWithKakao, signUpEmail } from '../lib/auth'
import { openPrivacy, openTerms } from '../lib/web'
import { type, useTheme } from '../lib/theme'

/**
 * 로그인·회원가입 (웹 AuthForm과 같은 구성, 2026-11 새 방식)
 * - 카카오 · Google로 시작하기 (앱 안 브라우저 → 앱으로 돌아와요, 처음이면 자동 가입)
 * - 이메일: 로그인 / 회원가입(인증 메일, 만 14세 이상) / 비밀번호 찾기 (메일의 링크는 웹에서 열려요)
 * - 이름·생년월일로 가입한 예전 계정: 로그인만
 */
export default function LoginScreen() {
  const { c, radius, brand } = useTheme()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset' | 'legacy' | 'sent'
  const [form, setForm] = useState({ email: '', password: '', confirm: '', age14: false, name: '', birth: '' })
  const [sent, setSent] = useState({ kind: '', email: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))
  const go = (m) => { setMode(m); setError('') }

  async function run(fn) {
    setError('')
    setBusy(true)
    try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  function submit() {
    if (mode === 'login') return run(() => signInEmail(form)) // 로그인되면 App이 세션 변화를 받아 홈으로
    if (mode === 'signup') {
      const bad = checkEmailSignup(form)
      if (bad) return setError(bad)
      return run(async () => {
        const { needsConfirm } = await signUpEmail(form)
        if (needsConfirm) { setSent({ kind: 'confirm', email: form.email.trim() }); setMode('sent') }
      })
    }
    if (mode === 'legacy') {
      const birth = parseBirth(form.birth)
      if (!form.name.trim()) return setError('이름을 입력해 주세요.')
      if (!birth) return setError('생년월일을 8자리(19990315)나 6자리(990315)로 입력해 주세요.')
      return run(() => signIn({ name: form.name, birth, password: form.password }))
    }
  }

  const input = [styles.input, { backgroundColor: c['rule-2'], color: c.ink, borderRadius: radius.md }]
  const label = [type.caption, { color: c['ink-2'], fontWeight: '600' }]
  const link = [type.caption, { color: c.accent, fontWeight: '700', textDecorationLine: 'underline' }]
  const primaryLabel = { login: '로그인', signup: '인증 메일 받고 가입하기', reset: '재설정 링크 받기', legacy: '로그인' }[mode]

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={[type.title, { color: c.ink }]}>
          모두 되는 시간,{'\n'}
          <Text style={{ color: c.accent }}>Overlap</Text>이 찾아 드려요
        </Text>
        <Text style={[type.body, { color: c['ink-2'], marginTop: 6 }]}>각자 되는 시간을 칠하면 겹치는 시간을 골라 제안해요.</Text>

        {mode === 'sent' ? (
          <View style={[styles.card, { backgroundColor: c.sheet, borderRadius: radius.lg }]}>
            <Text style={[type.heading, { color: c.ink }]}>메일을 보냈어요</Text>
            <Text style={[type.body, { color: c['ink-2'] }]}>
              <Text style={{ color: c.ink, fontWeight: '700' }}>{sent.email}</Text>로 {sent.kind === 'reset' ? '비밀번호 재설정 링크를' : '가입 인증 링크를'} 보냈어요.
              {sent.kind === 'reset' ? ' 링크에서 새 비밀번호를 정한 뒤 여기서 로그인해 주세요.' : ' 링크를 누른 뒤 여기서 이메일로 로그인해 주세요.'} 메일이 안 보이면 스팸함도 확인해 주세요.
            </Text>
            <Pressable accessibilityRole="button" onPress={() => go('login')} style={{ paddingVertical: 8 }}><Text style={link}>로그인 화면으로</Text></Pressable>
          </View>
        ) : (
          <>
            {mode !== 'legacy' && (
              <>
                <View style={{ gap: 8, marginTop: 20 }}>
                  <Pressable accessibilityRole="button" onPress={() => run(signInWithKakao)} disabled={busy}
                    style={({ pressed }) => [styles.primary, { backgroundColor: pressed ? brand['kakao-hover'] : brand.kakao, borderRadius: radius.md }]}>
                    <Text style={[type.heading, { color: '#191919' }]}>카카오로 시작하기</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => run(signInWithGoogle)} disabled={busy}
                    style={({ pressed }) => [styles.primary, { backgroundColor: pressed ? '#f8f9fa' : '#ffffff', borderRadius: radius.md, borderWidth: 1, borderColor: '#dadce0' }]}>
                    <Text style={[type.heading, { color: '#1f1f1f' }]}>Google로 시작하기</Text>
                  </Pressable>
                </View>
                <View style={styles.or}>
                  <View style={[styles.orLine, { backgroundColor: c.rule }]} />
                  <Text style={[type.caption, { color: c['ink-2'] }]}>또는 이메일로</Text>
                  <View style={[styles.orLine, { backgroundColor: c.rule }]} />
                </View>
              </>
            )}

            <View style={[styles.card, { marginTop: mode === 'legacy' ? 24 : 0, backgroundColor: c.sheet, borderRadius: radius.lg }]}>
              {(mode === 'login' || mode === 'signup') && (
                <View style={[styles.seg, { backgroundColor: c['rule-2'] }]} accessibilityRole="tablist">
                  {[['login', '로그인'], ['signup', '회원가입']].map(([k, t]) => (
                    <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: mode === k }} onPress={() => go(k)} style={[styles.segItem, mode === k && { backgroundColor: c.sheet }]}>
                      <Text style={[type.body, { fontWeight: '600', color: mode === k ? c.ink : c['ink-2'] }]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {mode === 'reset' && <Text style={[type.heading, { color: c.ink, marginBottom: 4 }]}>비밀번호 찾기</Text>}
              {mode === 'legacy' && (
                <View style={{ marginBottom: 4, gap: 2 }}>
                  <Text style={[type.heading, { color: c.ink }]}>이름·생년월일 계정으로 로그인</Text>
                  <Text style={[type.caption, { color: c['ink-2'] }]}>예전에 이름과 생년월일로 가입한 계정이에요. 새 가입은 카카오·Google·이메일로 해 주세요.</Text>
                </View>
              )}

              {mode === 'legacy' ? (
                <>
                  <Text style={label}>이름</Text>
                  <TextInput style={input} value={form.name} onChangeText={set('name')} placeholder="홍길동" placeholderTextColor={c['ink-2']} maxLength={20} />
                  <Text style={label}>생년월일</Text>
                  <TextInput style={input} value={form.birth} onChangeText={(v) => set('birth')(dotted(v.replace(/\D/g, '').slice(0, 8)))} placeholder="예: 990315" placeholderTextColor={c['ink-2']} keyboardType="number-pad" maxLength={10} />
                </>
              ) : (
                <>
                  <Text style={label}>이메일</Text>
                  <TextInput style={input} value={form.email} onChangeText={set('email')} placeholder="name@example.com" placeholderTextColor={c['ink-2']} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
                </>
              )}
              {mode !== 'reset' && (
                <>
                  <Text style={label}>비밀번호</Text>
                  <TextInput style={input} value={form.password} onChangeText={set('password')} secureTextEntry placeholder={mode === 'signup' ? '8자 이상' : ''} placeholderTextColor={c['ink-2']} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                </>
              )}
              {mode === 'signup' && (
                <>
                  <Text style={label}>비밀번호 확인</Text>
                  <TextInput style={input} value={form.confirm} onChangeText={set('confirm')} secureTextEntry autoComplete="new-password" />
                  <View style={styles.checkRow}>
                    <Switch value={form.age14} onValueChange={set('age14')} trackColor={{ true: c.pen }} accessibilityLabel="만 14세 이상이에요" />
                    <Text style={[type.body, { color: c.ink, fontWeight: '600' }]}>만 14세 이상이에요</Text>
                  </View>
                </>
              )}

              {error ? <Text style={[type.caption, styles.error, { color: c.ink, backgroundColor: c['no-soft'], borderRadius: radius.md }]} accessibilityLiveRegion="polite">{error}</Text> : null}
              <Pressable accessibilityRole="button" onPress={submit} disabled={busy}
                style={({ pressed }) => [styles.primary, { backgroundColor: c['pen-strong'], borderRadius: radius.md, opacity: busy || pressed ? 0.8 : 1 }]}>
                {busy ? <ActivityIndicator color={c['pen-ink']} /> : <Text style={[type.heading, { color: c['pen-ink'] }]}>{primaryLabel}</Text>}
              </Pressable>

              <View style={styles.links}>
                {mode === 'login' && <Pressable accessibilityRole="button" onPress={openPasswordReset} hitSlop={8}><Text style={link}>비밀번호를 잊었어요</Text></Pressable>}
                {mode === 'legacy' && <Pressable accessibilityRole="button" onPress={() => go('login')} hitSlop={8}><Text style={link}>← 이메일 로그인으로</Text></Pressable>}
              </View>
              <Text style={[type.caption, { color: c['ink-2'] }]}>
                {mode === 'signup' ? '가입하면' : '로그인하면'} <Text style={link} onPress={openTerms}>이용약관</Text>과 <Text style={link} onPress={openPrivacy}>개인정보처리방침</Text>에 동의하는 것으로 봐요.
              </Text>
            </View>
            {mode !== 'legacy' && (
              <Pressable accessibilityRole="button" onPress={() => go('legacy')} style={{ alignSelf: 'center', padding: 12 }}>
                <Text style={[type.caption, { color: c['ink-2'], textDecorationLine: 'underline' }]}>이름·생년월일로 가입한 계정이에요</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  wrap: { padding: 20, paddingTop: 72, paddingBottom: 40, gap: 4 },
  card: { marginTop: 24, padding: 20, gap: 8 },
  seg: { flexDirection: 'row', borderRadius: 999, padding: 4, marginBottom: 8 },
  segItem: { flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, paddingHorizontal: 14, fontSize: 16 },
  error: { padding: 12, overflow: 'hidden' },
  primary: { minHeight: 52, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  links: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 4 },
})
