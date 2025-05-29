'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import SendEmail from '@/lib/SendEmail'
import Spinner from '@/components/ui/Spinner'

const defaultAvatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAA2ZJREFUeF7tmk3ITUEcxn8vkVLyka8UkRRZEAsldiQbW0qxQknZ2rGRLSuyUErY2QlLygJRIhYKC1/53JDydSZnNO907nvPzDz/13u7Z5b3zv+Z53n+/5kz58yMMORtZMj10xnQVcCQO9BNgSEvgG4R/F9TYDZwBlhfV+Bd4CDwbrwrcjwNcIL3tRR4HtjTsm9Rt/Ew4AhwPJPlCcDFmzVrA35HzL8C0/uo+QTMjPqY8TQDBkLxP4ApiWn8XlXO1CDGhKsJaCR+CfAyUbzvPg94a2mChQFh5icDvzLFh2EhppSzFAxYBjyrmW8HrgrEO4iNwK0ayz0674lw5Rshs0xF00qWOBkQMAP4UmdGids0FUrWlVHFoyRqmX1PWj6GhQHbgGuqORrhrAHuK6vMwgAlZpOPvgok40hAapZSYmNUkHScQTZgUfVy9ap0qg2yAbOAz8NsgCR5EpBuDfjrgF+cHgBrS0uzR7zbWrvHrGuS5ElAakJPgRVKcg0meJPfA3MVJisNCKtgM3BTQTDAWAk8VhtsZYCsRAMD5NtgC5JhFSjxTcQrCYbVvgW4HvxQWmU/gUk13m7ggnJqlZLrxeUhsFpgQpj558BSpXirCvAcbwMbAsKXgF0tBZwD9gZ9nwBuEZQ3qwrwRBcArxtY76wEXY5+3wFcaei7PPjMNnAGeMLOBGdGSvsIzEkJyOlrXQHxU2HCcbQ0ID4VCsUfBk5GbhwCTo3hkAlXC9A7wamv13O02rsfS0x/05mifDFUGxBnfb7gyNsdpX+IzJPxlgFF3+3fVOf/CxMz3q/7C2Bx0EnCXQISiVdkvZcZ4dmD61PMvxjA6sSmTznI3g1KDZAR6Vf/Df9Lxi4xINy5ba0OMG9kiCgJWQe4u0WuHajvHCXjlRggyUAy49EBxRxyDXgErKq55GIUav8XXvSZLJe8H9Sd2W9SKcnEuQi4l6usp0KOAeEHj5z4TJ1jhvmEuGt4Z1MGyBFQPO9SCLbsm82pxAC303M7vonQpgHfcqZBiQE5sZZmZZ0ap4rYX33YOJ3jtKXyGtsbkHS7NNWA8IUkNdbaA2+Au5bnrue1aqkishebVmzKOmVxSzXAUXQD5cSVyWsXncxtogppJ1fQqzNAYOJAQ3QVMNDpE5DvKkBg4kBDDH0F/AGQ2IFBGnXtNgAAAABJRU5ErkJggg=="

type User = {
  user_id: string
  name: string
  email: string
  avatar: string | null
}

type UserWithPending = User & {
  Available: boolean
  registered?: boolean
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onAdd: (User: User) => Promise<void>
  isInvite: boolean
  userId: string
  eventId: string
}

const options = {
  year:   'numeric',
  month:  '2-digit',
  day:    '2-digit',
  hour:   '2-digit',
  minute: '2-digit',
  hour12: false,
};

