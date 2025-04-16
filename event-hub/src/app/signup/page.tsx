'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSignUp = async () => {
    setMessage('')

    // 註冊帳號
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      setMessage(`註冊失敗：${signUpError.message}`)
      return
    }

    const user = signUpData.user
    if (!user) {
      setMessage('註冊失敗，無法取得使用者資料')
      return
    }

    // 寫入 users 表（自建表）
    const { error: insertError } = await supabase.from('users').insert([
      {
        user_id: user.id,   // auth.users.id 對應你 users 表的主鍵
        email: user.email,
        name: '',           // 先空值，之後可讓使用者補
        student_id: '',
        phone: '',
        school: '',
      },
    ])

    if (insertError) {
      setMessage(`註冊成功，但同步用戶資料時失敗：${insertError.message}`)
    } else {
      setMessage('註冊成功！請至信箱確認驗證信，並登入系統。')
      router.push('/login') // 或導向登入頁
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-2xl font-bold">註冊新帳號</h1>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border px-3 py-2 rounded w-72"
      />
      <input
        type="password"
        placeholder="密碼"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="border px-3 py-2 rounded w-72"
      />
      <button
        onClick={handleSignUp}
        className="bg-green-600 text-white px-4 py-2 rounded w-72 hover:bg-green-700"
      >
        註冊
      </button>
      <p className="text-sm text-center text-gray-600 max-w-sm">{message}</p>
    </div>
  )
}