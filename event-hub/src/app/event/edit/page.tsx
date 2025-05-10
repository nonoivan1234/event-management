'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function EditRegistrationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event_id')
  const [formSchema, setFormSchema] = useState<any>(null)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [message, setMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

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

  useEffect(() => {
    if (!formSchema) return
    supabase.auth.getUser().then(async ({ data }) => {
      const user_id = data.user?.id
      if (!user_id || !eventId) return

      setUserId(user_id)

      const { data: registration } = await supabase
        .from('registrations')
        .select('user_info_snapshot, answers')
        .eq('event_id', eventId)
        .eq('user_id', user_id)
        .single()

      setUserInfo(registration?.user_info_snapshot ?? {})
      setAnswers(registration?.answers ?? {})
    })
  }, [formSchema])

  const handleChange = (target: 'user' | 'custom', key: string, value: any) => {
    if (target === 'user') {
      setUserInfo((prev: any) => ({ ...prev, [key]: value }))
    } else {
      setAnswers((prev: any) => ({ ...prev, [key]: value }))
    }
  }

  const handleSubmit = async () => {
    if (!userId || !formSchema) return

    // 檢查個人資料欄位是否填寫
    const missingPersonalFields = formSchema.personalFields?.filter(
      (field: string) => !userInfo[field]?.toString().trim()
    )

    // 檢查自訂欄位中 required 的是否填寫
    const missingCustomQuestions = formSchema.customQuestions?.filter(
      (q: any) => q.required && !answers[q.id]?.toString().trim()
    )

    if (missingPersonalFields.length > 0 || missingCustomQuestions.length > 0) {
      const personalMsg = missingPersonalFields.length > 0
        ? `個人資料未填：${missingPersonalFields.join(', ')}`
        : ''
      const customMsg = missingCustomQuestions.length > 0
        ? `自訂欄位未填：${missingCustomQuestions.map((q: any) => q.label).join(', ')}`
        : ''
      setMessage(`❌ 請填寫所有必填欄位。\n${personalMsg} ${customMsg}`.trim())
      return
    }

    const { error } = await supabase
      .from('registrations')
      .update({
        user_info_snapshot: userInfo,
        answers,
      })
      .eq('event_id', eventId)
      .eq('user_id', userId)

    setMessage(error ? `❌ 更新失敗：${error.message}` : '✅ 更新成功！')
    if (!error) setTimeout(() => router.push('/event/attend'), 1000)
  }

  if (!formSchema || !userInfo) return <p className="p-4 text-gray-800 dark:text-white">Loading...</p>

  return (
    <div className="max-w-xl mx-auto p-6 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-4">編輯報名資料</h1>

      <div className="mb-6">
        <h2 className="font-semibold mb-2 text-gray-800 dark:text-white">個人資料</h2>
        {formSchema.personalFields?.map((field: string) => (
          <div key={field} className="mb-2">
            <label className="block text-sm text-gray-700 dark:text-gray-300">
              {field}
              <input
                required
                className="w-full border px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={userInfo[field] || ''}
                onChange={(e) => handleChange('user', field, e.target.value)}
              />
            </label>
          </div>
        ))}
      </div>

      {formSchema.customQuestions?.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2 text-gray-800 dark:text-white">自訂欄位</h2>
          {formSchema.customQuestions.map((q: any) => (
            <div key={q.id} className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {q.label} {q.required && '*'}
              </label>
              {q.type === 'text' && (
                <input
                  required={q.required}
                  className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={answers[q.id] || ''}
                  onChange={(e) => handleChange('custom', q.id, e.target.value)}
                />
              )}
              {q.type === 'textarea' && (
                <textarea
                  required={q.required}
                  className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={answers[q.id] || ''}
                  onChange={(e) => handleChange('custom', q.id, e.target.value)}
                />
              )}
              {q.type === 'select' && (
                <select
                  required={q.required}
                  className="w-full border px-3 py-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  value={answers[q.id] || ''}
                  onChange={(e) => handleChange('custom', q.id, e.target.value)}
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
      )}
      <div className="gap-4 flex">
        <button
          onClick={handleSubmit}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          儲存修改
        </button>
        <button
          onClick={() => router.push(`/event/attend`)}
          className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
        >
          返回活動列表
        </button>
      </div>
      {message && (
        <p className="text-red-600 dark:text-red-400 mt-4 text-sm whitespace-pre-wrap">{message}</p>
      )}
    </div>
  )
}
