export const CSP_DIRECTIVES: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
  mediaSrc: ["'self'", 'blob:', 'https:'],
  connectSrc: [
    "'self'",
    'https://oomfy.online',
    'https://api.oomfy.online',
    'wss://api.oomfy.online',
    'https://*.oomfy.online',
    'wss://*.oomfy.online',
  ],
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

export function buildDevCspHeader(): string {
  return buildCspHeader({
    ...CSP_DIRECTIVES,
    scriptSrc: ["'self'", "'unsafe-inline'"],
    connectSrc: ["'self'", 'https:', 'http:', 'ws:', 'wss:'],
  });
}

export const SECURITY_HEADER_VALUES: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': buildCspHeader(CSP_DIRECTIVES),
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};
