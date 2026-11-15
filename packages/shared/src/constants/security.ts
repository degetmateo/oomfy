export const CSP_DIRECTIVES: Record<string, string[]> = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'wasm-unsafe-eval'", 'https://static.cloudflareinsights.com'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
  mediaSrc: ["'self'", 'blob:', 'https:'],
  connectSrc: [
    "'self'",
    'blob:',
    'data:',
    'https://oomfy.online',
    'https://api.oomfy.online',
    'wss://api.oomfy.online',
    'https://*.oomfy.online',
    'wss://*.oomfy.online',
    'https://cloudflareinsights.com',
    'https://*.cloudflareinsights.com',
  ],
  frameSrc: ["'self'", 'https://open.spotify.com', 'https://www.youtube.com', 'https://youtube.com', 'https://www.tiktok.com'],
  workerSrc: ["'self'", 'blob:'],
  manifestSrc: ["'self'"],
  frameAncestors: ["'self'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: [],
};

const toKebabCase = (key: string) => key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function buildCspHeader(directives: Record<string, string[]> = CSP_DIRECTIVES): string {
  return Object.entries(directives)
    .map(([k, vals]) => (vals.length > 0 ? `${toKebabCase(k)} ${vals.join(' ')}` : toKebabCase(k)))
    .join(';');
}

export function buildDevCspHeader(): string {
  const devDirectives: Record<string, string[]> = {
    ...CSP_DIRECTIVES,
    scriptSrc: ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"],
    connectSrc: ["'self'", 'blob:', 'data:', 'https:', 'http:', 'ws:', 'wss:'],
  };
  delete devDirectives.upgradeInsecureRequests;
  return buildCspHeader(devDirectives);
}

export const SECURITY_HEADER_VALUES: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': buildCspHeader(CSP_DIRECTIVES),
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};
