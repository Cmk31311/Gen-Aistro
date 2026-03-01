import './globals.css'
import { PapersProvider } from '../context/PapersContext'
import { BookmarkProvider } from '../context/BookmarkContext'
import { ThemeProvider } from '../context/ThemeContext'

export const metadata = {
  title: 'Gen-Aistro - NASA Space Biology Knowledge Engine',
  description: 'Explore NASA Space Biology research with AI-powered semantic search, knowledge graphs, and data-driven insights.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased font-sans min-h-screen flex flex-col">
        <ThemeProvider>
          <BookmarkProvider>
            <PapersProvider>
              {children}
            </PapersProvider>
          </BookmarkProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
