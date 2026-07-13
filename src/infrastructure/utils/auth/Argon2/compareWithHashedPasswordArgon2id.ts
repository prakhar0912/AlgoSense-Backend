import argon2 from 'argon2'

export default async function(password: string, hashedPassword: string): Promise<boolean> {
  if (!hashedPassword.startsWith('$argon2id$')) {
    throw new Error("Invalid hash stored in DB: Not a Argon2id hash")
  }

  return await argon2.verify(hashedPassword, password)
}
