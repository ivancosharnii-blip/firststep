'use client'

import { useState, useRef } from 'react'
import { getSubjects } from '@/lib/openai'
import { useLang } from '@/lib/langContext'

interface MessageInputProps {
  onSend: (text: string, image?: string) => void
  subject: string
  onSubjectChange: (subject: string) => void
  disabled: boolean
}

export default function MessageInput({ onSend, subject, onSubjectChange, disabled }: MessageInputProps) {
  const { t, lang } = useLang()
  const subjects = getSubjects(lang)
  const [text, setText] = useState('')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImagePreview(result)
      setImageBase64(result.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const handleSend = () => {
    if (!text.trim() && !imageBase64) return
    onSend(text, imageBase64 || undefined)
    setText('')
    setImageBase64(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-[#EEEEFF] bg-[#F9F9FF] p-3 transition-colors duration-200 dark:border-[#2E2D4A] dark:bg-[#1E1D2E]">
      {imagePreview && (
        <div className="relative mb-2 inline-block">
          <img
            src={imagePreview}
            alt="preview"
            className="h-20 rounded-[10px] border-[1.5px] border-[#E0DFFF] object-cover transition-colors duration-200 dark:border-[#2E2D4A]"
          />
          <button
            type="button"
            onClick={() => {
              setImagePreview(null)
              setImageBase64(null)
              if (fileRef.current) fileRef.current.value = ''
            }}
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#4B4ACF] text-[11px] text-white transition-colors hover:bg-[#3C3AB8]"
            aria-label={t('removeImage')}
          >
            ×
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('inputPlaceholder')}
          disabled={disabled}
          rows={1}
          className="min-h-[42px] flex-1 resize-none rounded-[14px] border-[1.5px] border-[#E0DFFF] bg-white px-3 py-2 text-[14px] leading-snug text-[#2D2C6B] placeholder:text-[#9896D8] transition-colors duration-200 focus:border-[#4B4ACF] focus:outline-none disabled:opacity-50 dark:border-[#2E2D4A] dark:bg-[#252438] dark:text-[#E8E6F5] dark:placeholder:text-[#7B79A8]"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="flex h-[42px] min-w-[42px] shrink-0 items-center justify-center rounded-[12px] border-0 bg-[#F0EFFF] text-base text-[#4B4ACF] transition-colors duration-200 hover:bg-[#E0DFFF] disabled:pointer-events-none disabled:opacity-40 dark:bg-[#2A2940] dark:text-[#B4B2F0] dark:hover:bg-[#353450]"
          aria-label={t('attachFile')}
        >
          📎
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !imageBase64)}
          className="flex h-[42px] min-w-[42px] shrink-0 items-center justify-center rounded-[12px] border-0 bg-[#4B4ACF] text-lg font-medium text-white transition-colors duration-200 hover:bg-[#3C3AB8] disabled:opacity-40"
          aria-label={t('send')}
        >
          →
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      <div className="mt-2 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <span className="shrink-0 text-xs text-[#9896D8] transition-colors duration-200 dark:text-[#8B89B8]">
          {t('subjectLabel')}
        </span>
        <div className="-mx-1 flex max-md:flex-nowrap max-md:gap-2 max-md:overflow-x-auto max-md:px-1 max-md:pb-0.5 max-md:[-webkit-overflow-scrolling:touch] max-md:[scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:max-md:hidden">
          {subjects.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onSubjectChange(s)}
              className={`shrink-0 rounded-[20px] px-3 py-1 text-xs font-medium transition-colors duration-200 ${
                subject === s
                  ? 'bg-[#4B4ACF] text-white'
                  : 'border-0 bg-[#F0EFFF] text-[#9896D8] dark:bg-[#2A2940] dark:text-[#9E9CC8]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}