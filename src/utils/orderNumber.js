// Order numbers look like CRK-4F7K9Q. Ambiguous characters (0, O, 1, I) are excluded.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateOrderNumber() {
  const bytes = new Uint32Array(6)
  crypto.getRandomValues(bytes)
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return `CRK-${suffix}`
}
