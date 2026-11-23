// 이름·생년월일 로그인·가입: 규칙은 @overlap/core (웹과 같은 식별자), SHA-256만 expo-crypto로
import * as Crypto from 'expo-crypto'
import * as core from '@overlap/core/api/auth'
import { supabase } from './supabase'

const sha256Hex = (text) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text)

export const signIn = (form) => core.signIn(supabase, form, sha256Hex)
export const signUp = (form) => core.signUp(supabase, form, sha256Hex)
export const signOut = () => supabase.auth.signOut()
export { displayName } from '@overlap/core/api/auth'
