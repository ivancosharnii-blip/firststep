# Lumi — проект firststep

## Описание

Веб-приложение **Lumi** — чат-помощник для школьников (Молдова) по домашним заданиям. Ассистент **не выдаёт готовые ответы**, а направляет через вопросы. Поддерживаются текст, выбор предмета и загрузка фото задания. История чатов и сообщений хранится в **Supabase**; ответы генерирует **OpenAI** (GPT-4o).

---

## Стек технологий

| Категория | Технология |
|-----------|------------|
| Фреймворк | **Next.js 16.2.2** (App Router, Turbopack в dev) |
| UI | **React 19.2.4**, **Tailwind CSS v4** |
| Язык | **TypeScript 5** |
| База / backend client | **Supabase** (`@supabase/supabase-js` 2.x) |
| LLM | **OpenAI** (`openai` 6.x): `gpt-4o` (чат), `gpt-4o-mini` (заголовок чата) |
| Идентификация сессии | **uuid** (v4), `localStorage` |
| Линтинг | ESLint + `eslint-config-next` |

В `package.json` также указана зависимость `@anthropic-ai/sdk` — в текущем коде маршрута чата не используется.

---

## Структура репозитория

```
firststep/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Nunito, ThemeProvider, LangProvider
│   │   ├── page.tsx            # Главный экран: Sidebar + Chat, сессия, мобильное меню
│   │   ├── globals.css         # Tailwind, @custom-variant dark, анимация точек «думает»
│   │   └── api/chat/route.ts   # POST: OpenAI + опционально заголовок чата
│   ├── components/
│   │   ├── Sidebar.tsx         # Список чатов, язык, тема, новый чат, удаление
│   │   ├── Chat.tsx            # Сообщения, отправка, вызов API
│   │   └── MessageInput.tsx    # Текстовое поле, вложения, пилюли предметов
│   └── lib/
│       ├── supabase.ts         # Клиент Supabase (проверка env)
│       ├── openai.ts           # getSubjects, getSystemPrompt (ru/ro)
│       ├── langContext.tsx     # RU/RO, localStorage `lumi_lang`
│       └── themeContext.tsx    # light/dark, localStorage `lumi_theme`, класс .dark на <html>
├── next.config.ts              # loadEnvConfig + проброс NEXT_PUBLIC_* в env сборки
├── package.json
├── PROJECT.MD                  # Этот файл
└── .env.local                  # Секреты (не коммитить)
```

---

## Переменные окружения

Файл **`.env.local`** в корне проекта (см. также `next.config.ts` и `src/lib/supabase.ts`):

| Переменная | Назначение |
|------------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (клиент) |
| `OPENAI_API_KEY` | Ключ OpenAI (только сервер, `src/app/api/chat/route.ts`) |

После изменения `.env.local` перезапустите `npm run dev`.

---

## База данных (Supabase)

Использование в коде подразумевает таблицы:

### `chats`

- `id` (UUID)
- `session_id` (string) — совпадает с `lumi_session_id` в `localStorage`
- `subject` (string) — название предмета на языке UI
- `title` (string) — заголовок в списке; при первом сообщении может обновляться ответом API (`title` из JSON)
- `created_at` (timestamp) — для группировки «Сегодня / Вчера / Раньше»

### `messages`

- `id` (или генерируется клиентом для оптимистичного UI — уточняйте по схеме)
- `chat_id` (FK → `chats.id`)
- `role` — `user` | `assistant`
- `content` (text)
- `image_url` (optional) — data URL для вложений
- `created_at` — для сортировки по возрастанию

Рекомендуется **каскадное удаление** сообщений при удалении чата (на уровне БД или RLS), так как в UI удаление идёт только по `chats`.

---

## API

### `POST /api/chat`

**Тело (JSON):**

- `messages` — массив `{ role, content }`
- `subject` — строка предмета
- `image` — опционально, base64 JPEG последнего сообщения пользователя
- `language` — `ru` | `ro` (иначе считается `ru`)
- `isFirstMessage` — если `true`, после основного ответа вызывается второй запрос к `gpt-4o-mini` для короткого заголовка (до ~5 слов)

**Ответ:**

```json
{ "content": "…", "title": "…" | null }
```

`title` заполняется только при `isFirstMessage: true`.

---

## Функциональность UI

- **Боковая панель**: бренд Lumi, переключатель **RU/RO**, **светлая/тёмная тема**, кнопка нового чата, группы чатов по дате, удаление чата (× по hover / на мобилке всегда видимо).
- **Чат**: пузыри пользователя/ассистента, пустое состояние, индикатор «думает», прокрутка к низу.
- **Ввод**: textarea, 📎, отправка, пилюли предметов из `getSubjects(lang)`.
- **Язык**: строки интерфейса в `langContext.tsx`; промпт Lumi и язык ответа по умолчанию — в `getSystemPrompt` (`openai.ts`).
- **Тема**: Tailwind **class strategy** — `@custom-variant dark` в `globals.css`, класс `dark` на `<html>` через `themeContext`.
- **Адаптив**: breakpoint **`md` (768px)**. На узких экранах сайдбар скрыт, открывается по ☰ с затемнением; поле ввода фиксировано снизу; пилюли предметов с горизонтальным скроллом; ширина пузырей до 85% на мобилке.

### localStorage

| Ключ | Значение |
|------|----------|
| `lumi_session_id` | UUID сессии (анонимный «пользователь») |
| `lumi_lang` | `ru` \| `ro` |
| `lumi_theme` | `light` \| `dark` |

### Шрифт

**Nunito** (Google Fonts через `next/font/google`), веса 400, 600, 700; подмножества `latin`, `cyrillic`.

---

## Скрипты npm

```bash
npm run dev    # next dev
npm run build  # next build
npm run start  # next start
npm run lint   # eslint
```

---

## Важные правила для разработки (контекст продукта)

- Следовать актуальной документации **Next.js 16** в `node_modules/next/dist/docs/` (в репозитории есть правило в `AGENTS.md`).
- Системный промпт Lumi явно **запрещает** выдавать прямой ответ на задание.
- Публичные ключи Supabase и OpenAI на клиенте не дублировать; `OPENAI_API_KEY` только на сервере.

---

## Название пакета

- **npm name**: `firststep`
- **Версия**: `0.1.0`
- **private**: `true`

---

*Документ сформирован по состоянию кодовой базы; при изменении схемы БД или API обновляйте этот файл.*
