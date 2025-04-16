'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

  if (loading) return <p className="p-4">Loading...</p>

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">報名者清單</h1>

      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            {formSchema?.personalFields?.map((field: string) => (
              <th key={field} className="border px-2 py-1 text-left">{field}</th>
            ))}
            {formSchema?.customQuestions?.map((q: any) => (
              <th key={q.id} className="border px-2 py-1 text-left">{q.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {registrations.map((reg, i) => (
            <tr key={i} className="border-t">
              {formSchema.personalFields.map((field: string) => (
                <td key={field} className="border px-2 py-1">
                  {reg.user_info_snapshot?.[field] ?? '-'}
                </td>
              ))}
              {formSchema.customQuestions.map((q: any) => (
                <td key={q.id} className="border px-2 py-1">
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
