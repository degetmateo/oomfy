import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  envDir: '../../',
  server: {
    port: 5173,
    proxy: {
      '^/(auth|members|publications|interactions|follows|notifications|chats|sessions|aux|settings|reports|staff|admin|health|api)': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
  preview: {
    host: true,
    port: Number(process.env.PORT) || 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
