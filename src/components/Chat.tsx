'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useLang } from '@/lib/langContext'
import MessageInput from '@/components/MessageInput'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image_url?: string
}

interface ChatProps {
  chatId: string | null
  sessionId: string
  subject: string
  onSubjectChange: (subject: string) => void
  onChatCreated: (chatId: string) => void
  onOpenSidebar: () => void
  onNewChat: () => void
}

export default function Chat({
  chatId,
  sessionId,
  subject,
  onSubjectChange,
  onChatCreated,
  onOpenSidebar,
  onNewChat,
}: ChatProps) {
  const { lang, t } = useLang()
  const [messages, setMessages] = useState<Message[]>([])
  /** Waiting for first byte of assistant stream (typing dots). */
  const [awaitingFirstToken, setAwaitingFirstToken] = useState(false)
  /** True for the whole send → stream → Supabase save. */
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatId) fetchMessages()
    else setMessages([])
  }, [chatId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, awaitingFirstToken, sending])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  const handleSend = async (text: string, image?: string) => {
    setSending(true)
    setAwaitingFirstToken(true)

    const isFirstMessage = messages.length === 0

    let currentChatId = chatId

    if (!currentChatId) {
      const title = text.slice(0, 40) || t('photoTask')
      const { data: newChat } = await supabase
        .from('chats')
        .insert({ session_id: sessionId, subject, title })
        .select()
        .single()
      if (!newChat) {
        setSending(false)
        setAwaitingFirstToken(false)
        return
      }
      currentChatId = newChat.id
      onChatCreated(newChat.id)
    }

    const userMessage = {
      role: 'user' as const,
      content: text,
      image_url: image ? `data:image/jpeg;base64,${image}` : undefined,
    }

    await supabase.from('messages').insert({
      chat_id: currentChatId,
      role: 'user',
      content: text || t('photoTask'),
      image_url: userMessage.image_url,
    })

    const userRowId = Date.now().toString()
    setMessages(prev => [...prev, { id: userRowId, ...userMessage }])

    let assistantId: string | null = null
    let lastVisible = ''

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          subject,
          image,
          language: lang,
          isFirstMessage,
        }),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => '')
        throw new Error(errText || response.statusText)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let raw = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        raw += decoder.decode(value, { stream: true })

        const sep = raw.indexOf('\x1E')
        const visible = sep >= 0 ? raw.slice(0, sep) : raw
        if (visible.length > 0) lastVisible = visible

        if (visible.length > 0) {
          setAwaitingFirstToken(false)
          if (!assistantId) {
            assistantId = `asst-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
            setMessages(prev => [
              ...prev,
              { id: assistantId!, role: 'assistant', content: visible },
            ])
          } else {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, content: visible } : m,
              ),
            )
          }
        }
      }

      const sep = raw.indexOf('\x1E')
      const assistantText = sep >= 0 ? raw.slice(0, sep) : raw

      let title: string | null = null
      if (sep >= 0) {
        try {
          const meta = JSON.parse(raw.slice(sep + 1)) as { title?: string | null }
          title = meta.title ?? null
        } catch {
          /* ignore malformed trailer */
        }
      }

      setAwaitingFirstToken(false)

      if (assistantText.length === 0 && !assistantId) {
        const fallbackId = `asst-${Date.now()}`
        assistantId = fallbackId
        setMessages(prev => [
          ...prev,
          { id: fallbackId, role: 'assistant', content: '\u2026' },
        ])
      }

      if (isFirstMessage && title?.trim()) {
        await supabase
          .from('chats')
          .update({ title: title.trim().slice(0, 200) })
          .eq('id', currentChatId)
      }

      await supabase.from('messages').insert({
        chat_id: currentChatId,
        role: 'assistant',
        content: assistantText.length > 0 ? assistantText : '\u2026',
      })

      if (assistantId) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId
              ? { ...m, content: assistantText || '\u2026' }
              : m,
          ),
        )
      }
    } catch {
      setAwaitingFirstToken(false)
      const err = t('streamError')
      if (assistantId) {
        const merged =
          lastVisible.length > 0 ? `${lastVisible}\n\n— ${err}` : err
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantId ? { ...m, content: merged } : m,
          ),
        )
        await supabase.from('messages').insert({
          chat_id: currentChatId,
          role: 'assistant',
          content: merged,
        })
      } else {
        const errId = `asst-err-${Date.now()}`
        setMessages(prev => [
          ...prev,
          { id: errId, role: 'assistant', content: err },
        ])
        await supabase.from('messages').insert({
          chat_id: currentChatId,
          role: 'assistant',
          content: err,
        })
      }
    } finally {
      setSending(false)
      setAwaitingFirstToken(false)
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white transition-colors duration-200 dark:bg-[#16152A]">
      <header className="flex shrink-0 items-center justify-between border-b border-[#E4E2F5] bg-white px-2 py-2 transition-colors duration-200 dark:border-[#2E2D4A] dark:bg-[#16152A] md:hidden">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-[#4B4ACF] transition-colors duration-200 hover:bg-[#F0EFFF] dark:text-[#A5A3F0] dark:hover:bg-[#2A2940]"
          aria-label="Menu"
        >
          ☰
        </button>
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-xl font-semibold text-[#4B4ACF] transition-colors duration-200 hover:bg-[#F0EFFF] dark:text-[#A5A3F0] dark:hover:bg-[#2A2940]"
          aria-label={t('newChat')}
        >
          +
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto bg-white p-4 pb-[calc(12rem+env(safe-area-inset-bottom,0px))] transition-colors duration-200 dark:bg-[#16152A] md:pb-4">
          <div className="flex min-h-full flex-col gap-3">
            {messages.length === 0 && !sending && (
          <div className="flex flex-1 flex-col items-center justify-center py-6 text-center md:min-h-0">
            <span className="text-[48px] leading-none" aria-hidden>
              👋
            </span>
            <p className="mt-4 text-[20px] font-semibold text-[#4B4ACF] transition-colors duration-200 dark:text-[#A5A3F0]">
              {t('emptyGreeting')}
            </p>
            <p className="mt-2 max-w-sm text-[14px] text-[#9896D8] transition-colors duration-200 dark:text-[#8B89B8]">
              {t('emptySubtext')}
            </p>
          </div>
            )}
            {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed transition-colors duration-200 md:max-w-[75%] ${
                msg.role === 'user'
                  ? 'rounded-tl-[18px] rounded-tr-[18px] rounded-br-[4px] rounded-bl-[18px] bg-[#4B4ACF] text-white'
                  : 'rounded-tl-[18px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[4px] bg-[#F0EFFF] text-[#2D2C6B] dark:bg-[#2A2940] dark:text-[#D8D6F5]'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="mb-1 text-[11px] font-medium text-[#9896D8] transition-colors duration-200 dark:text-[#8B89B8]">
                  Lumi
                </div>
              )}
              {msg.image_url && (
                <img
                  src={msg.image_url}
                  alt={t('homeworkImageAlt')}
                  className="mb-2 max-h-48 rounded-xl object-contain"
                />
              )}
              {msg.content}
            </div>
          </div>
            ))}
            {awaitingFirstToken && sending && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-tl-[18px] rounded-tr-[18px] rounded-br-[18px] rounded-bl-[4px] bg-[#F0EFFF] px-4 py-2.5 text-sm leading-relaxed text-[#2D2C6B] transition-colors duration-200 dark:bg-[#2A2940] dark:text-[#D8D6F5] md:max-w-[75%]">
              <div className="mb-1 text-[11px] font-medium text-[#9896D8] transition-colors duration-200 dark:text-[#8B89B8]">
                Lumi
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span>{t('thinking')}</span>
                <span className="inline-flex items-center gap-1" aria-hidden>
                  <span className="lumi-thinking-dot inline-block h-1.5 w-1.5 rounded-full bg-[#9896D8] transition-colors duration-200 dark:bg-[#7B79A8]" />
                  <span className="lumi-thinking-dot inline-block h-1.5 w-1.5 rounded-full bg-[#9896D8] transition-colors duration-200 dark:bg-[#7B79A8]" />
                  <span className="lumi-thinking-dot inline-block h-1.5 w-1.5 rounded-full bg-[#9896D8] transition-colors duration-200 dark:bg-[#7B79A8]" />
                </span>
              </div>
            </div>
          </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      <div className="shrink-0 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:pb-[env(safe-area-inset-bottom,0px)] md:static">
        <MessageInput
          onSend={handleSend}
          subject={subject}
          onSubjectChange={onSubjectChange}
          disabled={sending}
        />
      </div>
    </div>
  )
}