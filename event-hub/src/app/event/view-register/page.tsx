'use client'

export const dynamic = 'force-dynamic'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import LoadingScreen from '@/components/loading'


export default function ViewRegistrationsPage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')
  const [IsOrganizer, setIsOrganizer] = useState(false)
  const [formSchema, setFormSchema] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [editedRegs, setEditedRegs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notAuthorized, setNotAuthorized] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const fetchAll = async () => {
      if (!eventId) return

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        setNotAuthorized(true)
        setLoading(false)
        return
      }

      // 檢查是否為舉辦人
      const { data: organizerMatch } = await supabase
        .from('event_organizers')
        .select('role')
        .eq('event_id', eventId)
        .eq('role_id', user.id)
        .single()

      if (!organizerMatch) {
        setNotAuthorized(true)
        setLoading(false)
        return
      } else {
        setIsOrganizer(organizerMatch.role === 'organizer')
      }

      // 讀事件schema
      const { data: eventData } = await supabase
        .from('events')
        .select('form_schema')
        .eq('event_id', eventId)
        .single()
      if (eventData) setFormSchema(eventData.form_schema)

      // 讀報名資料，包含 user_id
      const { data: regData } = await supabase
        .from('registrations')
        .select('user_id, user_info_snapshot, answers')
        .eq('event_id', eventId)

      setRegistrations(regData || [])
      setLoading(false)
    }

    fetchAll()
  }, [eventId])

  const handleEdit = () => {
    setEditedRegs(
      registrations.map(r => ({
        user_id: r.user_id,
        user_info_snapshot: { ...r.user_info_snapshot },
        answers: { ...r.answers },
      }))
    )
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedRegs([])
  }

  const handleSave = async () => {
    if (!eventId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: permission} = await supabase
      .from('event_organizers')
      .select('role')
      .eq('event_id', eventId)
      .eq('role_id', user.id)
      .eq('role', 'organizer')
      .single()
    if (!permission) return alert('您沒有權限編輯報名資料')
    for (const reg of editedRegs) {
      await supabase
        .from('registrations')
        .update({ user_info_snapshot: reg.user_info_snapshot, answers: reg.answers })
        .eq('event_id', eventId)
        .eq('user_id', reg.user_id)
    }

    setRegistrations(editedRegs)
    setIsEditing(false)
    setEditedRegs([])
  }

  const onPersonalChange = (idx: number, field: string, value: string) => {
    const copy = [...editedRegs]
    copy[idx].user_info_snapshot[field] = value
    setEditedRegs(copy)
  }

  const onAnswerChange = (idx: number, qid: string, value: string) => {
    const copy = [...editedRegs]
    copy[idx].answers[qid] = value
    setEditedRegs(copy)
  }

  const exportToCSV = () => {
    if (!formSchema) return

    const headers = [
      ...formSchema.personalFields,
      ...formSchema.customQuestions.map((q: any) => q.label),
    ]

    const rows = registrations.map(reg => {
      const personal = formSchema.personalFields.map((field: string) => `"${reg.user_info_snapshot?.[field] ?? ''}"`)
      const custom = formSchema.customQuestions.map((q: any) => `"${reg.answers?.[q.id] ?? ''}"`)
      return [...personal, ...custom].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'registrations.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) return <LoadingScreen />
  if (notAuthorized) return <p className="p-4 text-red-600 dark:text-red-400">您沒有權限查看此報名資料。</p>

  return (
    <div className="max-w-screen-2xl mx-auto p-6 text-gray-900 dark:text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">報名者清單</h1>
        <div className="flex items-center space-x-2">
          {IsOrganizer && !isEditing && (
            <button
              onClick={handleEdit}
              className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700 transition-colors"
            >
              編輯參賽資料
            </button>
          )}
          {IsOrganizer && isEditing && (
            <>
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                確認
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-400 text-white text-sm px-4 py-2 rounded hover:bg-gray-500 transition-colors"
              >
                取消
              </button>
            </>
          )}
          {!isEditing && 
          <button
            onClick={exportToCSV}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            下載 CSV
          </button>}
        </div>
      </div>

      <table className="w-full text-sm border border-gray-300 dark:border-gray-700">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            {formSchema?.personalFields?.map((field: string) => (
              <th
                key={field}
                className="border px-2 py-1 text-left text-gray-700 dark:text-gray-200"
              >
                {field}
              </th>
            ))}
            {formSchema?.customQuestions?.map((q: any) => (
              <th
                key={q.id}
                className="border px-2 py-1 text-left text-gray-700 dark:text-gray-200"
              >
                {q.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(isEditing ? editedRegs : registrations).map((reg, i) => (
            <tr key={i} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
              {/* 个人信息部分保持不变 */}
              {formSchema.personalFields.map((field: string) => (
                <td key={field} className="border px-2 py-1 text-gray-800 dark:text-gray-100">
                  {isEditing ? (
                    <input
                      type="text"
                      value={reg.user_info_snapshot[field] || ''}
                      onChange={e => onPersonalChange(i, field, e.target.value)}
                      className="w-full border rounded px-1 py-0.5 text-sm"
                    />
                  ) : (
                    reg.user_info_snapshot?.[field] ?? '-'
                  )}
                </td>
              ))}

              {/* customQuestions 部分：根据 q.type 渲染不同控件 */}
              {formSchema.customQuestions.map((q: any) => (
                <td key={q.id} className="border px-2 py-1 text-gray-800 dark:text-gray-100">
                  {isEditing ? (
                    q.type === 'text' ? (
                      <input
                        type="text"
                        value={reg.answers[q.id] || ''}
                        onChange={e => onAnswerChange(i, q.id, e.target.value)}
                        required={q.required}
                        className="w-full border rounded px-1 py-0.5 text-sm"
                      />
                    ) : q.type === 'textarea' ? (
                      <textarea
                        value={reg.answers[q.id] || ''}
                        onChange={e => onAnswerChange(i, q.id, e.target.value)}
                        required={q.required}
                        className="w-full border rounded px-1 py-0.5 text-sm"
                      />
                    ) : q.type === 'select' ? (
                      <select
                        value={reg.answers[q.id] || ''}
                        onChange={e => onAnswerChange(i, q.id, e.target.value)}
                        required={q.required}
                        className="w-full border rounded px-1 py-0.5 text-sm"
                      >
                        <option value="">請選擇</option>
                        {q.options?.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : null
                  ) : (
                    reg.answers?.[q.id] ?? '-'
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
