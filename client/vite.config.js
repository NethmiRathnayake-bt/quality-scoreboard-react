import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// While developing, every address starting with /api is passed on to the Node server.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
});
