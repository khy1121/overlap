import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { deleteAccount } from '@overlap/core/api/profile'
import { confirmAge14 } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { type, useTheme } from '../lib/theme'
import { Button } from '../ui'

/**
 * 만 14세 이상 확인 (웹 Age14Gate와 같아요): Google·카카오로 처음 들어온 계정에 한 번만.
 * 아니라고 하면 개인정보보호법에 따라 방금 만든 계정 정보를 지우고 로그인 화면으로 돌아가요.
 */
export default function Age14Screen({ onDone }) {
  const { c, radius } = useTheme()
  const [step, setStep] = useState('ask')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(fn) {
    setBusy(true)
    setError('')
    try { await fn() } catch (e) { setError(e.message); setBusy(false) }
  }
  return (
    <View style={[styles.wrap, { backgroundColor: c.paper }]}>
      <View style={[styles.card, { backgroundColor: c.sheet, borderRadius: radius.lg }]}>
        {step === 'ask' ? (
          <>
            <Text style={[type.title, { color: c.ink }]}>시작하기 전에{'\n'}한 가지만요</Text>
            <Text style={[type.body, { color: c['ink-2'] }]}>Overlap은 만 14세 이상만 쓸 수 있어요. 생년월일은 받지 않아요.</Text>
            {error ? <Text style={[type.caption, { color: c.no }]}>{error}</Text> : null}
            <Button label="네, 만 14세 이상이에요" busy={busy} onPress={() => run(async () => { await confirmAge14(); await supabase.auth.refreshSession(); onDone?.() })} />
            <Button kind="plain" label="아니에요" disabled={busy} onPress={() => setStep('under')} />
          </>
        ) : (
          <>
            <Text style={[type.title, { color: c.ink }]}>아쉽지만 지금은{'\n'}쓸 수 없어요</Text>
            <Text style={[type.body, { color: c['ink-2'] }]}>만 14세 미만은 보호자 동의가 필요해서 가입할 수 없어요. 방금 만들어진 계정 정보는 바로 지울게요.</Text>
            {error ? <Text style={[type.caption, { color: c.no }]}>{error}</Text> : null}
            <Button label="계정 정보 지우고 나가기" busy={busy} onPress={() => run(() => deleteAccount(supabase, '탈퇴'))} />
            <Button kind="plain" label="잘못 눌렀어요" disabled={busy} onPress={() => setStep('ask')} />
          </>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { padding: 22, gap: 12 },
})
