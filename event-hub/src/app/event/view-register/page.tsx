'use client'

export const dynamic = 'force-dynamic'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/loading'
import sendEmail from '@/lib/SendEmail'

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

export default function ViewRegistrationsPage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get('event_id')
  const [IsOrganizer, setIsOrganizer] = useState(false)
  const [formSchema, setFormSchema] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [editedRegs, setEditedRegs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notAuthorized, setNotAuthorized] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isSend, setIsSend] = useState(false)
  const [sendingUserIds, setSendingUserIds] = useState<string[]>([])
  const [sendingAll, setSendingAll] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const fetchAll = async () => {
      if (!eventId) return

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) {
        setNotAuthorized(true)
        setLoading(false)
        return
      }

      // 檢查是否為舉辦人
      const { data: organizerMatch } = await supabase
        .from('event_organizers')
        .select('role')
        .eq('event_id', eventId)
        .eq('role_id', user.id)
        .single()

      if (!organizerMatch) {
        setNotAuthorized(true)
        setLoading(false)
        return
      } else {
        setIsOrganizer(organizerMatch.role === 'organizer')
      }

      // 讀事件schema
      const { data: eventData } = await supabase
        .from('events')
        .select('form_schema')
        .eq('event_id', eventId)
        .single()
      if (eventData) setFormSchema(eventData.form_schema)

      // 讀報名資料，包含 user_id
      const { data: regData } = await supabase
        .from('registrations')
        .select('user_id, user_info_snapshot, answers, notification')
        .eq('event_id', eventId)

      setRegistrations(regData || [])
      setLoading(false)
    }

    fetchAll()
  }, [eventId])

  const handleEdit = () => {
    setEditedRegs(
      registrations.map(r => ({
        user_id: r.user_id,
        user_info_snapshot: { ...r.user_info_snapshot },
        answers: { ...r.answers },
      }))
    )
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditedRegs([])
  }

  const handleSave = async () => {
    if (!eventId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: permission} = await supabase
      .from('event_organizers')
      .select('role')
      .eq('event_id', eventId)
      .eq('role_id', user.id)
      .eq('role', 'organizer')
      .single()
    if (!permission) return alert('您沒有權限編輯報名資料')
    for (const reg of editedRegs) {
      await supabase
        .from('registrations')
        .update({ user_info_snapshot: reg.user_info_snapshot, answers: reg.answers })
        .eq('event_id', eventId)
        .eq('user_id', reg.user_id)
    }

    setRegistrations(editedRegs)
    setIsEditing(false)
    setEditedRegs([])
  }

  const deleteRegistration = async (userId: string) => {
    if (!eventId) return
    if(!confirm('確定要刪除這筆報名資料嗎？')) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: permission} = await supabase
      .from('event_organizers')
      .select('role')
      .eq('event_id', eventId)
      .eq('role_id', user.id)
      .eq('role', 'organizer')
      .single()
    if (!permission) return alert('您沒有權限刪除報名資料')
    await supabase
      .from('registrations')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)
    setRegistrations(registrations.filter(reg => reg.user_id !== userId))
    setEditedRegs(editedRegs.filter(reg => reg.user_id !== userId))
    alert('報名資料已刪除')
  }

  const onPersonalChange = (idx: number, field: string, value: string) => {
    const copy = [...editedRegs]
    copy[idx].user_info_snapshot[field] = value
    setEditedRegs(copy)
  }

  const onAnswerChange = (idx: number, qid: string, value: string) => {
    const copy = [...editedRegs]
    copy[idx].answers[qid] = value
    setEditedRegs(copy)
  }

  const exportToCSV = () => {
    if (!formSchema) return

    const headers = [
      ...formSchema.personalFields,
      ...formSchema.customQuestions.map((q: any) => q.label),
    ]

    const rows = registrations.map(reg => {
      const personal = formSchema.personalFields.map((field: string) => `"${reg.user_info_snapshot?.[field] ?? ''}"`)
      const custom = formSchema.customQuestions.map((q: any) => `"${reg.answers?.[q.id] ?? ''}"`)
      return [...personal, ...custom].join(',')
    })

    const csvContent = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'registrations.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSendNotification = (userId: string, sent: boolean) => async () => {
    if (sent && !confirm('此報名者已經收到通知，是否要重新發送？')) return
    if (!eventId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSendingUserIds(prev => [...prev, userId]) // ➕ 開始寄送，加入 userId
    const { data: permission} = await supabase
      .from('event_organizers')
      .select('role')
      .eq('event_id', eventId)
      .eq('role_id', user.id)
      .eq('role', 'organizer')
      .single()
    if (!permission){
      setSendingUserIds(prev => prev.filter(id => id !== userId)) // ❌ 清除寄送中狀態
      return alert('您沒有權限發送通知')
    }

    const reg = registrations.find(r => r.user_id === userId)
    if (!reg){
      setSendingUserIds(prev => prev.filter(id => id !== userId)) // ❌ 清除寄送中狀態
      return alert('找不到該報名資料')
    }

    const {data:EventData} = await supabase
      .from('events')
      .select('title, start, end, deadline, venue_name, venue_address, users:organizer_id(name, email)')
      .eq('event_id', eventId)
      .single()
    
    const { data: userData } = await supabase
      .from('users')
      .select('name, email')
      .eq('user_id', userId)
      .single()
    if (!EventData || !userData) {
      setSendingUserIds(prev => prev.filter(id => id !== userId)) // ❌ 清除寄送中狀態
      return alert('無法取得活動或使用者資料，請稍後再試。')
    }
    const baseUrl = window.location.origin;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>📢 活動即將開始！您已成功報名【${EventData.title}】</h2>

        <p>親愛的${userData.name !== "" ? userData.name : userData.email}，您好：</p>
        <p>
          感謝您報名參加 <strong>【${EventData.title}】</strong>，活動即將登場，以下是活動資訊提醒，敬請準時出席！
        </p>

        <h3>📅 活動資訊</h3>
        <ul>
          ${EventData.start || EventData.end ? `<li><strong>舉辦時間：</strong>${toDatetimeLocal(EventData.start)} - ${toDatetimeLocal(EventData.end)}</li>`:""}
          ${EventData.venue_name? `<li><strong>舉辦地點：</strong>${EventData.venue_name}</li>` : ""}
          ${EventData.venue_address? `<li><strong>舉辦地址：</strong>${EventData.venue_address}</li>` : ""}
        </ul>

        <p>🎟️ <strong>請於活動當天提前 15 分鐘報到</strong>，現場將核對您的姓名或報名 Email。</p>

        <p style="margin-top: 20px;">
          👉 <a href="${baseUrl + "/event/" + eventId}" style="color: #007BFF;">查看活動詳情</a><br/>
          📅 <a href="https://calendar.google.com/calendar/u/0/r/eventedit?text=${EventData.title}${EventData.start && EventData.end ? `&data=${EventData.start}/${EventData.end}`:""}&details=活動詳情請見官方網站${EventData.venue_name?`&location=${EventData.venue_name}`:""}&sf=true&output=xml" style="color: #007BFF;">加入 Google 行事曆</a>
        </p>

        <p>如有任何問題，歡迎聯繫我們。</p>

        <p>期待與您在現場相見！</p>

        <p>
          【主辦單位名稱】<br />
          <a href="mailto:${EventData.users.email}">${EventData.users.email}</a> |
          <a href="${baseUrl + "/event/" + eventId}">官方網站</a>
        </p>
      </div>`
    // 發送通知
    const status = await sendEmail(reg.user_info_snapshot.email, `活動 ${EventData.title} 通知`, htmlBody)
    if(status) {
      await supabase
        .from('registrations')
        .update({ notification: true })
        .eq('event_id', eventId)
        .eq('user_id', userId)
      setRegistrations(registrations.map(r => r.user_id === userId ? { ...r, notification: true } : r))
    } else {
      console.error('發送通知失敗:')
      alert('發送通知失敗，請稍後再試。')
    }
    setSendingUserIds(prev => prev.filter(id => id !== userId)) // ❌ 清除寄送中狀態
  }

  const SendAllNotifications = async () => {
    if (!confirm('確定寄送通知給所有未通知的參加者？')) return
    if (!eventId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSendingAll(true) // ➕ 開始寄送

    const { data: permission } = await supabase
      .from('event_organizers')
      .select('role')
      .eq('event_id', eventId)
      .eq('role_id', user.id)
      .eq('role', 'organizer')
      .single()
    if (!permission) {
      setSendingAll(false)
      return alert('您沒有權限發送通知')
    }

    const { data: EventData } = await supabase
      .from('events')
      .select('title, start, end, deadline, venue_name, venue_address, users:organizer_id(name, email)')
      .eq('event_id', eventId)
      .single()
    if (!EventData) {
      setSendingAll(false)
      return alert('無法取得活動資料，請稍後再試。')
    }

    const baseUrl = window.location.origin

    for (const reg of registrations) {
      if (reg.notification) continue

      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('user_id', reg.user_id)
        .single()
      if (!userData) continue

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>📢 活動即將開始！您已成功報名【${EventData.title}】</h2>

          <p>親愛的${userData.name !== "" ? userData.name : userData.email}，您好：</p>
          <p>
            感謝您報名參加 <strong>【${EventData.title}】</strong>，活動即將登場，以下是活動資訊提醒，敬請準時出席！
          </p>

          <h3>📅 活動資訊</h3>
          <ul>
            ${EventData.start || EventData.end ? `<li><strong>舉辦時間：</strong>${toDatetimeLocal(EventData.start)} - ${toDatetimeLocal(EventData.end)}</li>`:""}
            ${EventData.venue_name? `<li><strong>舉辦地點：</strong>${EventData.venue_name}</li>` : ""}
            ${EventData.venue_address? `<li><strong>舉辦地址：</strong>${EventData.venue_address}</li>` : ""}
          </ul>

          <p>🎟️ <strong>請於活動當天提前 15 分鐘報到</strong>，現場將核對您的姓名或報名 Email。</p>

          <p style="margin-top: 20px;">
            👉 <a href="${baseUrl + "/event/" + eventId}" style="color: #007BFF;">查看活動詳情</a><br/>
            📅 <a href="https://calendar.google.com/calendar/u/0/r/eventedit?text=${EventData.title}${EventData.start && EventData.end ? `&data=${EventData.start}/${EventData.end}`:""}&details=活動詳情請見官方網站${EventData.venue_name?`&location=${EventData.venue_name}`:""}&sf=true&output=xml" style="color: #007BFF;">加入 Google 行事曆</a>
          </p>

          <p>如有任何問題，歡迎聯繫我們。</p>

          <p>期待與您在現場相見！</p>

          <p>
            【主辦單位名稱】<br />
            <a href="mailto:${EventData.users.email}">${EventData.users.email}</a> |
            <a href="${baseUrl + "/event/" + eventId}">官方網站</a>
          </p>
        </div>`

      const status = await sendEmail(userData.email, `活動 ${EventData.title} 通知`, htmlBody)
      if (status) {
        await supabase
          .from('registrations')
          .update({ notification: true })
          .eq('event_id', eventId)
          .eq('user_id', reg.user_id)
        setRegistrations(prev =>
          prev.map(r => r.user_id === reg.user_id ? { ...r, notification: true } : r)
        )
      } else {
        console.error('發送通知失敗:', reg.user_id)
        alert(`發送通知失敗：${userData.email}`)
      }
    }
    setSendingAll(false) // ✅ 全部處理完才關閉 loading 狀態
    setMessage('所有通知已發送完成。')
    setTimeout(() => {setMessage('')}, 2000) // 2秒後清除訊息
  }


  if (loading) return <LoadingScreen />
  if (notAuthorized) return <p className="p-4 text-red-600 dark:text-red-400">您沒有權限查看此報名資料。</p>

  return (
    <div className="max-w-screen-2xl mx-auto p-6 text-gray-900 dark:text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">報名者清單</h1>
        <div className="flex items-center space-x-2">
          {message && (
            <div className="text-sm text-green-600 dark:text-green-400">
              {message}
            </div>
          )}
          {IsOrganizer && !isEditing && !isSend && (
            <button
              onClick={handleEdit}
              className="bg-gray-600 text-white text-sm px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              編輯參賽資料
            </button>
          )}
          {IsOrganizer && isEditing && !isSend && (
            <>
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                確認
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-400 text-white text-sm px-4 py-2 rounded hover:bg-gray-500 transition-colors"
              >
                取消
              </button>
            </>
          )}
          {isSend && IsOrganizer &&
          <button
            disabled={sendingAll}
            onClick={SendAllNotifications}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingAll ? "寄送通知中":"發送所有通知"}
          </button>}
          {!isEditing && IsOrganizer &&
          <button
            onClick={() => setIsSend(!isSend)}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            {isSend ? '返回' : '發送活動通知'}
          </button>}
          {!isEditing && !isSend &&
          <button
            onClick={exportToCSV}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            下載 CSV
          </button>}
        </div>
      </div>

      <table className="w-full text-sm border border-gray-300 dark:border-gray-700">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            {formSchema?.personalFields?.map((field: string) => (
              <th
                key={field}
                className="border px-2 py-1 text-left text-gray-700 dark:text-gray-200"
              >
                {field}
              </th>
            ))}
            {formSchema?.customQuestions?.map((q: any) => (
              <th
                key={q.id}
                className="border px-2 py-1 text-left text-gray-700 dark:text-gray-200"
              >
                {q.label}
              </th>
            ))}
            {isEditing && <th className="border px-2 py-1 text-center text-gray-700 dark:text-gray-200">刪除</th>}
            {isSend ? (
              <th className="border px-2 py-1 text-center text-gray-700 dark:text-gray-200">發送通知</th>
            ) : (
              <th className="border px-2 py-1 text-center text-gray-700 dark:text-gray-200">通知狀態</th>
            )}
          </tr>
        </thead>
        <tbody>
        {(isEditing ? editedRegs : registrations).map((reg, i) => (
          <tr
            key={i}
            className="border-t bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
          >
            {formSchema.personalFields.map((field) => (
              <td
                key={field}
                className="border px-2 py-1 text-gray-800 dark:text-gray-100"
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={reg.user_info_snapshot[field] || ''}
                    onChange={(e) => onPersonalChange(i, field, e.target.value)}
                    className="w-full border rounded px-1 py-0.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                  />
                ) : (
                  reg.user_info_snapshot?.[field] ?? '-'
                )}
              </td>
            ))}

            {formSchema.customQuestions.map((q) => (
              <td
                key={q.id}
                className="border px-2 py-1 text-gray-800 dark:text-gray-100"
              >
                {isEditing ? (
                  q.type === 'text' ? (
                    <input
                      type="text"
                      value={reg.answers[q.id] || ''}
                      onChange={(e) => onAnswerChange(i, q.id, e.target.value)}
                      required={q.required}
                      className="w-full border rounded px-1 py-0.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    />
                  ) : q.type === 'textarea' ? (
                    <textarea
                      value={reg.answers[q.id] || ''}
                      onChange={(e) => onAnswerChange(i, q.id, e.target.value)}
                      required={q.required}
                      className="w-full border rounded px-1 py-0.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    />
                  ) : q.type === 'select' ? (
                    <select
                      value={reg.answers[q.id] || ''}
                      onChange={(e) => onAnswerChange(i, q.id, e.target.value)}
                      required={q.required}
                      className="w-full border rounded px-1 py-0.5 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                    >
                      <option value="">請選擇</option>
                      {q.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : null
                ) : (
                  reg.answers?.[q.id] ?? '-'
                )}
              </td>
            ))}

            {isEditing && (
              <td className="border px-2 py-1 text-center text-gray-800 dark:text-gray-100">
                <button
                  onClick={() => deleteRegistration(reg.user_id)}
                  className="bg-red-600 text-sm px-2 py-1 rounded hover:bg-red-700 transition-colors dark:bg-red-500 dark:hover:bg-red-400 text-white"
                  title="刪除報名資料"
                >
                  刪除
                </button>
              </td>
            )}
            {IsOrganizer && isSend ? (
              <td className="border px-2 py-1 text-center text-gray-800 dark:text-gray-100">
                <button
                  onClick={handleSendNotification(reg.user_id, reg.notification)}
                  disabled={sendingUserIds.includes(reg.user_id) || sendingAll}
                  className={`text-sm px-2 py-1 rounded transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed ${reg.notification 
                    ?'bg-gray-500 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-600' 
                    :'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-400'}`}
                  title="發送通知"
                >
                  { sendingUserIds.includes(reg.user_id)
                    ? "寄送中..."
                    : reg.notification 
                    ? "已發送"
                    : sendingAll
                    ? "寄送中..."
                    : "發送通知"}
                </button>
              </td>
            ) : (
              <td className="border px-2 py-1 text-center text-gray-800 dark:text-gray-100">
                {reg.notification ? '已發送' : '未發送'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  )
}
