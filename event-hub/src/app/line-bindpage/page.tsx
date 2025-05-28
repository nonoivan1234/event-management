'use client'
export default function BindPage() {
    const LINE_CLIENT_ID = "2007493440"
    const REDIRECT_URI = window.location.origin + '/api/bind-line'
    window.location.href=(`https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=1234&scope=profile%20openid`)
}