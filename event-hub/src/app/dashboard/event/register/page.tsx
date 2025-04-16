'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event_id')
  const [formSchema, setFormSchema] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!eventId) return
  
    supabase
      .from('events')
      .select('form_schema')
      .eq('event_id', eventId)
      .single()
      .then(({ data }) => {
        setFormSchema(data?.form_schema || null)
      })
  }, [eventId])

  const handleChange = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!userInfo || !formSchema) return

    const payload = {
      event_id: eventId,
      user_id: userInfo.user_id,
      user_info_snapshot: userInfo,
      answers,
    }

    const { error } = await supabase.from('registrations').insert(payload)

    setMessage(error ? `❌ 報名失敗：${error.message}` : '✅ 報名成功！')
  }

  useEffect(() => {
    if (!formSchema?.personalFields) return
  
    supabase.auth.getUser().then(async ({ data }) => {
      const user_id = data.user?.id
      if (!user_id) return
  
      const { data: userData } = await supabase
        .from('users')
        .select(['user_id', ...formSchema.personalFields].join(','))
        .eq('user_id', user_id)
        .single()
  
      setUserInfo(userData || {})
    })
  }, [formSchema])

  if (!formSchema || !userInfo) return <p className="p-4">Loading...</p>

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">報名表單</h1>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">個人資料（自動帶入）</h2>
        {formSchema.personalFields?.map((field: string) => (
          <div key={field} className="mb-2">
            <label className="block text-sm text-gray-700">
              {field}
              <input
                className="w-full border px-3 py-2 rounded bg-gray-100"
                value={userInfo[field] || ''}
                readOnly
              />
            </label>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">自訂欄位</h2>
        {formSchema.customQuestions?.map((q: any) => (
          <div key={q.id} className="mb-4">
            <label className="block text-sm text-gray-700 font-medium">
              {q.label} {q.required && '*'}
            </label>
            {q.type === 'text' && (
              <input
                className="w-full border px-3 py-2 rounded"
                value={answers[q.id] || ''}
                onChange={(e) => handleChange(q.id, e.target.value)}
              />
            )}
            {q.type === 'textarea' && (
              <textarea
                className="w-full border px-3 py-2 rounded"
                value={answers[q.id] || ''}
                onChange={(e) => handleChange(q.id, e.target.value)}
              />
            )}
            {q.type === 'select' && (
              <select
                className="w-full border px-3 py-2 rounded"
                value={answers[q.id] || ''}
                onChange={(e) => handleChange(q.id, e.target.value)}
              >
                <option value="">請選擇</option>
                {q.options?.map((opt: string, i: number) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        送出報名
      </button>

      {message && <p className="text-green-600 mt-4 text-sm">{message}</p>}
    </div>
  )
}
