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

      console.log('獲取到的 session:', session)
      if (error) {
        console.error('獲取 session 時發生錯誤:', error)
        setStatus('錯誤：無法獲取 session')
        return
      }

      if (!session) {
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

      setStatus(result.success ? '綁定成功！即將導向加好友頁面...' : '綁定失敗：' + (result.error || '未知錯誤'))
      if(result.success)
        setTimeout(() => router.replace('https://line.me/R/ti/p/@463cxqls'), 1000)
      else
        setTimeout(() => window.close(), 3000)  
    }

    bindLine()
  }, [searchParams, router])

  return <p>{status}</p>
}
