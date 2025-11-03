import { v4 as uuidv4 } from 'uuid'

// This function generates a unique OID (Object ID)
// Implementation matches the one in src/main/oid.ts
export function generateOid(): string {
  // Generate two UUIDs, concatenate, remove dashes, and take the first 40 chars
  const oid = (uuidv4() + uuidv4()).replace(/-/g, '').slice(0, 40)
  return oid
}

// This function generates a unique OID from a given string (e.g., name)
export async function generateOidFromString(input: string): Promise<string> {
  const hash = await sha256(input)
  // Take the first 40 characters of the SHA-256 hash
  return hash.slice(0, 40)
}

async function sha256(message: string): Promise<string> {
  // Cannot use Node.js 'crypto' module in renderer process, so using Web Crypto API
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
