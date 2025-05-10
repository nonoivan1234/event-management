'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function HomePage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [events, setEvents] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])

  // 🚀 抓 events 與使用者登入狀態（SQL 排序 by deadline ASC）
  useEffect(() => {
    const fetchData = async () => {
      const [{ data: userData }, { data: eventsData, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('events')
          .select(`*, users:organizer_id ( name )`)
          .order('deadline', { ascending: true })
      ])

      if (userData?.user) {
        setUser(userData.user)

        const { data: regData } = await supabase
          .from('registrations')
          .select('event_id')
          .eq('user_id', userData.user.id)

        setRegistrations(regData || [])
      }

      if (!error && eventsData) {
        setEvents(eventsData)
      }
    }

    fetchData()
  }, [])

  const isRegistered = (event_id: string) => {
    return registrations.some((r) => r.event_id === event_id)
  }

  const filteredEvents = events.filter((event) => {
    return (
      (category === 'All' || event.category === category) &&
      event.title?.toLowerCase()?.includes(search.toLowerCase())
    )
  })

  return (
    <main className="max-w-5xl mx-auto py-12 px-4 dark:text-white">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🎓 Student Activities Portal</h1>
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search activities..."
            className="border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border rounded px-3 py-2 dark:bg-gray-700 dark:text-white dark:border-gray-600"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Sports">Sports</option>
            <option value="Academic">Academic</option>
            <option value="Cultural">Cultural</option>
          </select>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredEvents.map((event) => {
          const registered = isRegistered(event.event_id)
          const loggedIn = !!user
          const expired = new Date(event.deadline) < new Date()
          const disabled = !loggedIn || registered || expired
          const title = !loggedIn
            ? '請先登入才能報名'
            : registered
            ? '你已報名此活動'
            : expired
            ? '活動已結束'
            : ''

          return (
            <div
              key={event.event_id}
              className="border rounded-lg p-4 flex flex-col justify-between shadow-sm dark:bg-gray-900 dark:text-white dark:border-gray-700"
            >
              <div>
                <h2 className="text-lg font-semibold">{event.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                  {event.deadline}
                  {expired && <span className="text-red-500 ml-2">(已結束)</span>}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{event.description}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  🧑‍💼 {event.users?.name || '匿名主辦人'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (!disabled) {
                    router.push(`/event/register?event_id=${event.event_id}`)
                  }
                }}
                disabled={disabled}
                title={title}
                className={`mt-4 px-4 py-2 rounded ${
                  disabled
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                    : 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200'
                }`}
              >
                {expired ? '活動已結束' : registered ? '已報名' : 'Sign Up'}
              </button>
            </div>
          )
        })}
      </section>
    </main>
  )
}
