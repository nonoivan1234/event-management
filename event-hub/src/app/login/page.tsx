'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async () => {
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg('登入失敗：' + error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md space-y-4 border border-gray-200 rounded-lg p-6 shadow">
        <h1 className="text-2xl font-bold text-center">登入帳號</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full border px-3 py-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="密碼"
          className="w-full border px-3 py-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={async () => {
            await handleLogin()
            router.push('/dashboard')
          }}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          登入
        </button>

        {errorMsg && (
          <p className="text-sm text-red-600 text-center">{errorMsg}</p>
        )}

        <p className="text-sm text-center text-gray-600">
          還沒有帳號嗎？<a href="/signup" className="text-blue-600 hover:underline">註冊</a>
        </p>
      </div>
    </div>
  )
}