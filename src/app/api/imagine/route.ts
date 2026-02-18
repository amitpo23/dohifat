import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Use Pollinations.ai - completely free, no API key needed, uses FLUX model
    // The image is generated on-the-fly when the URL is accessed
    const encodedPrompt = encodeURIComponent(prompt.trim())
    const seed = Math.floor(Math.random() * 1_000_000)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux`

    return NextResponse.json({ imageUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
