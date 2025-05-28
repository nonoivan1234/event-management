'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function BindLinePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState('處理中...')

  useEffect(() => {
    const bindLine = async () => {
      const code = searchParams.get('code')
      if (!code) {
        setStatus('錯誤：缺少授權碼')
        return
      }

      const {data: { session }, error} = await supabase.auth.getSession()

      if (error || !session) {
        setStatus('錯誤：尚未登入 Supabase')
        return
      }
      
      const accessToken = session.access_token
      console.log(`${process.env.NEXT_PUBLIC_SUPABASE_URL!}/functions/v1/line-callback?code=${code}`)
      // 呼叫 Edge Function 綁定 line_id
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/functions/v1/line-callback?code=${code}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )

      const result = await res.json()

      setStatus(result.success ? '綁定成功！即將返回個人資料頁面...' : '綁定失敗：' + (result.error || '未知錯誤'))
      setTimeout(() => router.replace('/profile'), 1000)
    }

    bindLine()
  }, [searchParams, router])

  return <p>{status}</p>
}
