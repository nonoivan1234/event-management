'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 修改 <title>
    document.title = "Event Hub - Reset Password";
    // 修改 <meta name="description">
    const metaDescription = document.querySelector("meta[name='description']");
    if (metaDescription) {
      metaDescription.setAttribute("content", "重設密碼");
    } else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = "重設密碼";
      document.head.appendChild(meta);
    }
  }, []);

  useEffect(() => {
    // 驗證是否登入中（使用 magic link 登入）
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setError('⚠️ 無效或過期的連結，請重新申請。')
      }
    }
    checkSession()
  }, [])

  const handleResetPassword = async () => {
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError('❌ 兩次輸入的密碼不一致')
      return
    }

    if (newPassword.length < 6) {
      setError('❌ 密碼長度至少 6 字元')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setLoading(false)

    if (error) {
      setError('❌ 密碼重設失敗：' + error.message)
    } else {
      setMessage('✅ 密碼已成功重設！即將導向登入頁面...')
      setTimeout(() => {
        router.push('/auth/login')
      }, 1500)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-md space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">重設密碼</h1>

        <input
          type="password"
          placeholder="新密碼"
          className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="再次輸入新密碼"
          className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          onClick={handleResetPassword}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? '處理中...' : '確認重設密碼'}
        </button>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        {message && <p className="text-sm text-green-600 text-center">{message}</p>}
      </div>
    </div>
  )
}
