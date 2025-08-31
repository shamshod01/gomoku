import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import { GameProvider } from '../contexts/GameContext'
import { SocketProvider } from '../contexts/SocketContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gomoku Game',
  description: 'Classic Gomoku game with MetaMask authentication and betting',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SocketProvider>
            <GameProvider>
              {children}
            </GameProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
