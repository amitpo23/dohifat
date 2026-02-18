export function vibrate(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

export function vibrateLight() {
  vibrate(10)
}

export function vibrateMedium() {
  vibrate(25)
}

export function vibrateHeavy() {
  vibrate([30, 50, 30])
}

export function vibrateSuccess() {
  vibrate([10, 30, 10, 30, 50])
}

export function vibrateError() {
  vibrate([50, 100, 50])
}
