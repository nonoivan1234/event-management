'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const router = useRouter()

  const handleSignUp = async () => {
    setMessage('')
    setIsError(false)

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

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
    }

    const { error: insertError } = await supabase.from('users').insert([
      {
        user_id: user.id,
        email: user.email,
        name: '',
        student_id: '',
        phone: '',
        school: '',
      },
    ])

    if (insertError) {
      setMessage(`註冊成功，但同步用戶資料失敗：${insertError.message}`)
      setIsError(true)
    } else {
      setMessage('✅ 註冊成功！請至信箱確認驗證信，然後登入系統。')
      setIsError(false)
      setTimeout(() => router.push('/login'), 2000)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen px-4 bg-white text-black dark:bg-gray-900 dark:text-white transition-colors duration-300">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">註冊新帳號</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border px-3 py-2 rounded w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        <input
          type="password"
          placeholder="密碼"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border px-3 py-2 rounded w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />

        <button
          onClick={handleSignUp}
          className="bg-green-600 text-white px-4 py-2 rounded w-full hover:bg-green-700"
        >
          註冊
        </button>

        {message && (
          <p className={`text-sm text-center ${isError ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}
