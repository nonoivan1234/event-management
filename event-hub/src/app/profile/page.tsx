'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) return

      setUserId(user.id)
      setEmail(user.email ?? null)

      const { data} = await supabase
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
      return
    }
  
    const { data, error } = await supabase
      .from('users')
      .update({
        name: form.name,
        student_id: form.student_id,
        phone: form.phone,
        school: form.school,
      })
      .eq('email', email)
  
    if (error) {
      setMessage(`❌ 更新失敗：${error.message}`)
    } else {
      setMessage('✅ 資料已成功更新！')
    }
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">🧑 我的個人資料</h1>
      {email && <p className="text-gray-600 mb-4">Email：{email}</p>}

      <label className="block mb-2">
        姓名
        <input
          type="text"
          className="w-full border px-3 py-2 rounded"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>

      <label className="block mb-2">
        學號
        <input
          type="text"
          className="w-full border px-3 py-2 rounded"
          value={form.student_id}
          onChange={(e) => setForm({ ...form, student_id: e.target.value })}
        />
      </label>

      <label className="block mb-2">
        電話
        <input
          type="text"
          className="w-full border px-3 py-2 rounded"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </label>

      <label className="block mb-4">
        就讀學校
        <input
          type="text"
          className="w-full border px-3 py-2 rounded"
          value={form.school}
          onChange={(e) => setForm({ ...form, school: e.target.value })}
        />
      </label>

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        儲存變更
      </button>

      <button
        onClick={() => window.location.href = '/dashboard'}
        className="w-full bg-gray-600 text-white py-2 rounded hover:bg-gray-700 mt-4"
      >
        返回 Dashboard
      </button>

      {message && <p className="text-sm text-center mt-4 text-green-600">{message}</p>}
    </div>
  )
}