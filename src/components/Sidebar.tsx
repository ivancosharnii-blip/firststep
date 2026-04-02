'use client'

import { useEffect, useState, type MouseEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/langContext'
import { useTheme } from '@/lib/themeContext'

interface Chat {
  id: string
  subject: string
  title: string
  created_at: string
}

interface SidebarProps {
  sessionId: string
  activeChatId: string | null
  mobileOpen: boolean
  onMobileClose: () => void
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
}

export default function Sidebar({
  sessionId,
  activeChatId,
  mobileOpen,
  onMobileClose,
  onSelectChat,
  onNewChat,
}: SidebarProps) {
  const { lang, toggleLang, t } = useLang()
  const { theme, toggleTheme } = useTheme()
  const [chats, setChats] = useState<Chat[]>([])

  useEffect(() => {
    fetchChats()
  }, [sessionId, activeChatId])

  const fetchChats = async () => {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    if (data) setChats(data)
  }

  const handleDeleteChat = async (e: MouseEvent<HTMLButtonElement>, chatId: string) => {
    e.stopPropagation()
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('session_id', sessionId)

    if (error) {
      console.error(error)
      return
    }

    if (activeChatId === chatId) {
      onNewChat()
    }
    await fetchChats()
  }

  const groupByDate = (chats: Chat[]) => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()

    return {
      today: chats.filter(c => new Date(c.created_at).toDateString() === today),
      yesterday: chats.filter(c => new Date(c.created_at).toDateString() === yesterday),
      older: chats.filter(c => {
        const d = new Date(c.created_at).toDateString()
        return d !== today && d !== yesterday
      }),
    }
  }

  const grouped = groupByDate(chats)

  const renderGroup = (label: string, items: Chat[]) => {
    if (items.length === 0) return null
    return (
      <div key={label}>
        <div className="mt-3 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-[#9896D8] transition-colors duration-200 dark:text-[#8B89B8]">
          {label}
        </div>
        {items.map(chat => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`group relative mb-1 flex cursor-pointer items-start gap-1 rounded-[12px] border-l-[3px] px-3 py-2 transition-colors duration-200 ${
              activeChatId === chat.id
                ? 'border-l-[#4B4ACF] bg-white dark:bg-[#2A2940]'
                : 'border-l-transparent hover:bg-[#EEEEFF] dark:hover:bg-[#2A2940]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 text-xs text-[#9896D8] transition-colors duration-200 dark:text-[#9E9CC8]">
                {chat.subject}
              </div>
              <div className="truncate text-sm text-[#35347A] transition-colors duration-200 dark:text-[#D8D6F5]">
                {chat.title}
              </div>
            </div>
            <button
              type="button"
              aria-label={t('deleteChat')}
              onClick={e => void handleDeleteChat(e, chat.id)}
              className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#9896D8] opacity-0 transition-colors duration-200 group-hover:opacity-100 hover:text-[#4B4ACF] focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C8C6F0] focus-visible:ring-offset-0 dark:text-[#8B89B8] dark:hover:text-[#B8B6F0] dark:focus-visible:ring-[#4B4ACF]/50 max-md:opacity-100"
            >
              <span className="text-lg leading-none" aria-hidden>
                ×
              </span>
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden"
          onClick={onMobileClose}
          aria-label="Close menu"
        />
      )}
      <aside
        className={`flex h-full min-w-56 w-56 max-w-[85vw] flex-col border-r border-[#E4E2F5] bg-[#F5F4FF] transition-[transform,colors] duration-200 dark:border-[#2E2D4A] dark:bg-[#1E1D2E] max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:shadow-xl md:relative md:z-auto md:translate-x-0 ${
          mobileOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        }`}
      >
      <div className="border-b border-[#E4E2F5] p-4 transition-colors duration-200 dark:border-[#2E2D4A]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="text-[18px] font-semibold text-[#4B4ACF] transition-colors duration-200 dark:text-[#A5A3F0]">
            Lumi
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleLang}
              className="rounded-lg border-0 bg-[#EEEEFF] px-2 py-1 text-xs font-semibold text-[#4B4ACF] transition-colors duration-200 hover:bg-[#E0DFFF] dark:bg-[#2A2940] dark:text-[#C8C6F0] dark:hover:bg-[#353450]"
              aria-label={lang === 'ru' ? 'Switch to Romanian' : 'Switch to Russian'}
            >
              {lang === 'ru' ? 'RU' : 'RO'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-7 w-7 items-center justify-center rounded-lg border-0 bg-[#EEEEFF] text-sm transition-colors duration-200 hover:bg-[#E0DFFF] dark:bg-[#2A2940] dark:text-[#E8E6F5] dark:hover:bg-[#353450]"
              aria-label={theme === 'light' ? 'Dark mode' : 'Light mode'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="w-full rounded-[12px] border-0 bg-[#EEEEFF] px-3 py-2 text-left text-sm font-medium text-[#4B4ACF] transition-colors duration-200 hover:bg-[#E0DFFF] dark:bg-[#2A2940] dark:text-[#C8C6F0] dark:hover:bg-[#353450]"
        >
          + {t('newChat')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {renderGroup(t('today'), grouped.today)}
        {renderGroup(t('yesterday'), grouped.yesterday)}
        {renderGroup(t('older'), grouped.older)}
        {chats.length === 0 && (
          <div className="mt-8 px-4 text-center text-xs text-[#9896D8] transition-colors duration-200 dark:text-[#8B89B8]">
            {t('emptySidebarHint')}
          </div>
        )}
      </div>
    </aside>
    </>
  )
}