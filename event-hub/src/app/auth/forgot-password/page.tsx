'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReset = async () => {
    setMessage('')
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/reset-password`,
    })

    setLoading(false)

    // 安全處理：無論成功與否，都顯示相同訊息
    if (error)
      console.error('resetPasswordForEmail error:', error.message)

    setMessage('📧 如果這個 Email 有註冊，我們已寄出密碼重設信。請檢查你的信箱。')
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-md space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">忘記密碼</h1>

        <input
          type="email"
          placeholder="請輸入註冊時的 Email"
          className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {if (e.key === "Enter") handleReset();}}
        />

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? '寄送中...' : '寄送重設密碼連結'}
        </button>

        {message && <p className="text-sm text-green-600 text-center">{message}</p>}
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          想起密碼了？{' '}
          <a href="/auth/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            回到登入頁面
          </a>
        </p>
      </div>
    </div>
  )
}
