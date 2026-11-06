const ITERATIONS = 120000

function bytesToBase64(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' }, key, 256)
  return `${bytesToBase64(salt)}:${bytesToBase64(bits)}`
}

export async function verifyPassword(password, storedHash) {
  const [salt, expected] = storedHash.split(':')
  const actual = await hashPassword(password, base64ToBytes(salt))
  return actual === `${salt}:${expected}`
}

export function validateRegistration({ name, handle, email, password }) {
  if (name.trim().length < 2 || name.trim().length > 40) return 'Name must be 2–40 characters.'
  if (!/^[a-z0-9_]{3,20}$/i.test(handle)) return 'Handle must be 3–20 letters, numbers, or underscores.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  return ''
}
