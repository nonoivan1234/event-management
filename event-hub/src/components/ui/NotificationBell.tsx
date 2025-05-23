'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function getDaysLeft(deadline: string | null | undefined): number {
  if (!deadline) return 0
  const now = new Date()
  const end = new Date(deadline)
  return Math.max(Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)), 0)
}

type Registration = {
  event_id: string
  event: {
    title: string
    deadline: string
    visible: boolean
  }
}

type Invitation = {
  event_id: string
  inviter: {name: string}
  event: {title: string}
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // 1. 取出已報名活動
      const { data: regs } = await supabase
        .from('registrations')
        .select('event_id, event:events!inner(deadline, title, visible)')
        .eq('user_id', user.id)
      const visibleRegs = regs?.filter((r) => (r as any).event.visible) ?? []
      const sortedRegs = (visibleRegs as Registration[]).sort(
        (a, b) =>
          getDaysLeft(a.event.deadline) - getDaysLeft(b.event.deadline)
      )
      setRegistrations(sortedRegs)

      // 2. 取出 pending 邀請
      const { data: invs } = await supabase
        .from('invitations')
        .select('event_id, inviter:users!invitations_inviter_id_fkey(name), event:events!inner(title)')
        .eq('friend_id', user.id)
        .eq('pending', true)
      setInvitations(invs as Invitation[] ?? [])
    }

    fetchData()
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const notificationCount = invitations.length

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="text-2xl relative"
      >
        🔔
        {notificationCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full -translate-y-1/2 translate-x-1/2">
            {notificationCount}
          </span>
        )}
      </button>

      <div
        className={`absolute right-0 mt-2 w-80 max-w-[90vw] sm:max-w-sm bg-white dark:bg-gray-800 shadow-lg rounded-lg z-50 p-4 text-sm transform transition-all duration-200 origin-top-right ${
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        {/* Invitation Section */}
        <h3 className="font-semibold mb-2 dark:text-gray-200">待處理邀請</h3>
        {invitations.length > 0 ? (
          <>
            <ul className="space-y-2 mb-4">
              {invitations.map((inv) => {
                return (
                  <li
                    key={`${inv.event_id}-${inv.inviter.name}`}
                    className="border-b pb-2 cursor-pointer rounded px-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => router.push(`/event/register?event_id=${inv.event_id}`)}
                  >
                    <p className="text-gray-800 dark:text-white">
                      活動 {inv.event.title} 的邀請
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 text-xs">
                      來自邀請者 {inv.inviter.name}
                    </p>
                  </li>)
                }
              )}
            </ul>
          </>
        ) : (
          <p className="text-gray-500 dark:text-gray-300">
            目前沒有任何報名邀請
          </p>
        )}
        <hr className="border-gray-300 dark:border-gray-700 mb-4" />
        <h3 className="font-semibold mb-2 dark:text-gray-200">已報名活動</h3>
        {registrations.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-300">
            目前沒有報名活動
          </p>
        ) : (
          <ul className="space-y-2">
            {registrations.map((r) => {
              const daysLeft = getDaysLeft(r.event.deadline)
              return (
                <li
                  key={r.event_id}
                  className="border-b pb-2 cursor-pointer transition rounded px-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() =>
                    router.push(`/event?event_id=${r.event_id}`)
                  }
                >
                  <p className="font-medium text-gray-800 dark:text-white">
                    {r.event.title}
                  </p>
                  <p
                    className={
                      daysLeft <= 1
                        ? 'text-red-600'
                        : daysLeft <= 3
                        ? 'text-yellow-500'
                        : 'text-gray-600 dark:text-gray-300'
                    }
                  >
                    剩餘 {daysLeft} 天
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
