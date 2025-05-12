'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function getDaysLeft(deadline: string): number {
  const now = new Date()
  const end = new Date(deadline)
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : 0
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [registrations, setRegistrations] = useState<any[]>([])

  useEffect(() => {
    const fetchReminders = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('registrations')
        .select('event_id, event:events(deadline, title)')
        .eq('user_id', user.id)

      setRegistrations(data || [])
    }

    fetchReminders()
  }, [])

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="text-2xl">🔔</button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 shadow-lg rounded-lg z-50 p-4 text-sm">
          <h3 className="font-semibold mb-2 dark:text-white">已報名活動</h3>
          {registrations.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-300">目前沒有報名活動</p>
          ) : (
            <ul className="space-y-2">
              {registrations.map((r) => {
                const daysLeft = getDaysLeft(r.event.deadline)
                return (
                  <li key={r.event_id} className="border-b pb-2">
                    <p className="font-medium text-gray-800 dark:text-white">{r.event.title}</p>
                    <p className={
                      daysLeft <= 1
                        ? 'text-red-600'
                        : daysLeft <= 3
                        ? 'text-yellow-500'
                        : 'text-gray-600 dark:text-gray-300'
                    }>
                      剩餘 {daysLeft} 天
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}