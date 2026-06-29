import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Presentr',
  description: 'Interactive presentations with live audience games',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23facc15'/><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-family='system-ui' font-weight='900' font-size='20' fill='%230f0f3d'>P</text></svg>" />
      </head>
      <body className="bg-[#0f0f3d] antialiased min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
