import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import ThemeInitializer from './theme-initializer'
import Navbar from '../components/navbar'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Event Hub',
  description: '一個活動報名平台',
}

export default function RootLayout({children,}: { children: React.ReactNode}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased transition-colors duration-300 bg-white text-black dark:bg-gray-900 dark:text-white">
        <ThemeInitializer />
        <Navbar />
        <main className="pt-14"> {/* 預留空間給固定高度的 Navbar */}
          {children}
        </main>
      </body>
    </html>
  )
}
