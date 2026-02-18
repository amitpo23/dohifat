import Replicate from 'replicate'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { targetImageUrl, swapImageUrl } = await req.json()

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: 'Replicate not configured' }, { status: 500 })
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

    const output = await replicate.run('codeplugtech/face-swap', {
      input: {
        target_image: targetImageUrl,
        swap_image: swapImageUrl,
      },
    })

    return NextResponse.json({ resultUrl: output })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Face swap failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
