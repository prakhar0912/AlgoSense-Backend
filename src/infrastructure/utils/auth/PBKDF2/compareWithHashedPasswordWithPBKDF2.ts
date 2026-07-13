import { timingSafeEqual, webcrypto } from 'node:crypto'

export default async function(password: string, hashedPassword: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const hashSegments = hashedPassword.split('$')

  // Expected format: pbkdf2_sha512$<iterations>$<saltBase64>$<derivedKeyBase64>
  if (hashSegments.length !== 4) {
    return false
  }

  const [algorithm, iterationsRaw, saltBase64, derivedKeyBase64] = hashSegments
  if (algorithm !== 'pbkdf2_sha512') {
    return false
  }

  const iterations = Number(iterationsRaw)
  if (!Number.isInteger(iterations) || iterations < 1) {
    return false
  }
  if (!saltBase64 || !derivedKeyBase64) {
    return false
  }
  const salt = Buffer.from(saltBase64, 'base64')
  const expectedDerivedKey = Buffer.from(derivedKeyBase64, 'base64')

  if (!salt || !expectedDerivedKey || salt.length === 0 || expectedDerivedKey.length === 0) {
    return false
  }

  const passwordKey = await webcrypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const derivedBits = await webcrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-512',
      salt,
      iterations,
    },
    passwordKey,
    expectedDerivedKey.length * 8,
  )

  const actualDerivedKey = Buffer.from(derivedBits)

  if (actualDerivedKey.length !== expectedDerivedKey.length) {
    return false
  }

  return timingSafeEqual(actualDerivedKey, expectedDerivedKey)
}
