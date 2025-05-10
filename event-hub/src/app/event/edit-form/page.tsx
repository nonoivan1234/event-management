'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

const defaultPersonalFields = ['name', 'email', 'phone', 'student_id', 'school']

export default function EditFormPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')

  const [personalFields, setPersonalFields] = useState<string[]>([])
  const [customQuestions, setCustomQuestions] = useState<any[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!eventId) return
    supabase
      .from('events')
      .select('form_schema')
      .eq('event_id', eventId)
      .single()
      .then(({ data }) => {
        if (data?.form_schema) {
          setPersonalFields(data.form_schema.personalFields || [])
          setCustomQuestions(data.form_schema.customQuestions || [])
        }
      })
  }, [eventId])

  const togglePersonalField = (field: string) => {
    setPersonalFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    )
  }

  const addQuestion = () => {
    setCustomQuestions((prev) => [
      ...prev,
      { id: uuidv4(), label: '新問題', type: 'text', required: false }
    ])
  }

  const updateQuestion = (id: string, changes: any) => {
    setCustomQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...changes } : q))
    )
  }

  const deleteQuestion = (id: string) => {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const handleSave = async () => {
    if (!eventId) return

    // ✅ 驗證至少有一種欄位
    if (personalFields.length === 0 && customQuestions.length === 0) {
      setMessage('❗請至少選擇一項個人欄位或新增一題自訂問題')
      return
    }

    // ✅ 驗證每一題都有非空 label
    const hasEmptyLabel = customQuestions.some(q => !q.label?.trim())
    if (hasEmptyLabel) {
      setMessage('❗所有自訂問題都必須填寫標題')
      return
    }

    const { error } = await supabase.from('events')
      .update({ form_schema: { personalFields, customQuestions } })
      .eq('event_id', eventId)

    setMessage(error ? `❌ 儲存失敗：${error.message}` : '✅ 表單已儲存！即將返回')
    if (!error) setTimeout(() => router.push('/event/hold'), 1000)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-6">Create Registration Form</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-2">Select Personal Information Fields</h2>
          {defaultPersonalFields.map((field) => (
            <label key={field} className="block text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={personalFields.includes(field)}
                onChange={() => togglePersonalField(field)}
              />{' '}
              {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
            </label>
          ))}
        </div>
        <div>
          <h2 className="font-semibold mb-2">Form Preview</h2>
          <div className="border rounded p-4 bg-white dark:bg-gray-800 dark:border-gray-600">
            <p className="font-medium mb-2">Personal Information</p>
            {personalFields.map((field) => (
              <p key={field} className="text-sm text-gray-700 dark:text-gray-300">{field}: [Auto-filled]</p>
            ))}
            <hr className="my-2 dark:border-gray-600" />
            {customQuestions.map((q) => (
              <div key={q.id} className="mb-4">
                <p className="font-semibold">{q.label} {q.required ? '*' : ''}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Type: {q.type}</p>
                {q.type === 'select' && (
                  <ul className="list-disc ml-5 text-sm text-gray-700 dark:text-gray-300">
                    {q.options?.map((opt: string, i: number) => <li key={i}>{opt}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <hr className="my-6 dark:border-gray-600" />

      <div>
        <h2 className="font-semibold mb-2">Custom Questions</h2>
        {customQuestions.map((q) => (
          <div key={q.id} className="border p-4 rounded mb-4 dark:border-gray-600">
            <input
              className="w-full mb-2 border px-3 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={q.label}
              onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
            />
            <select
              className="w-full mb-2 border px-3 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={q.type}
              onChange={(e) => updateQuestion(q.id, { type: e.target.value })}
            >
              <option value="text">Text</option>
              <option value="textarea">Paragraph</option>
              <option value="select">Dropdown</option>
            </select>
            {q.type === 'select' && (
              <textarea
                className="w-full mb-2 border px-3 py-1 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="選項（每行一個）"
                value={q.options?.join('\n') || ''}
                onChange={(e) => updateQuestion(q.id, {
                  options: e.target.value.split('\n')
                })}
              />
            )}
            <label className="text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
              />
              必填
            </label>
            <button
              onClick={() => deleteQuestion(q.id)}
              className="bg-red-100 text-red-700 text-sm mt-2 px-2 py-1 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
            >
              刪除此題
            </button>
          </div>
        ))}
        <button
          onClick={addQuestion}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          ➕ 新增問題
        </button>
      </div>
      <hr className="my-6 dark:border-gray-600" />
      <div className="mt-4 flex gap-4">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          💾 儲存表單
        </button>
        {message && (
          <p className={`text-sm mt-2 ${
            message.startsWith('✅')
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {message}
          </p>
        )}
      </div>

      <div className="mt-4 flex">
        <button
          onClick={() => window.location.href = '/event/hold'}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          返回
        </button>
      </div>
    </div>
  )
}
