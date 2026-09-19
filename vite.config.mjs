import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server-middleware',
      configureServer(server) {
        process.env.VITE_DEV_SERVER = 'true';
        server.middlewares.use(async (req, res, next) => {
          const url = req.url || '';
          if (url.startsWith('/api')) {
            try {
              const { default: apiApp } = await server.ssrLoadModule('/server/src/index.ts');
              return apiApp(req, res, next);
            } catch (err) {
              console.error('[API Middleware Error]:', err);
              return next(err);
            }
          }
          next();
        });
      },
      configurePreviewServer(server) {
        process.env.VITE_DEV_SERVER = 'true';
        server.middlewares.use(async (req, res, next) => {
          const url = req.url || '';
          if (url.startsWith('/api')) {
            try {
              const { default: apiApp } = await import('./server/src/index.ts');
              return apiApp(req, res, next);
            } catch (err) {
              console.error('[Preview API Middleware Error]:', err);
              return next(err);
            }
          }
          next();
        });
      }
    }
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': path.resolve(__dirname, './'),
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