import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const FALLBACK_CAPTIONS = [
  '🐦 !דוכיפת approved',
  '🌵 חם בערבה, אבל התמונה יותר חמה!',
  '📸 רגע שלא נשכח!',
  '🎂 !יומהולדת שמח',
  '🏜️ !הערבה בליבנו',
  '👨‍👩‍👧‍👦 !משפחה זה הכל',
]

export async function POST(req: Request) {
  try {
    const { imageBase64, mediaType } = await req.json()

    if (!process.env.ANTHROPIC_API_KEY) {
      const caption = FALLBACK_CAPTIONS[Math.floor(Math.random() * FALLBACK_CAPTIONS.length)]
      return NextResponse.json({ caption })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'אתה קומיקאי ישראלי. כתוב קאפשן מצחיק אחד בעברית (עד 15 מילים) לתמונה הזו מסופ"ש יומהולדת משפחתי בערבה. בסגנון ישראלי חם ומצחיק. תחזיר רק את הקאפשן, בלי גרשיים.',
            },
          ],
        },
      ],
    })

    const firstBlock = response.content.at(0)
    const caption =
      firstBlock && firstBlock.type === 'text'
        ? firstBlock.text
        : FALLBACK_CAPTIONS[0]

    return NextResponse.json({ caption })
  } catch {
    const caption = FALLBACK_CAPTIONS[Math.floor(Math.random() * FALLBACK_CAPTIONS.length)]
    return NextResponse.json({ caption })
  }
}
