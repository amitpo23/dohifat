import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { targetImageUrl, swapImageUrl } = await req.json()

    if (!targetImageUrl) {
      return NextResponse.json({ error: 'Target image is required' }, { status: 400 })
    }

    if (!swapImageUrl) {
      return NextResponse.json({ error: 'Face image is required' }, { status: 400 })
    }

    // Use Pollinations Kontext for face swap (FREE)
    const prompt = 'swap the face in the target image with the face from the provided image, keep everything else identical, photorealistic result'
    const seed = Math.floor(Math.random() * 1_000_000)
    const encodedPrompt = encodeURIComponent(prompt)
    const encodedTarget = encodeURIComponent(targetImageUrl)
    const resultUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?image=${encodedTarget}&seed=${seed}&width=1024&height=1024&nologo=true&model=flux`

    // Pre-fetch to trigger generation
    await fetch(resultUrl, { method: 'HEAD' }).catch(() => {})

    return NextResponse.json({ resultUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Face swap failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
