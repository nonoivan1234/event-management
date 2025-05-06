'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    student_id: '',
    phone: '',
    school: '',
  })
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) return

      setUserId(user.id)
      setEmail(user.email ?? null)

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single()

      if (data) {
        setForm({
          name: data.name ?? '',
          student_id: data.student_id ?? '',
          phone: data.phone ?? '',
          school: data.school ?? '',
        })
      }
    }

    fetchProfile()
  }, [])

  const handleSave = async () => {
    if (!userId) {
      setMessage('⚠️ 尚未取得使用者 ID')
      setIsError(true)
      return
    }

    const { error } = await supabase
      .from('users')
      .update(form)
      .eq('email', email)

    if (error) {
      setMessage(`❌ 更新失敗：${error.message}`)
      setIsError(true)
    } else {
      setMessage('✅ 資料已成功更新！')
      setIsError(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4 text-black dark:text-white">
      <h1 className="text-2xl font-bold mb-4">🧑 我的個人資料</h1>
      {email && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Email：{email}
        </p>
      )}

      {['name', 'student_id', 'phone', 'school'].map((field) => (
        <label key={field} className="block mb-4">
          {field === 'name'
            ? '姓名'
            : field === 'student_id'
            ? '學號'
            : field === 'phone'
            ? '電話'
            : '就讀學校'}
          <input
            type="text"
            className="w-full border px-3 py-2 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            value={(form as any)[field]}
            onChange={(e) =>
              setForm({ ...form, [field]: e.target.value })
            }
          />
        </label>
      ))}

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
      >
        💾 儲存變更
      </button>

      <button
        onClick={() => router.push('/dashboard')}
        className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 mt-4 transition-colors"
      >
        🔙 返回 Dashboard
      </button>

      {message && (
        <p
          className={`text-sm text-center mt-4 ${
            isError ? 'text-red-500' : 'text-green-500'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
