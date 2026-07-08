import QRCode from 'qrcode'

/** Encode a string as a QR code matrix. Returns null on failure. */
export function encodeQR(text: string): boolean[][] | null {
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
    const { size, data } = qr.modules
    const matrix: boolean[][] = []
    for (let r = 0; r < size; r++) {
      const row: boolean[] = []
      for (let c = 0; c < size; c++) {
        row.push(data[r * size + c] !== 0)
      }
      matrix.push(row)
    }
    return matrix
  } catch {
    return null
  }
}
