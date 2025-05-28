'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const router = useRouter()

  const handleSignUp = async () => {
    setMessage('')
    setIsError(false)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({email, password})

    if (signUpError) {
      setMessage(`註冊失敗：${signUpError.message}`)
      setIsError(true)
      return
    }

    const user = signUpData.user
    if (!user) {
      setMessage('註冊失敗，無法取得使用者資料')
      setIsError(true)
      return
    } else {
      await supabase.auth.signOut()
      setMessage('✅ 註冊成功！請至信箱驗證，等事後跳轉登入。')
      setTimeout(() => router.push('/auth/login'), 2000)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-white text-black dark:bg-gray-900 dark:text-white">
      <div className="w-full max-w-md space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center">註冊帳號</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSignUp() }}
          className="border px-3 py-2 rounded w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        <input
          type="password"
          placeholder="密碼"
          autoComplete='new-password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSignUp() }}
          className="border px-3 py-2 rounded w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />

        <button
          onClick={handleSignUp}
          className="bg-green-600 text-white px-4 py-2 rounded w-full hover:bg-green-700"
        >
          註冊
        </button>

        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          已經有帳號了嗎？{' '}
          <a href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            登入
          </a>
        </p>

        {message && (
          <p className={`text-sm text-center ${isError ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
