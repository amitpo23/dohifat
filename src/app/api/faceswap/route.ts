import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { targetImageUrl, swapImageUrl } = await req.json()

    if (!process.env.SEGMIND_API_KEY) {
      return NextResponse.json({ error: 'Face swap service not configured' }, { status: 500 })
    }

    if (!targetImageUrl || !swapImageUrl) {
      return NextResponse.json({ error: 'Both images are required' }, { status: 400 })
    }

    // Use Segmind Faceswap V3 - free daily credits (~100 swaps/day)
    const response = await fetch('https://api.segmind.com/v1/faceswap-v3', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.SEGMIND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_img: targetImageUrl,
        target_img: swapImageUrl,
        input_faces_index: '0',
        source_faces_index: '0',
        face_restore: 'codeformer-v0.1.0.pth',
        interpolation: 'Bilinear',
        detection_face_order: 'large-small',
        facedetection: 'retinaface_resnet50',
        detect_gender_input: 'no',
        detect_gender_source: 'no',
        face_restore_weight: 0.75,
        image_format: 'jpeg',
        image_quality: 95,
        base64: false,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Face swap failed: ${response.status} - ${errText}`)
    }

    // Segmind returns the image as binary - convert to base64 data URL
    const imageBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const resultUrl = `data:image/jpeg;base64,${base64}`

    return NextResponse.json({ resultUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Face swap failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
