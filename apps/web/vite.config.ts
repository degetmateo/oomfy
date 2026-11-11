import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { SECURITY_HEADER_VALUES } from '../../packages/shared/src/constants/security.js';

function securityHeadersPlugin() {
  const applyHeaders = (_req: any, res: any, next: () => void) => {
    for (const [k, v] of Object.entries(SECURITY_HEADER_VALUES)) res.setHeader(k, v);
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.removeHeader('X-XSS-Protection');
    next();
  };
  return {
    name: 'oomfy-security-headers',
    configureServer(s: any) { s.middlewares.use(applyHeaders); },
    configurePreviewServer(s: any) { s.middlewares.use(applyHeaders); },
    writeBundle(options: { dir?: string }) {
      const outDir = options.dir || path.resolve(process.cwd(), 'dist');
      const lines = ['/*', ...Object.entries(SECURITY_HEADER_VALUES).map(([k, v]) => `  ${k}: ${v}`)];
      fs.writeFileSync(path.join(outDir, '_headers'), `${lines.join('\n')}\n`, 'utf-8');
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), securityHeadersPlugin()],
  resolve: {
    alias: { '@oomfy/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)) },
  },
  envDir: '../../',
  server: {
    port: 5173,
    headers: SECURITY_HEADER_VALUES,
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
    headers: SECURITY_HEADER_VALUES,
  },
  test: { globals: true, environment: 'jsdom', setupFiles: './src/setupTests.ts' },
});
