'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [attempted, setAttempted] = useState(false) // 登入嘗試過的 flag

  const handleLogin = async () => {
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error && error.message == 'Invalid login credentials') {
      setErrorMsg('❌ 登入失敗：請檢查您的電子郵件和密碼')
      setAttempted(true)
    } else if (error) {
      setErrorMsg('❌ 登入失敗：' + error.message)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-md space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">登入帳號</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {if (e.key === "Enter") handleLogin();}}
        />

        <input
          type="password"
          placeholder="密碼"
          className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {if (e.key === "Enter") handleLogin();}}
        />

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
        >
          登入
        </button>

         {/* 錯誤訊息只有在嘗試過登入後才顯示 */}
        {errorMsg && (
          <p className="text-sm text-center text-red-500">{errorMsg}</p>
        )}

        {/* 忘記密碼連結 */}
        {attempted && <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            忘記密碼了嗎？{' '}
          <a
            href="/auth/forgot-password"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            忘記密碼？
          </a>
        </p>}

        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          還沒有帳號嗎？{' '}
          <a href="/auth/signup" className="text-blue-600 dark:text-blue-400 hover:underline">
            註冊
          </a>
        </p>
      </div>
    </div>
  )
}
