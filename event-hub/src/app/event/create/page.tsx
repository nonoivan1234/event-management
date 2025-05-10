'use client'

import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function CreateEventPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage('')

    // 👉 表單欄位檢查
    if (!form.title || !form.deadline) {
      setMessage('❗ 請完整填寫所有欄位')
      setLoading(false)
      return
    }

    if(form.deadline <= new Date().toISOString().split('T')[0]) {
      setMessage('❗ 截止日期必須在今天之後')
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('❗ 請先登入')
      setLoading(false)
      return
    }

    const { error, data } = await supabase
      .from('events')
      .insert({
        ...form,
        organizer_id: user.id,
        form_schema: {"personalFields": ["name"], "customQuestions": []}
      })
      .select()
      .single()

    if (error) {
      setMessage('❌ 建立失敗：' + error.message)
      console.log(user.id, form)
    } else {
      setMessage('✅ 活動已建立')
      router.push(`/event/edit-form?id=${data.event_id}`)
    }

    setLoading(false)
  }


  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4 text-center text-gray-900 dark:text-white">建立新活動</h1>

        <label className="block mb-2 text-gray-700 dark:text-gray-200">
          活動名稱
          <input
            required
            className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
          />
        </label>

        <label className="block mb-2 text-gray-700 dark:text-gray-200">
          活動說明
          <textarea
            className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
          />
        </label>

        <label className="block mb-2 text-gray-700 dark:text-gray-200">
          表單截止日期
          <input
            required
            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
            type="date"
            className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={form.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
          />
        </label>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '建立中...' : '建立活動'}
        </button>

        {message && (
          <p className="text-center mt-2 text-sm text-green-600 dark:text-green-400">{message}</p>
        )}
    </div>
  )
}
