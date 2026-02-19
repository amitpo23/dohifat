import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    const seed = Math.floor(Math.random() * 1_000_000)
    const encodedPrompt = encodeURIComponent(prompt.trim())
    const encodedImage = encodeURIComponent(imageUrl)
    const resultUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?image=${encodedImage}&width=1024&height=1024&seed=${seed}&nologo=true&model=flux`

    // Pre-fetch to trigger generation
    await fetch(resultUrl, { method: 'HEAD' }).catch(() => {})

    return NextResponse.json({ resultUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transform failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
