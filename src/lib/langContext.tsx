'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Lang = 'ro' | 'ru'

export const LUMI_LANG_KEY = 'lumi_lang'

const dict = {
  ru: {
    newChat: 'Новый чат',
    today: 'Сегодня',
    yesterday: 'Вчера',
    older: 'Раньше',
    subjectLabel: 'Предмет:',
    emptyGreeting: 'Привет! Я Lumi',
    emptySubtext:
      'Выбери предмет и задай вопрос или прикрепи фото задания.',
    inputPlaceholder: 'Напиши вопрос или прикрепи фото...',
    emptySidebarHint: 'Начни новый чат чтобы история появилась здесь',
    deleteChat: 'Удалить чат',
    removeImage: 'Убрать изображение',
    attachFile: 'Прикрепить файл',
    send: 'Отправить',
    thinking: 'Lumi думает',
    streamError: 'Не удалось получить ответ. Попробуй ещё раз.',
    photoTask: 'Фото задание',
    homeworkImageAlt: 'задание',
  },
  ro: {
    newChat: 'Chat nou',
    today: 'Azi',
    yesterday: 'Ieri',
    older: 'Mai vechi',
    subjectLabel: 'Materie:',
    emptyGreeting: 'Salut! Sunt Lumi',
    emptySubtext:
      'Alege materia și pune o întrebare sau atașează o fotografie.',
    inputPlaceholder: 'Scrie o întrebare sau atașează o fotografie...',
    emptySidebarHint: 'Începe un chat nou ca istoria să apară aici',
    deleteChat: 'Șterge conversația',
    removeImage: 'Elimină imaginea',
    attachFile: 'Atașează fișier',
    send: 'Trimite',
    thinking: 'Lumi se gândește',
    streamError: 'Nu am putut primi răspunsul. Încearcă din nou.',
    photoTask: 'Temă din fotografie',
    homeworkImageAlt: 'tema',
  },
} as const

export type UiKey = keyof typeof dict.ru

type LangContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  t: (key: UiKey) => string
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ru')

  useEffect(() => {
    const stored = localStorage.getItem(LUMI_LANG_KEY)
    if (stored === 'ro' || stored === 'ru') {
      setLangState(stored)
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'ro'
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    localStorage.setItem(LUMI_LANG_KEY, next)
  }, [])

  const toggleLang = useCallback(() => {
    setLangState(prev => {
      const next = prev === 'ru' ? 'ro' : 'ru'
      localStorage.setItem(LUMI_LANG_KEY, next)
      return next
    })
  }, [])

  const t = useCallback(
    (key: UiKey) => dict[lang][key],
    [lang]
  )

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t }),
    [lang, setLang, toggleLang, t]
  )

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) {
    throw new Error('useLang must be used within LangProvider')
  }
  return ctx
}
