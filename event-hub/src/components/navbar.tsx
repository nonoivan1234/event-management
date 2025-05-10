'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, use } from 'react'
import { supabase } from '../lib/supabase'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const defaultAvatar = "data:image/png;base64,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"

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const AuthNavbar = pathname.startsWith('/auth')

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error || !data.user) {
        setUserEmail(null)
        setAvatarBase64(null)
      } else {
        setUserEmail(data.user.email ?? null)
        const { data: avatar, error } = await supabase
          .from('users')
          .select('avatar')
          .eq('user_id', data.user.id)
          .single()
        if (error) setAvatarBase64(defaultAvatar)
        else setAvatarBase64(avatar.avatar ?? defaultAvatar)
      }
    }

    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null
    if (saved) applyTheme(saved)
    fetchUser()
  }, [pathname])

  const applyTheme = (mode: 'light' | 'dark' | 'system') => {
    setTheme(mode)
    localStorage.setItem('theme', mode)
    const html = document.documentElement
    if (mode === 'dark') html.classList.add('dark')
    else if (mode === 'light') html.classList.remove('dark')
    else {
      // System
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.toggle('dark', prefersDark)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    router.push('/')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between py-2 px-6 bg-gray-100 dark:bg-gray-800 dark:text-white shadow">
      <h1
        onClick={() => router.push('/')}
        className="text-lg font-bold cursor-pointer"
      >
        🎓 Event Hub
      </h1>
      {AuthNavbar ? (<>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-sm fw-bold hover:underline">🎨 Theme</button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="w-48 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700"
          >
            <DropdownMenuRadioGroup value={theme} onValueChange={applyTheme}>
              <DropdownMenuRadioItem value="light">☀️ Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">🌙 Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">🖥️ System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </>) : (<>
        <div className="flex items-center gap-5">
          {userEmail && <button className="text-sm fw-bold hover:underline" onClick={() => router.push('/event/create')}>創建活動</button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {userEmail ? (
                <Avatar className="w-10 h-10 cursor-pointer">
                  <AvatarImage src={avatarBase64} alt="user avatar" className="object-cover" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              ): (
                <button className="text-sm fw-bold hover:underline">請先登入</button>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-64 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              {userEmail ? (
                <>
                  <DropdownMenuLabel className="truncate">Email: {userEmail}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    編輯個人資料
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/event/hold')}>您舉辦的活動</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/event/attend')}>您參加的活動</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>🎨 Theme</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={theme} onValueChange={applyTheme}>
                    <DropdownMenuRadioItem value="light">☀️ Light</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">🌙 Dark</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">🖥️ System</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>登出</DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuLabel className="text-center">尚未登入</DropdownMenuLabel>
                  <DropdownMenuLabel>🎨 Theme</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={theme} onValueChange={applyTheme}>
                    <DropdownMenuRadioItem value="light">☀️ Light</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">🌙 Dark</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">🖥️ System</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/auth/login')}>
                    登入
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/auth/signup')}>
                    註冊
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </>
    )}
    </nav>
  )
}
