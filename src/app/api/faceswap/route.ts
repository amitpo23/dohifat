import Replicate from 'replicate'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { targetImageUrl, swapImageUrl } = await req.json()

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'Replicate not configured' }, { status: 500 })
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

    // Use predictions API for reliable output
    const prediction = await replicate.predictions.create({
      model: 'easel/advanced-face-swap',
      input: {
        target_image: targetImageUrl,
        swap_image: swapImageUrl,
      },
    })

    const result = await replicate.wait(prediction)

    if (result.status === 'failed') {
      throw new Error(String(result.error) || 'Face swap failed')
    }

    const resultUrl = typeof result.output === 'string'
      ? result.output
      : Array.isArray(result.output) ? result.output[0] : null

    if (!resultUrl) {
      throw new Error('No result in response')
    }

    return NextResponse.json({ resultUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Face swap failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
