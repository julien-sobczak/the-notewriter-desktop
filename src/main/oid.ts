import { randomUUID } from 'crypto';

// This function generates a unique OID (Object ID)
function generateOid(): string {
  // Generate two UUIDs, concatenate, remove dashes, and take the first 40 chars
  const oid = (randomUUID() + randomUUID()).replace(/-/g, '').slice(0, 40);
  return oid;
}

// eslint-disable-next-line import/prefer-default-export
export { generateOid };
