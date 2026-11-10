import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: http:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https: wss: ws:",
  "frame-src 'self' https://open.spotify.com https://www.youtube.com https://youtube.com https://www.tiktok.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const securityHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': CSP_POLICY,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function securityHeadersPlugin() {
  const applyHeaders = (_req: any, res: any, next: () => void) => {
    for (const [k, v] of Object.entries(securityHeaders)) res.setHeader(k, v);
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.removeHeader('X-XSS-Protection');
    next();
  };
  return {
    name: 'oomfy-security-headers',
    configureServer(s: any) { s.middlewares.use(applyHeaders); },
    configurePreviewServer(s: any) { s.middlewares.use(applyHeaders); },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), securityHeadersPlugin()],
  envDir: '../../',
  server: {
    port: 5173,
    headers: securityHeaders,
    proxy: {
      '^/(auth|members|publications|interactions|follows|notifications|chats|sessions|aux|settings|reports|staff|admin|health|api)': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) return '/index.html';
        },
      },
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 5173,
    headers: securityHeaders,
  },
  test: { globals: true, environment: 'jsdom', setupFiles: './src/setupTests.ts' },
});
