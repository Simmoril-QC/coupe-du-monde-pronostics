import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// GitHub Pages : le site est servi sous /coupe-du-monde-pronostics/
// Les chemins des assets et le base du router doivent le refléter.
export default defineConfig({
    base: '/coupe-du-monde-pronostics/',
    plugins: [react()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false
    },
    server: {
        port: 3000
    }
});
