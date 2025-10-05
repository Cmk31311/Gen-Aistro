import './globals.css'

export const metadata = {
  title: 'Gen-Aistro - NASA Space Biology Knowledge Engine',
  description: 'Explore NASA Space Biology research with AI-powered semantic search and insights.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-white text-slate-900 min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}
