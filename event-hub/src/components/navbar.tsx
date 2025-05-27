'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
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
import NotificationBell from '@/components/ui/NotificationBell'

const defaultAvatar = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAA2ZJREFUeF7tmk3ITUEcxn8vkVLyka8UkRRZEAsldiQbW0qxQknZ2rGRLSuyUErY2QlLygJRIhYKC1/53JDydSZnNO907nvPzDz/13u7Z5b3zv+Z53n+/5kz58yMMORtZMj10xnQVcCQO9BNgSEvgG4R/F9TYDZwBlhfV+Bd4CDwbrwrcjwNcIL3tRR4HtjTsm9Rt/Ew4AhwPJPlCcDFmzVrA35HzL8C0/uo+QTMjPqY8TQDBkLxP4ApiWn8XlXO1CDGhKsJaCR+CfAyUbzvPg94a2mChQFh5icDvzLFh2EhppSzFAxYBjyrmW8HrgrEO4iNwK0ayz0674lw5Rshs0xF00qWOBkQMAP4UmdGids0FUrWlVHFoyRqmX1PWj6GhQHbgGuqORrhrAHuK6vMwgAlZpOPvgok40hAapZSYmNUkHScQTZgUfVy9ap0qg2yAbOAz8NsgCR5EpBuDfjrgF+cHgBrS0uzR7zbWrvHrGuS5ElAakJPgRVKcg0meJPfA3MVJisNCKtgM3BTQTDAWAk8VhtsZYCsRAMD5NtgC5JhFSjxTcQrCYbVvgW4HvxQWmU/gUk13m7ggnJqlZLrxeUhsFpgQpj558BSpXirCvAcbwMbAsKXgF0tBZwD9gZ9nwBuEZQ3qwrwRBcArxtY76wEXY5+3wFcaei7PPjMNnAGeMLOBGdGSvsIzEkJyOlrXQHxU2HCcbQ0ID4VCsUfBk5GbhwCTo3hkAlXC9A7wamv13O02rsfS0x/05mifDFUGxBnfb7gyNsdpX+IzJPxlgFF3+3fVOf/CxMz3q/7C2Bx0EnCXQISiVdkvZcZ4dmD61PMvxjA6sSmTznI3g1KDZAR6Vf/Df9Lxi4xINy5ba0OMG9kiCgJWQe4u0WuHajvHCXjlRggyUAy49EBxRxyDXgErKq55GIUav8XXvSZLJe8H9Sd2W9SKcnEuQi4l6usp0KOAeEHj5z4TJ1jhvmEuGt4Z1MGyBFQPO9SCLbsm82pxAC303M7vonQpgHfcqZBiQE5sZZmZZ0ap4rYX33YOJ3jtKXyGtsbkHS7NNWA8IUkNdbaA2+Au5bnrue1aqkishebVmzKOmVxSzXAUXQD5cSVyWsXncxtogppJ1fQqzNAYOJAQ3QVMNDpE5DvKkBg4kBDDH0F/AGQ2IFBGnXtNgAAAABJRU5ErkJggg=="

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
        const { data: avatar, error: avatarError } = await supabase
          .from('users')
          .select('avatar')
          .eq('user_id', data.user.id)
          .single()
        if (avatarError) setAvatarBase64(defaultAvatar)
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
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      html.classList.toggle('dark', prefersDark)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    window.localStorage.removeItem('theme')
    setTheme('system')
    await window.location.reload()
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
      {AuthNavbar ? (
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
      ) : (
        <div className="flex items-center gap-3">
          {userEmail && (
            <>
              <button
                className="bg-blue-500 text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-blue-600 dark:bg-blue-400 dark:text-black dark:hover:bg-blue-300 transition"
                onClick={() => router.push('/')}
              >
                參加活動
              </button>
              <button
                className="bg-green-500 text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-green-600 dark:bg-green-400 dark:text-black dark:hover:bg-green-300 transition"
                onClick={() => router.push('/event/modify')}
              >
                創建活動
              </button>
              <NotificationBell key={pathname} />
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {userEmail ? (
                <Avatar className="w-10 h-10 cursor-pointer">
                  <AvatarImage src={avatarBase64!} alt="user avatar" className="object-cover" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              ) : (
                <button
                  className="bg-blue-500 text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-blue-600 dark:bg-blue-400 dark:text-black dark:hover:bg-blue-300 transition"
                  onClick={() => router.push('/auth/login')}
                >
                  請先登入
                </button>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-64 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              {userEmail ? (
                <>
                  <DropdownMenuLabel className="truncate">
                    Email: {userEmail}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    編輯個人資料
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/event/hold')}>
                    您舉辦的活動
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/event/attend')}>
                    您參加的活動
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>🎨 Theme</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={theme} onValueChange={applyTheme}>
                    <DropdownMenuRadioItem value="light">☀️ Light</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">🌙 Dark</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">🖥️ System</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    登出
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuLabel className="text-center">
                    尚未登入
                  </DropdownMenuLabel>
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
      )}
    </nav>
  )
}
