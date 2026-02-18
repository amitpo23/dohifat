import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'

export const maxDuration = 300

const KLING_API_BASE = 'https://api.klingai.com'

function generateKlingToken(): string {
  const accessKey = process.env.KLING_ACCESS_KEY
  const secretKey = process.env.KLING_SECRET_KEY
  if (!accessKey || !secretKey) throw new Error('KLING keys not configured')

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: accessKey,
    iat: now,
    exp: now + 1800,
    nbf: now - 5,
  }
  return jwt.sign(payload, secretKey, { algorithm: 'HS256', header: { alg: 'HS256', typ: 'JWT' } })
}

async function pollTaskResult(taskId: string, token: string, maxAttempts = 120): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const res = await fetch(`${KLING_API_BASE}/v1/videos/image2video/${taskId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await res.json()
    const task = data.data

    if (task?.task_status === 'succeed' && task?.task_result?.videos?.[0]?.url) {
      return task.task_result.videos[0].url
    }

    if (task?.task_status === 'failed') {
      throw new Error(task?.task_status_msg || 'Video generation failed')
    }
  }

  throw new Error('Video generation timed out')
}

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json()

    if (!process.env.KLING_ACCESS_KEY || !process.env.KLING_SECRET_KEY) {
      return NextResponse.json({ error: 'KLING API not configured' }, { status: 500 })
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    const token = generateKlingToken()

    // Create image-to-video task
    const createRes = await fetch(`${KLING_API_BASE}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model_name: 'kling-v1-6',
        image: imageUrl,
        prompt: prompt || 'animate this image with gentle motion',
        duration: '5',
        mode: 'std',
      }),
    })

    const createData = await createRes.json()

    if (createData.code !== 0 || !createData.data?.task_id) {
      throw new Error(createData.message || 'Failed to create video task')
    }

    // Poll for result
    const videoUrl = await pollTaskResult(createData.data.task_id, token)

    return NextResponse.json({ videoUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Video generation failed'
    if (message.includes('balance') || message.includes('1102')) {
      return NextResponse.json({ error: 'אין מספיק קרדיט בחשבון KLING - יש להוסיף קרדיט באתר klingai.com' }, { status: 402 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
