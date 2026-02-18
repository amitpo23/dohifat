import Replicate from 'replicate'
import { NextResponse } from 'next/server'

export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json()

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'Replicate not configured' }, { status: 500 })
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

    const output = await replicate.run('kwaivgi/kling-v1.6-standard', {
      input: {
        prompt: prompt || 'animate this image',
        image: imageUrl,
        duration: 5,
      },
    })

    const videoUrl = typeof output === 'string' ? output : (Array.isArray(output) ? output[0] : output)

    return NextResponse.json({ videoUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video generation failed'
    // Replicate returns 402 when account has no credit
    if (message.includes('402') || message.includes('Payment Required') || message.includes('billing')) {
      return NextResponse.json({ error: 'שירות יצירת הסרטונים אינו זמין כרגע (נדרש קרדיט ב-Replicate)' }, { status: 402 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
