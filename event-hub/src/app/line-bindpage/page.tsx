'use client'

import { useEffect } from 'react'

export default function BindPage() {
  useEffect(() => {
    const LINE_CLIENT_ID = "2007493440"
    const REDIRECT_URI = window.location.origin + '/line-bindpage/callback'
    window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=1234&scope=profile%20openid`
  }, [])

  return <p>Redirecting to LINE...</p>
}
