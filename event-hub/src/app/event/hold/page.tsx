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
  const [organizedEvents, setOrganizedEvents] = useState<Event[]>([])
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

      const { data: organizedData } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)

      setOrganizedEvents(organizedData ?? [])

    }


    fetchUserAndEvents()
  }, [router])


  const handleCreateEvent = () => {
    router.push('/event/modify')
  }

  const renderEventActions = (eventId: string) => (
    <div className="mt-4 flex gap-3">
      <button
        onClick={() => router.push(`/event/modify?id=${eventId}`)}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        編輯活動
      </button>
      <button
        onClick={() => router.push(`/event/view-register?id=${eventId}`)}
        className="text-sm text-green-600 dark:text-green-400 hover:underline"
      >
        查看報名者
      </button>
    </div>
  )

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
        {isOrganized && renderEventActions(event.event_id)}
      </div>
    ))
  }

  return (
    <>
      <main className="max-w-screen-2xl mx-auto px-6 py-8 text-black dark:text-white">
        <button
          className="mb-8 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={handleCreateEvent}
        >
          ➕ 建立新活動
        </button>

        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4">你舉辦的活動</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderEvents(organizedEvents, true)}
          </div>
        </section>
      </main>
    </>
  )
}
