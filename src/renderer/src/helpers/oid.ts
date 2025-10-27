import { v4 as uuidv4 } from 'uuid'

// This function generates a unique OID (Object ID)
// Implementation matches the one in src/main/oid.ts
export function generateOid(): string {
  // Generate two UUIDs, concatenate, remove dashes, and take the first 40 chars
  const oid = (uuidv4() + uuidv4()).replace(/-/g, '').slice(0, 40)
  return oid
}
