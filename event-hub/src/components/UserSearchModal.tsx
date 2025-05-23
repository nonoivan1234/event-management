'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const defaultAvatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA..."

type User = {
  user_id: string
  name: string
  email: string
  avatar: string | null
}

type UserWithPending = User & {
  Available: boolean
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onAdd: (user: User) => Promise<void>
  isInvite: boolean
  userId: string
  eventId: string
}

export default function UserSearchModal({
  isOpen,
  onClose,
  onAdd,
  isInvite,
  userId,
  eventId,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<UserWithPending[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('請搜尋使用者')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
      setResults([])
      setMessage('請搜尋使用者')
      setErrorMsg('')
      setLoading(false)
    }
  }, [isOpen])

  const fetchUsers = async () => {
    if (!searchTerm) {
      setResults([])
      return
    }
    setLoading(true)
    setMessage('載入中…')
    setErrorMsg('')

    // 撈出 users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('user_id, name, email, avatar')
      .or(
        `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%@%`)
      .limit(20)

    if (userError) {
      console.error(userError)
      setMessage('發生錯誤')
      setLoading(false)
      return
    }
    if (!users || users.length === 0) {
      setResults([])
      setMessage('沒有找到使用者')
      setLoading(false)
      return
    }

    // 批次檢查邀請或加入狀態
    const enriched: UserWithPending[] = await Promise.all(
      users.map(async (u) => {
        if (isInvite) {
          const { data: invs } = await supabase
            .from('invitations')
            .select('pending')
            .eq('friend_id', u.user_id)
            .eq('event_id', eventId)
            .eq('inviter_id', userId)
            .eq('pending', true)
          return { ...u, Available: (invs?.length === 0) }
        } else {
          const { data: orgs } = await supabase
            .from('event_organizers')
            .select('role')
            .eq('role_id', u.user_id)
            .eq('event_id', eventId)
          return { ...u, Available: (orgs?.length === 0) }
        }
      })
    )

    setResults(enriched)
    setMessage('')
    setLoading(false)
  }

  const handleAdd = async (user: UserWithPending) => {
    // 樂觀更新
    setResults(prev =>
      prev.map(u =>
        u.user_id === user.user_id
          ? { ...u, Available: false }
          : u
      )
    )
    try {
      await onAdd(user)
      setErrorMsg('')
    } catch (error: any) {
      setErrorMsg(error.message || '加入失敗，請稍後再試')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold mb-4 dark:text-white">搜尋使用者</h2>

        <div className="flex mb-4">
          <input
            type="text"
            className="flex-1 border rounded px-3 py-2 mr-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="輸入姓名或 Email"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchUsers()}
          />
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            搜尋
          </button>
        </div>

        {errorMsg && (
          <p className="text-red-500 text-sm mb-2">{errorMsg}</p>
        )}

        {loading ? (
          <p className="text-center dark:text-gray-300">{message}</p>
        ) : (
          <ul className="max-h-60 overflow-y-auto">
            {results.map(user => (
              <li
                key={user.user_id}
                className="flex items-center justify-between py-2 border-b dark:border-gray-700"
              >
                <div className="flex items-center">
                  <img
                    src={user.avatar || defaultAvatar}
                    alt="avatar"
                    className="w-8 h-8 rounded-full mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  disabled={!user.Available}
                  onClick={() => handleAdd(user)}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {isInvite
                    ? user.Available ? '邀請' : '已邀請'
                    : user.Available ? '加入' : '已加入'}
                </button>
              </li>
            ))}
            {!loading && message && (
              <p className="text-center text-gray-500 dark:text-gray-300 mt-4">
                {message}
              </p>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
