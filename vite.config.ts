import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'zustand', 'zod'],
          'three-core': ['three'],
          'r3f-core': ['@react-three/fiber'],
          'r3f-drei': ['@react-three/drei'],
          'r3f-fx': ['@react-three/postprocessing', 'postprocessing'],
        },
      },
    },
  },
});
