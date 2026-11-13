import { describe, it, expect } from 'vitest';
import { SignupSchema, CreatePublicationSchema, UsernameSchema } from '../src/index.js';

describe('Shared Schemas Validation', () => {
  it('should validate correct signup payload with accepted_terms', () => {
    const validData = {
      email: 'user@example.com',
      username: 'valid_user1',
      name: 'Valid User',
      password: 'password123',
      accepted_terms: true,
    };
    const result = SignupSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject signup when accepted_terms is missing or false', () => {
    const missingTerms = {
      email: 'user@example.com',
      username: 'valid_user1',
      name: 'Valid User',
      password: 'password123',
      accepted_terms: false,
    };
    const result = SignupSchema.safeParse(missingTerms);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email in signup', () => {
    const invalidData = {
      email: 'not-an-email',
      username: 'valid_user',
      name: 'Valid User',
      password: 'password123',
      accepted_terms: true,
    };
    const result = SignupSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject publication exceeding content limit', () => {
    const longContent = 'a'.repeat(501);
    const result = CreatePublicationSchema.safeParse({ content: longContent });
    expect(result.success).toBe(false);
  });

  it('should only allow English letters, numbers and underscores in UsernameSchema', () => {
    // Valid usernames
    expect(UsernameSchema.safeParse('valid_user').success).toBe(true);
    expect(UsernameSchema.safeParse('ALICE_123').success).toBe(true);
    expect(UsernameSchema.safeParse('user_99').success).toBe(true);
    expect(UsernameSchema.safeParse('a_1').success).toBe(true);

    // Invalid usernames: non-English characters, hyphens, dots, spaces, symbols, emojis
    const invalidUsernames = [
      'userñ',
      'café_1',
      'user-name',
      'user.name',
      'user name',
      'user@oomfy',
      'user!123',
      'user🚀',
      'user$name',
      'user#tag',
    ];

    for (const invalid of invalidUsernames) {
      const res = UsernameSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe(
          'Solo se permiten letras del alfabeto inglés, números y guiones bajos.'
        );
      }
    }
  });
});
