import { webcrypto } from 'node:crypto'

export default async function(password: string): Promise<{ hashedPassword: string }> {
  const encoder = new TextEncoder()
  const iterations = 600000
  const salt = webcrypto.getRandomValues(new Uint8Array(16))
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
    64 * 8,
  )

  const saltBase64 = Buffer.from(salt).toString('base64')
  const derivedKeyBase64 = Buffer.from(derivedBits).toString('base64')
  const hashedPassword = `pbkdf2_sha512$${iterations}$${saltBase64}$${derivedKeyBase64}`

  return { hashedPassword }
}
