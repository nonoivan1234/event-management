import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ThemeInitializer from './theme-initializer'
import Navbar from '../components/navbar'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Event Hub',
  description: '一個活動報名平台',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased transition-colors duration-300 bg-white text-black dark:bg-gray-900 dark:text-white">
        <ThemeInitializer />
        <Navbar />
        <main className="pt-14">{children}</main>
      </body>
    </html>
  )
}