'use client'

import { useEffect, useState, KeyboardEvent } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

const defaultPersonalFields = ['name', 'email', 'phone', 'student_id', 'school']

export default function EventFormPage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')
  const isEdit = !!eventId
  const router = useRouter()

  const [form, setForm] = useState({
    title: '',
    description: '',
    deadline: '',
    categories: [] as string[],
  })
  const [categoryInput, setCategoryInput] = useState('')
  const [personalFields, setPersonalFields] = useState<string[]>([])
  const [customQuestions, setCustomQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!eventId) return
    supabase.from('events')
      .select('title, description, deadline, category, form_schema')
      .eq('event_id', eventId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) router.replace('/404')
        let categories: string[] = []
        try {
          categories = typeof data.category === 'string' ? JSON.parse(data.category) : []
        } catch {
          categories = []
        }
        setForm({
          title: data.title,
          description: data.description,
          deadline: data.deadline,
          categories,
        })
        setPersonalFields(data.form_schema?.personalFields ?? [])
        setCustomQuestions(data.form_schema?.customQuestions ?? [])
      })
  }, [eventId])

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleCategoryKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const value = categoryInput.trim()
      if (value && !form.categories.includes(value)) {
        setForm(prev => ({ ...prev, categories: [...prev.categories, value] }))
      }
      setCategoryInput('')
    }
  }

  const removeCategory = (cat: string) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== cat),
    }))
  }

  const togglePersonalField = (field: string) => {
    setPersonalFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    )
  }

  const addQuestion = () => {
    setCustomQuestions(prev => [...prev, {
      id: uuidv4(),
      label: '新問題',
      type: 'text',
      required: false,
    }])
  }

  const updateQuestion = (id: string, changes: any) => {
    setCustomQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, ...changes } : q)
    )
  }

  const deleteQuestion = (id: string) => {
    setCustomQuestions(prev => prev.filter(q => q.id !== id))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage('')

    if (!form.title || !form.deadline) {
      setMessage('❗ 請完整填寫所有欄位')
      setLoading(false)
      return
    }

    if (form.deadline <= new Date().toISOString().split('T')[0]) {
      setMessage('❗ 截止日期必須在今天之後')
      setLoading(false)
      return
    }

    if (personalFields.length === 0 && customQuestions.length === 0) {
      setMessage('❗請至少選擇一項個人欄位或新增一題自訂問題')
      setLoading(false)
      return
    }

    if (customQuestions.some(q => !q.label.trim())) {
      setMessage('❗ 所有自訂問題都必須填寫標題')
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMessage('❗ 請先登入')
      setLoading(false)
      return
    }

    const payload = {
      title: form.title,
      description: form.description,
      deadline: form.deadline,
      category: JSON.stringify(form.categories),
      form_schema: { personalFields, customQuestions },
    }

    if (isEdit) {
      const { error } = await supabase.from('events').update(payload).eq('event_id', eventId)
      setMessage(error ? `❌ 更新失敗：${error.message}` : '✅ 活動已更新')
      if (!error) setTimeout(() => router.push('/event/hold'), 1000)
    } else {
      const { error, data } = await supabase.from('events')
        .insert({ ...payload, organizer_id: user.id })
        .select()
        .single()
      setMessage(error ? `❌ 建立失敗：${error.message}` : '✅ 活動已建立')
      if (!error) router.push(`/event/hold`)
    }

    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-6 text-center">
        {isEdit ? '編輯活動' : '建立新活動'}
      </h1>

      <label className="block mb-2">活動名稱
        <input className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:text-white"
          value={form.title} onChange={(e) => handleChange('title', e.target.value)} />
      </label>

      <label className="block mb-2">活動說明
        <textarea className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:text-white"
          value={form.description} onChange={(e) => handleChange('description', e.target.value)} />
      </label>

      <label className="block mb-2">截止日期
        <input type="date"
          className="w-full border px-3 py-2 rounded mt-1 dark:bg-gray-700 dark:text-white"
          min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
          value={form.deadline}
          onChange={(e) => handleChange('deadline', e.target.value)} />
      </label>

      <label className="block mb-2">活動類別</label>
      <div className="w-full border px-3 py-2 rounded flex flex-wrap items-center gap-2 dark:bg-gray-700">
        {Array.isArray(form.categories) && form.categories.map(cat => (
          <span key={cat} className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-sm flex items-center">
            {cat}
            <button className="ml-1 text-red-500" onClick={() => removeCategory(cat)}>✕</button>
          </span>
        ))}
        <input
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          onKeyDown={handleCategoryKeyDown}
          placeholder="輸入後按 Enter 或 ,"
          className="flex-grow bg-transparent text-sm focus:outline-none"
        />
      </div>

      <hr className="my-6" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-2">Select Personal Information Fields</h2>
          {defaultPersonalFields.map((field) => (
            <label key={field} className="block text-gray-700 dark:text-gray-300 mb-1">
              <input
                type="checkbox"
                checked={personalFields.includes(field)}
                onChange={() => togglePersonalField(field)}
                className="mr-2"
              />
              {field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')}
            </label>
          ))}
        </div>

        <div>
          <h2 className="font-semibold mb-2">Form Preview</h2>
          <div className="border rounded-md p-4 bg-white dark:bg-gray-800 dark:border-gray-600">
            {personalFields.length === 0 && customQuestions.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">尚無表單欄位</p>
            ) : (
              <>
                {personalFields.length > 0 && (
                  <>
                    <p className="font-medium mb-2">Personal Information</p>
                    {personalFields.map((field) => (
                      <p key={field} className="text-sm text-gray-700 dark:text-gray-300">
                        {field}: [Auto-filled]
                      </p>
                    ))}
                    <hr className="my-2 dark:border-gray-600" />
                  </>
                )}
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
              </>
            )}
          </div>
        </div>
      </div>

      <hr className="my-6" />

      <h2 className="font-semibold mb-2">Custom Questions</h2>
      {customQuestions.map((q) => (
        <div key={q.id} className="border p-4 rounded mb-4 dark:border-gray-600">
          <input
            className="w-full mb-2 border px-3 py-1 rounded dark:bg-gray-700 dark:text-white"
            value={q.label}
            onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
          />
          <select
            className="w-full mb-2 border px-3 py-1 rounded dark:bg-gray-700 dark:text-white"
            value={q.type}
            onChange={(e) => updateQuestion(q.id, { type: e.target.value })}
          >
            <option value="text">Text</option>
            <option value="textarea">Paragraph</option>
            <option value="select">Dropdown</option>
          </select>
          {q.type === 'select' && (
            <textarea
              className="w-full mb-2 border px-3 py-1 rounded dark:bg-gray-700 dark:text-white"
              placeholder="選項每行一個"
              value={q.options?.join('\n') || ''}
              onChange={(e) => updateQuestion(q.id, { options: e.target.value.split('\n') })}
            />
          )}
          <label className="text-sm flex items-center gap-2">
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
        className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 mb-6"
      >
        ➕ 新增問題
      </button>

      <hr className="my-6" />

      <div className="flex flex-col md:flex-row gap-3 mt-4">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-[3] bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? '儲存中...' : (isEdit ? '更新活動' : '建立活動')}
        </button>

        <button
          onClick={() => router.back()}
          className="flex-[1] bg-green-600 text-white py-2 rounded hover:bg-green-700"
        >
          返回
        </button>
      </div>


      {message && (
        <p className="text-center mt-2 text-sm text-red-500 dark:text-red-400">{message}</p>
      )}
    </div>
  )
}