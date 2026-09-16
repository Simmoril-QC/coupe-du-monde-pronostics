import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages : le site est servi sous /coupe-du-monde-pronostics/
// Les chemins des assets et le base du router doivent le refléter.
// En dev, /api est proxifié vers le serveur Node (voir PORT/DB_PATH de server/).
export default defineConfig({
  base: '/coupe-du-monde-pronostics/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
});
