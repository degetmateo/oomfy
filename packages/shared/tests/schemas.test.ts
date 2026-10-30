import { describe, it, expect } from 'vitest';
import { SignupSchema, CreatePublicationSchema } from '../src/index.js';

describe('Shared Schemas Validation', () => {
  it('should validate correct signup payload', () => {
    const validData = {
      email: 'user@example.com',
      username: 'valid_user1',
      name: 'Valid User',
      password: 'password123',
    };
    const result = SignupSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email in signup', () => {
    const invalidData = {
      email: 'not-an-email',
      username: 'valid_user',
      name: 'Valid User',
      password: 'password123',
    };
    const result = SignupSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject publication exceeding content limit', () => {
    const longContent = 'a'.repeat(501);
    const result = CreatePublicationSchema.safeParse({ content: longContent });
    expect(result.success).toBe(false);
  });
});

