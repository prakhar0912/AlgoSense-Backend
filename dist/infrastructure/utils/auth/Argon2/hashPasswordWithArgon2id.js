import argon2 from 'argon2';
export default async function (password) {
    const hashedPassword = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 16384,
        timeCost: 2,
        parallelism: 1,
        hashLength: 32,
    });
    return { hashedPassword };
}
// TODO Make sure to add a Rate Limiter if using argon
//# sourceMappingURL=hashPasswordWithArgon2id.js.map