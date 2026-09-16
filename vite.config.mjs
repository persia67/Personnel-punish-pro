import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
    }
  },
  optimizeDeps: {
    entries: ['index.html'],
    include: ['react', 'react-dom', 'lucide-react', 'framer-motion', 'recharts']
  },
  server: {
    watch: {
      ignored: ['**/android/**', '**/release/**', '**/src-tauri/**', '**/dist/**']
    }
  },
  // CRITICAL for Electron and Android:
  // Using relative path './' ensures assets are loaded correctly
  // when served from the file system (file://) instead of a web server root.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})