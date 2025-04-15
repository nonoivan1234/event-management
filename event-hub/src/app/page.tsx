'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const demoEvents = [
  {
    id: '1',
    title: 'Chess Tournament',
    date: '2025-03-15',
    category: 'Sports',
    organizer: 'Chess Club',
  },
  {
    id: '2',
    title: 'Coding Competition',
    date: '2025-04-05',
    category: 'Academic',
    organizer: 'Computer Science Society',
  },
  {
    id: '3',
    title: 'Drama Festival',
    date: '2025-05-20',
    category: 'Cultural',
    organizer: 'Drama Club',
  },
]

export default function HomePage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  const filteredEvents = demoEvents.filter((event) => {
    return (
      (category === 'All' || event.category === category) &&
      event.title.toLowerCase().includes(search.toLowerCase())
    )
  })

  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    router.push('/')
  }

  return (
    <>
      <nav className="flex items-center justify-between py-4 px-6 bg-gray-100 shadow">
        <h1
          onClick={() => router.push('/')}
          className="text-lg font-bold cursor-pointer"
        >
          🎓 Event Hub
        </h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm hover:underline"
          >
            Dashboard
          </button>
          {userEmail ? (
            <button
              onClick={handleLogout}
              className="text-sm hover:underline"
            >
              登出
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="text-sm hover:underline"
            >
              登入
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto py-12 px-4">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🎓 Student Activities Portal</h1>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search activities..."
              className="border rounded px-3 py-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="border rounded px-3 py-2"
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
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="border rounded-lg p-4 flex flex-col justify-between shadow-sm"
            >
              <div>
                <h2 className="text-lg font-semibold">{event.title}</h2>
                <p className="text-sm text-gray-500 mb-1">{event.date}</p>
                <p className="text-sm text-gray-600">🧑‍💼 {event.organizer}</p>
              </div>
              <button
                onClick={() => router.push(`/event/${event.id}/register`)}
                className="mt-4 bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
              >
                Sign Up
              </button>
            </div>
          ))}
        </section>
      </main>
    </>
  )
}