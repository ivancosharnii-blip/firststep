import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { getSystemPrompt } from '@/lib/openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/** Web Streams wrapper — same role as legacy AI SDK StreamingTextResponse (text/plain UTF-8). */
function StreamingTextResponse(
  stream: ReadableStream<Uint8Array>,
  init?: ResponseInit,
): Response {
  return new Response(stream, {
    ...init,
    status: init?.status ?? 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      ...init?.headers,
    },
  })
}

async function generateChatTitle(
  messages: { role: string; content: string }[],
  image?: string,
): Promise<string | null> {
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  const userSnippet =
    (typeof lastUser?.content === 'string' && lastUser.content.trim()) ||
    (image ? 'homework question with an attached image' : 'homework question')

  const titleRes = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Generate a very short title (max 5 words) for a homework help conversation about this question: ${userSnippet}. Return only the title, no punctuation, no quotes.`,
      },
    ],
    max_tokens: 32,
    temperature: 0.4,
  })

  const raw = titleRes.choices[0].message.content?.trim()
  if (!raw) return null
  return raw
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/[.!?…]+$/g, '')
    .trim()
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { messages, subject, image, language, isFirstMessage } = body as {
    messages: { role: string; content: string }[]
    subject: string
    image?: string
    language?: string
    isFirstMessage?: boolean
  }

  const lang: 'ro' | 'ru' = language === 'ro' ? 'ro' : 'ru'

  const formattedMessages = messages.map((msg, index) => {
    if (msg.role === 'user' && image && index === messages.length - 1) {
      return {
        role: 'user',
        content: [
          ...(msg.content ? [{ type: 'text' as const, text: msg.content }] : []),
          {
            type: 'image_url' as const,
            image_url: { url: `data:image/jpeg;base64,${image}` },
          },
        ],
      }
    }
    return { role: msg.role, content: msg.content }
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: getSystemPrompt(subject, lang) },
            ...(formattedMessages as ChatCompletionMessageParam[]),
          ],
          max_tokens: 500,
          stream: true,
        })

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content ?? ''
          if (content) controller.enqueue(encoder.encode(content))
        }

        let title: string | null = null
        if (isFirstMessage) {
          title = await generateChatTitle(messages, image)
        }

        controller.enqueue(encoder.encode(`\x1E${JSON.stringify({ title })}`))
        controller.close()
      } catch (err) {
        controller.error(err instanceof Error ? err : new Error(String(err)))
      }
    },
  })

  return StreamingTextResponse(readable)
}
