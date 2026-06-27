import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'B&I Family Feud',
  description: 'B&I networking group Family Feud game',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0f0f3d] antialiased">{children}</body>
    </html>
  )
}
