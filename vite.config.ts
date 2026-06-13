import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    base: '/coupe-du-monde-pronostics/',
    build: {
      outDir: '../docs',
      emptyOutDir: true,
      sourcemap: false
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_SUPABASE_URL || 'https://your-project.supabase.co',
          changeOrigin: true
        }
      }
    }
  };
});
