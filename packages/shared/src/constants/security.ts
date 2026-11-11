export const CSP_DIRECTIVES: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
  mediaSrc: ["'self'", 'blob:', 'https:'],
  connectSrc: ["'self'", 'https:', 'wss:', 'ws:'],
  frameSrc: ["'self'", 'https://open.spotify.com', 'https://www.youtube.com', 'https://youtube.com', 'https://www.tiktok.com'],
  workerSrc: ["'self'", 'blob:'],
  manifestSrc: ["'self'"],
  frameAncestors: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};

const toKebabCase = (key: string) => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function buildCspHeader(directives: Record<string, string[]> = CSP_DIRECTIVES): string {
  return Object.entries(directives)
    .map(([k, vals]) => `${toKebabCase(k)} ${vals.join(' ')}`)
    .join(';');
}

export const SECURITY_HEADER_VALUES: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': buildCspHeader(CSP_DIRECTIVES),
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

