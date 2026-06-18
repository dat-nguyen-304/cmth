import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // @cmth/sim is a TS workspace package consumed as source; let Vite transform it
  // instead of trying to pre-bundle it.
  optimizeDeps: { exclude: ['@cmth/sim'] },
  server: { port: 5173 },
});
