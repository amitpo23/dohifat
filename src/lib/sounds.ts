let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  return audioCtx
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  try {
    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.value = frequency
    gain.gain.value = volume
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Audio not supported
  }
}

export function playCorrect() {
  playTone(523, 0.1, 'sine', 0.2)
  setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 100)
  setTimeout(() => playTone(784, 0.2, 'sine', 0.2), 200)
}

export function playWrong() {
  playTone(200, 0.3, 'sawtooth', 0.15)
}

export function playClick() {
  playTone(800, 0.05, 'sine', 0.1)
}

export function playScore() {
  playTone(440, 0.08, 'sine', 0.2)
  setTimeout(() => playTone(554, 0.08, 'sine', 0.2), 80)
  setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 160)
}

export function playCountdown() {
  playTone(440, 0.15, 'square', 0.1)
}

export function playFanfare() {
  const notes = [523, 659, 784, 1047]
  for (const [i, note] of notes.entries()) {
    setTimeout(() => playTone(note, 0.3, 'sine', 0.2), i * 150)
  }
}

export function playTick() {
  playTone(1000, 0.03, 'sine', 0.08)
}
