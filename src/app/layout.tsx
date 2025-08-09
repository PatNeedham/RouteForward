import type { Metadata, Viewport } from 'next'
import './globals.css'

// Using system fonts temporarily to avoid network dependency
const geistSans = {
  variable: '--font-geist-sans',
  className: 'font-sans',
}

const geistMono = {
  variable: '--font-geist-mono',
  className: 'font-mono',
}

export const metadata: Metadata = {
  title: 'RouteForward - Transit Simulation Platform',
  description: 'Visualize, simulate, and compare public transit scenarios to build more equitable and efficient cities.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
