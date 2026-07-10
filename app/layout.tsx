import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from 'vyrn'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MineAxis — MANAGEM | 3ST',
  description: 'Système de gestion HSE des permis internes et infractions — MineAxis MANAGEM | 3ST',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-[#0D1117] text-[#F0F6FC]">
        <ToastProvider
          position="top-right"
          duration={4000}
          maxToasts={5}
          theme="dark"
          richColors
          showProgressBar
        />
        {children}
      </body>
    </html>
  )
}
