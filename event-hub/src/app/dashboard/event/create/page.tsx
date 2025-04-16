'use client'

import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage('請先登入')
      setLoading(false)
      return
    }

    const { error, data } = await supabase.from('events').insert({
      ...form,
      organizer_id: user.id,
    }).select().single()

    if (error) {
      setMessage('❌ 建立失敗：' + error.message)
      console.log(user.id, form)
    } else {
      setMessage('✅ 活動已建立')
      router.push(`/dashboard/event/edit-form?id=${data.event_id}`)
    }
    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">建立新活動</h1>

      <label className="block mb-2">
        活動名稱
        <input
          className="w-full border px-3 py-2 rounded"
          value={form.title}
          onChange={(e) => handleChange('title', e.target.value)}
        />
      </label>

      <label className="block mb-2">
        活動說明
        <textarea
          className="w-full border px-3 py-2 rounded"
          value={form.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </label>

      <label className="block mb-2">
        表單截止日期
        <input type="date" 
            className="w-full border px-3 py-2 rounded"
            value={form.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
        />
      </label>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        {loading ? '建立中...' : '建立活動'}
      </button>

      {message && <p className="text-center mt-4 text-sm text-green-600">{message}</p>}
    </div>
  )
}