function toDatetimeLocal(isoString: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString('zh-tw', options);
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
  const [inviteEmail, setInviteEmail] = useState('')
  const [hasSend_email, setHasSend_email] = useState(false)
  const [results, setResults] = useState<UserWithPending[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('請搜尋使用者')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
      setResults([])
      setMessage('請搜尋使用者')
      setErrorMsg('')
      setInviteEmail('')
      setLoading(false)
    }
  }, [isOpen])

  const fetchUsers = async () => {
    if (!searchTerm) {
      setResults([])
      setInviteEmail('')
      setMessage('請輸入姓名或Email')
      setLoading(false)
      setErrorMsg('')
      return
    }
    setResults([])
    setInviteEmail('')
    setLoading(true)
    setMessage('載入中…')
    setErrorMsg('')

    const isEmail = searchTerm.includes('@')
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('user_id, name, email, avatar')
      .or(
        `name.ilike.%${searchTerm}%,email.${isEmail ? `eq.${searchTerm}` : `ilike.%${searchTerm}%@%`}`)
      .limit(20)
    if (userError) {
      console.error(userError)
      setMessage('發生錯誤')
      setLoading(false)
      return
    }
    if ((!users || users.length === 0) && !(isEmail && isInvite)) {
      setResults([])
      setMessage('沒有找到使用者')
      setLoading(false)
      return
    } else if((!users || users.length === 0) && isEmail && isInvite) {
      setResults([])
      setInviteEmail(searchTerm)
      setMessage('')
      setHasSend_email(false)
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
          const { data: reg } = await supabase
            .from('registrations')
            .select('user_id')
            .eq('user_id', u.user_id)
            .eq('event_id', eventId)
          return { ...u, Available: (invs?.length === 0 && reg?.length === 0), registered: (reg?.length > 0) }
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

  const SendInvite = async (email: string) => {
    setSending(true)
    setErrorMsg('')
    const baseUrl = window.location.origin;
    const {data:event_data, error:event_error} = await supabase
      .from('events')
      .select('title, description, start, end, deadline, venue_name, venue_address, users:organizer_id(name, email, avatar)')
      .eq('event_id', eventId)
      .single()
    if (event_error || !event_data) 
      throw new Error('無法找到活動資訊')

    const {data: user_data, error: user_error} = await supabase
      .from('users')
      .select('name, email, avatar')
      .eq('user_id', userId)
      .single()
    if (user_error || !user_data)
      throw new Error('無法找到邀請人資訊')
    
    const htmlBody= `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2><u>${user_data.name || user_data.email}</u>邀請您參加【${event_data.title}】</h2>
        <p>親愛的朋友，您好：</p>
        <p>
          <strong><u>${user_data.name || user_data.email}</u></strong>邀請您參加即將舉辦的<strong>【${event_data.title}】</strong>的精彩活動，邀請您一同參與！
        </p>

        <h3>📅 活動資訊</h3>
        <ul>
          ${event_data.start || event_data.end ? `<li><strong>舉辦時間：</strong>${toDatetimeLocal(event_data.start)} - ${toDatetimeLocal(event_data.end)}</li>` : ""}
          ${event_data.venue_name ? `<li><strong>舉辦地點：</strong>${event_data.venue_name}</li>` : ""}
          ${event_data.venue_address ? `<li><strong>舉辦地址：</strong>${event_data.venue_address}</li>` : ""}
        </ul>

        <p style="margin-top: 20px;">
          👉 <a href="${baseUrl + "/event/" + eventId}" style="color: #007BFF;">點我查看官方網站</a>
          👉 <a href="${baseUrl + "/event/register?event_id=" + eventId}" style="color: #007BFF;">點我報名活動</a><br/>
          若您尚未註冊我們的系統，將會同時完成註冊流程。<br/>
          <p>報名截止日期：${toDatetimeLocal(event_data.deadline)}</p>
        </p>

        <h3>📨 主辦單位資訊</h3>
        <div style="display: flex; align-items: center;">
          <img src="${event_data.users.avatar || defaultAvatar}" alt="邀請人頭像" style="width: 48px; height: 48px; border-radius: 50%; margin-right: 10px;" />
          <div>
            <div><strong>${event_data.users.name || '匿名邀請人'}</strong></div>
            <div><a href="mailto:${event_data.users.email}" style="color: #007BFF;">${event_data.users.email}</a></div>
          </div>
        </div>

        <p style="margin-top: 20px;">如有任何問題，歡迎回信與我們聯繫。</p>
        <p>敬祝 順心如意！</p>

        <div style="display: flex; align-items: center; margin-top: 10px;">
          <img src="${user_data.avatar || defaultAvatar}" alt="邀請人頭像" style="width: 48px; height: 48px; border-radius: 50%; margin-right: 10px;" />
          <div>
            <div><strong>${user_data.name || '匿名邀請人'}</strong></div>
            <div><a href="mailto:${user_data.email}" style="color: #007BFF;">${user_data.email}</a></div>
          </div>
        </div>
        <p style="margin-top: 20px; color: #888;">此郵件由系統自動發送，請勿直接回覆。</p>
      </div>`
    const SendResult = await SendEmail(email, `${user_data.name || user_data.email}邀請您參加【${event_data.title}】活動`, htmlBody)
    setHasSend_email(SendResult)
    if (!SendResult)
      setErrorMsg('寄送邀請失敗，請稍後再試')
    setSending(false)
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
            placeholder="輸入姓名或Email"
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

        {errorMsg && (<p className="text-red-500 text-sm mb-2">{errorMsg}</p>)}
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
                disabled={!user.Available || (userId === user.user_id && isInvite)}
                onClick={() => handleAdd(user)}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {isInvite
                  ? userId === user.user_id ? "自己" : user.registered ? '已報名' : user.Available ? '邀請' : '已邀請'
                  : user.Available ? '加入' : '已加入'}
              </button>
            </li>
          ))}
          {message && (
            <p className="text-center text-gray-500 dark:text-gray-300 mt-4">
              {message}
            </p>
          )}
          {inviteEmail && (
            <li className="flex flex-wrap items-center justify-between py-2 border-b dark:border-gray-700">
              <div>
                <p className="text-gray-500 dark:text-gray-300">
                  找不到使用者，寄信邀請
                </p>
                <p className="font-semibold break-all">{inviteEmail}<span className="text-gray-500 dark:text-gray-300">？</span></p>
              </div>
              <button
                className="mt-2 md:mt-0 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 min-w-[4.5rem] items-center justify-items-center"
                onClick={() => SendInvite(inviteEmail)}
                disabled={hasSend_email}
                title={hasSend_email ? "已寄送邀請" : "寄送邀請"}
              >
                {sending ? <Spinner className='w-6 h-6'/> : hasSend_email ? '已寄送' : '寄送邀請'}
              </button>
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
