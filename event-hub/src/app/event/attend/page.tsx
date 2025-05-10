'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

type Event = {
  event_id: string
  title: string
  description: string
  created_at: string
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchUserAndEvents = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        router.push('/auth/login')
        return
      }

      setUserEmail(user.email ?? '')

      const { data: joinedData } = await supabase
        .from('registrations')
        .select('event_id, events(*)')
        .eq('user_id', user.id)

      const events = (joinedData?.map((item: any) => item.events)) ?? []
      setJoinedEvents(events)
    }


    fetchUserAndEvents()
  }, [router])

  const renderEvents = (events: Event[], isOrganized: boolean) => {
    if (events.length === 0) {
      return (
        <p className="text-gray-500 dark:text-gray-400">
          {isOrganized ? '你目前尚未建立任何活動。' : '你目前尚未參加任何活動。'}
        </p>
      )
    }

    return events.map((event) => (
      <div
        key={event.event_id}
        className="border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 transition hover:shadow-md"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{event.title}</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">{event.description}</p>
      </div>
    ))
  }

  return (
    <>
      <main className="max-w-5xl mx-auto px-6 py-8 text-black dark:text-white">
        <section>
          <h2 className="text-xl font-bold mb-4">你參加的活動</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderEvents(joinedEvents, false)}
          </div>
        </section>
      </main>
    </>
  )
}
