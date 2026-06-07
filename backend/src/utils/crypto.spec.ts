import { encrypt, decrypt } from './crypto';

describe('crypto utils', () => {
  describe('encrypt', () => {
    it('should return empty string for empty input', () => {
      expect(encrypt('')).toBe('');
    });

    it('should return a colon-separated hex string', () => {
      const result = encrypt('hello');
      expect(result).toContain(':');
      const [iv, data] = result.split(':');
      expect(iv).toHaveLength(32); // 16 bytes = 32 hex chars
      expect(data.length).toBeGreaterThan(0);
    });

    it('should produce different ciphertexts for same input (random IV)', () => {
      const a = encrypt('secret');
      const b = encrypt('secret');
      expect(a).not.toBe(b);
    });
  });

  describe('decrypt', () => {
    it('should return empty string for empty input', () => {
      expect(decrypt('')).toBe('');
    });

    it('should return empty string if no colon separator', () => {
      expect(decrypt('abc')).toBe('');
    });

    it('should decrypt what encrypt produces', () => {
      const original = 'my-secret-token-12345';
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('should handle special characters', () => {
      const original = 'p@$$w0rd!#%^&*()';
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });

    it('should handle long strings', () => {
      const original = 'x'.repeat(1000);
      const encrypted = encrypt(original);
      expect(decrypt(encrypted)).toBe(original);
    });
  });
});
