'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function ViewRegistrationsPage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')
  const [formSchema, setFormSchema] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notAuthorized, setNotAuthorized] = useState(false)

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

      // 檢查是否為主辦人
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('form_schema, organizer_id')
        .eq('event_id', eventId)
        .single()

      if (eventError || !eventData || eventData.organizer_id !== user.id) {
        setNotAuthorized(true)
        setLoading(false)
        return
      }

      setFormSchema(eventData.form_schema)

      const { data: regData } = await supabase
        .from('registrations')
        .select('user_info_snapshot, answers')
        .eq('event_id', eventId)

      setRegistrations(regData || [])
      setLoading(false)
    }

    fetchAll()
  }, [eventId])

  const exportToCSV = () => {
    if (!formSchema) return

    const headers = [
      ...formSchema.personalFields,
      ...formSchema.customQuestions.map((q: any) => q.label),
    ]

    const rows = registrations.map((reg) => {
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

  if (loading) {
    return <p className="p-4 text-gray-800 dark:text-white">Loading...</p>
  }

  if (notAuthorized) {
    return <p className="p-4 text-red-600 dark:text-red-400">您沒有權限查看此報名資料。</p>
  }

  return (
    <div className="max-w-screen-2xl mx-auto p-6 text-gray-900 dark:text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">報名者清單</h1>
        <button
          onClick={exportToCSV}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          下載 CSV
        </button>
      </div>

      <table className="w-full text-sm border border-gray-300 dark:border-gray-700">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            {formSchema?.personalFields?.map((field: string) => (
              <th key={field} className="border px-2 py-1 text-left text-gray-700 dark:text-gray-200">
                {field}
              </th>
            ))}
            {formSchema?.customQuestions?.map((q: any) => (
              <th key={q.id} className="border px-2 py-1 text-left text-gray-700 dark:text-gray-200">
                {q.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg, i) => (
            <tr key={i} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
              {formSchema.personalFields.map((field: string) => (
                <td key={field} className="border px-2 py-1 text-gray-800 dark:text-gray-100">
                  {reg.user_info_snapshot?.[field] ?? '-'}
                </td>
              ))}
              {formSchema.customQuestions.map((q: any) => (
                <td key={q.id} className="border px-2 py-1 text-gray-800 dark:text-gray-100">
                  {reg.answers?.[q.id] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
