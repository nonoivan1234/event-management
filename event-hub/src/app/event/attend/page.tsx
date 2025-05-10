'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '../../../lib/supabase'

type Event = {
  event_id: string
  title: string
  description: string
  deadline: string
  users?: {
    name: string
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([])

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

      const { data: joinedData } = await supabase
        .from('registrations')
        .select(`
          event_id,
          events (
            event_id,
            title,
            description,
            deadline,
            users:organizer_id (
              name
            )
          )
        `)
        .eq('user_id', user.id)

      const events = joinedData?.map((item: any) => item.events) ?? []

      // 依照 deadline 排序（升冪）
      events.sort((a: Event, b: Event) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

      setJoinedEvents(events)
    }

    fetchUserAndEvents()
  }, [router])

  const renderEvents = () => {
    if (joinedEvents.length === 0) {
      return (
        <p className="text-gray-500 dark:text-gray-400">
          你目前尚未參加任何活動。
        </p>
      )
    }

    return joinedEvents.map((event) => {
      const expired = new Date(event.deadline) < new Date()
      return (
        <div
          key={event.event_id}
          className="border rounded-lg p-4 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between"
        >
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{event.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              舉辦時間：{event.deadline}
              {expired && <span className="text-red-500 ml-2">(已結束)</span>}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              🧑‍💼 主辦人：{event.users?.name || '匿名主辦人'}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{event.description}</p>
          </div>

          <button
            onClick={() => router.push(`/event/edit?event_id=${event.event_id}`)}
            disabled={expired}
            title={expired ? '活動已結束，無法編輯報名資料' : ''}
            className={`mt-4 self-end text-sm px-4 py-2 rounded ${
              expired
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {expired ? '已結束' : '編輯報名資料'}
          </button>
        </div>
      )
    })
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 text-black dark:text-white">
      <section>
        <h2 className="text-xl font-bold mb-4">你參加的活動</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderEvents()}
        </div>
      </section>
    </main>
  )
}
