import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    middlewareMode: false
  },
  optimizeDeps: {
    esbuildOptions: {
      supported: {
        bigint: true
      }
    },
    exclude: ['elkjs']
  },
  build: {
    rollupOptions: {
      external: ['web-worker'],
      output: {
        globals: {
          'web-worker': 'Worker'
        }
      }
    },
    chunkSizeWarningLimit: 2000
  },
  ssr: {
    external: ['web-worker']
  }
})
