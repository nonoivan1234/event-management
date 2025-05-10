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

  useEffect(() => {
    if (!eventId) return

    const fetchAll = async () => {
      const { data: eventData } = await supabase
        .from('events')
        .select('form_schema')
        .eq('event_id', eventId)
        .single()

      setFormSchema(eventData?.form_schema || null)

      const { data: regData } = await supabase
        .from('registrations')
        .select('user_info_snapshot, answers')
        .eq('event_id', eventId)

      setRegistrations(regData || [])
      setLoading(false)
    }

    fetchAll()
  }, [eventId])

  if (loading) return <p className="p-4 text-gray-800 dark:text-white">Loading...</p>

  return (
    <div className="max-w-5xl mx-auto p-6 text-gray-900 dark:text-white">
      <h1 className="text-2xl font-bold mb-4">報名者清單</h1>

      <table className="w-full text-sm border border-gray-300 dark:border-gray-700">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            {formSchema?.personalFields?.map((field: string) => (
              <th key={field} className="border border-gray-300 dark:border-gray-700 px-2 py-1 text-left text-gray-700 dark:text-gray-200">
                {field}
              </th>
            ))}
            {formSchema?.customQuestions?.map((q: any) => (
              <th key={q.id} className="border border-gray-300 dark:border-gray-700 px-2 py-1 text-left text-gray-700 dark:text-gray-200">
                {q.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg, i) => (
            <tr key={i} className="border-t border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
              {formSchema.personalFields.map((field: string) => (
                <td key={field} className="border border-gray-300 dark:border-gray-700 px-2 py-1 text-gray-800 dark:text-gray-100">
                  {reg.user_info_snapshot?.[field] ?? '-'}
                </td>
              ))}
              {formSchema.customQuestions.map((q: any) => (
                <td key={q.id} className="border border-gray-300 dark:border-gray-700 px-2 py-1 text-gray-800 dark:text-gray-100">
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
