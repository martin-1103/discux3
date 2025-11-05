import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "@/components/auth/SessionProvider"
import { Navigation } from "@/components/Navigation"

// Initialize logging system at app startup
import '@/lib/console-logger'
import '@/lib/prisma-error-logger'
import logger from '@/lib/logger'

// Log app initialization
logger.info('🚀 Discux3 application starting', {
  timestamp: new Date().toISOString(),
  nodeEnv: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '0.1.0'
})

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Discux3 - Multi-Agent Collaboration Hub",
  description: "Platform for collaborative problem-solving with multiple AI agents",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <Navigation />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  )
}
