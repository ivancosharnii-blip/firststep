'use client'

import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import Sidebar from '@/components/Sidebar'
import Chat from '@/components/Chat'
import { useLang } from '@/lib/langContext'
import { getSubjects } from '@/lib/openai'

export default function Home() {
  const { lang } = useLang()
  const [sessionId, setSessionId] = useState('')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [subject, setSubject] = useState(() => getSubjects('ru')[0])
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    const list = getSubjects(lang)
    setSubject(s => (list.includes(s) ? s : list[0]))
  }, [lang])

  useEffect(() => {
    let id = localStorage.getItem('lumi_session_id')
    if (!id) {
      id = uuidv4()
      localStorage.setItem('lumi_session_id', id)
    }
    setSessionId(id)
  }, [])

  if (!sessionId) return null

  const closeMobileSidebar = () => setMobileSidebarOpen(false)

  const handleNewChat = () => {
    setActiveChatId(null)
    setSubject(getSubjects(lang)[0])
    closeMobileSidebar()
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white transition-colors duration-200 dark:bg-[#16152A] md:h-screen">
      <Sidebar
        sessionId={sessionId}
        activeChatId={activeChatId}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={closeMobileSidebar}
        onSelectChat={id => {
          setActiveChatId(id)
          closeMobileSidebar()
        }}
        onNewChat={handleNewChat}
      />
      <Chat
        chatId={activeChatId}
        sessionId={sessionId}
        subject={subject}
        onSubjectChange={setSubject}
        onChatCreated={setActiveChatId}
        onOpenSidebar={() => setMobileSidebarOpen(true)}
        onNewChat={handleNewChat}
      />
    </div>
  )
}