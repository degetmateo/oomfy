import { describe, it, expect } from 'vitest';
import {
  SignupSchema, CreatePublicationSchema, CreatePublicationAdminFormSchema,
  SendMessageSchema, SendMessageAdminSchema, UsernameSchema, UpdateProfileSchema,
  normalizeProfileLink, LIMITS,
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

  it('normalizes valid profile links across domains, www, http, https, ports, and internal paths', () => {
    expect(normalizeProfileLink('ejemplo.com')).toBe('https://ejemplo.com');
    expect(normalizeProfileLink('www.ejemplo.com/perfil?ref=1#top')).toBe('https://www.ejemplo.com/perfil?ref=1#top');
    expect(normalizeProfileLink('http://ejemplo.com')).toBe('http://ejemplo.com');
    expect(normalizeProfileLink('https://EXAMPLE.COM/Bio')).toBe('https://example.com/Bio');
    expect(normalizeProfileLink('//cdn.ejemplo.com/page')).toBe('https://cdn.ejemplo.com/page');
    expect(normalizeProfileLink('localhost:5173/test')).toBe('https://localhost:5173/test');
    expect(normalizeProfileLink('oomfy.online/bob')).toBe('https://oomfy.online/bob');

    expect(UpdateProfileSchema.safeParse({ link: '' })).toMatchObject({ success: true, data: { link: null } });
    expect(UpdateProfileSchema.safeParse({ link: '   ' })).toMatchObject({ success: true, data: { link: null } });
    expect(UpdateProfileSchema.safeParse({ link: 'miweb.dev/hola' })).toMatchObject({
      success: true,
      data: { link: 'https://miweb.dev/hola' },
    });
  });

  it('rejects dangerous schemes, credentials, spaces, single non-domain words, and overlong profile links', () => {
    const invalidLinks = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'ftp://files.ejemplo.com',
      'https://oomfy.online@evil.com',
      'ejemplo.com con espacios',
      'palabrasueltasinpunto',
      'https://',
    ];
    for (const bad of invalidLinks) {
      expect(normalizeProfileLink(bad)).toBeNull();
      expect(UpdateProfileSchema.safeParse({ link: bad }).success).toBe(false);
    }

    const tooLong = `https://ejemplo.com/${'a'.repeat(LIMITS.LINK_MAX)}`;
    expect(UpdateProfileSchema.safeParse({ link: tooLong }).success).toBe(false);
  });
});
