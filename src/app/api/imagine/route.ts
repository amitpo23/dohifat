import Replicate from 'replicate'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { prompt, imageUrl: inputImageUrl } = await req.json()

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'Replicate not configured' }, { status: 500 })
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

    let output: unknown

    if (inputImageUrl) {
      // Image-to-image: use flux-1.1-pro with image_prompt
      output = await replicate.run('black-forest-labs/flux-1.1-pro', {
        input: {
          prompt,
          image_prompt: inputImageUrl,
          aspect_ratio: '1:1',
          output_format: 'webp',
          safety_tolerance: 2,
        },
      })
    } else {
      // Text-to-image: existing behavior
      output = await replicate.run('black-forest-labs/flux-schnell', {
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: '1:1',
          output_format: 'webp',
        },
      })
    }

    const imageUrl = typeof output === 'string' ? output : (Array.isArray(output) ? output[0] : output)

    return NextResponse.json({ imageUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
