import QRCode from 'qrcode'

/**
 * Generate a real, scannable QR code as SVG string.
 * This is async because the qrcode library uses async rendering.
 */
export async function generateQRSvg(text: string, size = 200): Promise<string> {
  const svg = await QRCode.toString(text, {
    type: 'svg',
    width: size,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
  return svg
}
