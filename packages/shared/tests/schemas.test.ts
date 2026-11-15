import { describe, it, expect } from 'vitest';
import {
  SignupSchema, CreatePublicationSchema, CreatePublicationAdminFormSchema,
  SendMessageSchema, SendMessageAdminSchema, UsernameSchema, UpdateOnlineStatusSchema, LIMITS,
} from '../src/index.js';

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

  it('should enforce 1024 char limit for standard users and unlimited for admins', () => {
    expect(LIMITS.EMOTE_MAX_PER_USER).toBe(6);
    expect(CreatePublicationSchema.safeParse({ content: 'a'.repeat(1024) }).success).toBe(true);
    expect(CreatePublicationSchema.safeParse({ content: 'a'.repeat(1025) }).success).toBe(false);
    expect(CreatePublicationAdminFormSchema.safeParse({ content: 'a'.repeat(2500) }).success).toBe(true);
    expect(SendMessageSchema.safeParse({ chat_id: 'chat-1', content: 'a'.repeat(1024) }).success).toBe(true);
    expect(SendMessageSchema.safeParse({ chat_id: 'chat-1', content: 'a'.repeat(1025) }).success).toBe(false);
    expect(SendMessageAdminSchema.safeParse({ chat_id: 'chat-1', content: 'a'.repeat(2500) }).success).toBe(true);
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

  it('should validate UpdateOnlineStatusSchema boolean values only', () => {
    expect(UpdateOnlineStatusSchema.safeParse({ show_online_status: true }).success).toBe(true);
    expect(UpdateOnlineStatusSchema.safeParse({ show_online_status: false }).success).toBe(true);
    expect(UpdateOnlineStatusSchema.safeParse({ show_online_status: 'false' }).success).toBe(false);
    expect(UpdateOnlineStatusSchema.safeParse({}).success).toBe(false);
  });
});
