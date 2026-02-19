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

    // Use predictions API instead of run() - run() returns empty object for this model
    const prediction = await replicate.predictions.create({
      model: 'kwaivgi/kling-v1.6-standard',
      input: {
        prompt: prompt || 'animate this image',
        image: imageUrl,
        duration: 5,
      },
    })

    const result = await replicate.wait(prediction)

    if (result.status === 'failed') {
      throw new Error(String(result.error) || 'Video generation failed')
    }

    const videoUrl = typeof result.output === 'string'
      ? result.output
      : Array.isArray(result.output) ? result.output[0] : null

    if (!videoUrl) {
      throw new Error('No video URL in response')
    }

    return NextResponse.json({ videoUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
