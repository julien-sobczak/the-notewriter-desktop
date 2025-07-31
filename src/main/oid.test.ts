import { generateOid } from './oid';

describe('generateOid', () => {
  it('should return a string of length 40', () => {
    const oid = generateOid();
    expect(typeof oid).toBe('string');
    expect(oid.length).toBe(40);
  });

  it('should only contain hexadecimal characters', () => {
    const oid = generateOid();
    expect(oid).toMatch(/^[a-f0-9]{40}$/i);
  });

  it('should generate unique values', () => {
    const oids = new Set<string>();
    for (let i = 0; i < 10; i++) {
      oids.add(generateOid());
    }
    expect(oids.size).toBe(10);
  });
});
