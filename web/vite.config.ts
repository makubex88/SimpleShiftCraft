import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, the browser talks only to Vite; Vite forwards API calls (no CORS setup needed).
const target = process.env.API_URL ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': target, '/graphql': target } },
});
