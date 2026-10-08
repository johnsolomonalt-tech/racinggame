import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.hdr'],
  server: {
    port: 3000,
    host: true,
    cors: true,
  },
  preview: {
    port: 3000,
    host: true,
    cors: true,
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          'r3f-physics': ['@react-three/fiber', '@react-three/drei', '@react-three/rapier'],
          postprocessing: ['@react-three/postprocessing', 'postprocessing'],
        },
      },
    },
  },
});
