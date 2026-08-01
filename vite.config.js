import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy Google Translate TTS requests so the browser treats them as same-origin.
      // This is needed because Windows does not have Kannada/Tamil/Telugu TTS voices,
      // so we stream audio from Google Translate TTS instead.
      '/api/tts': {
        target: 'https://translate.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tts/, '/translate_tts'),
      },
    },
  },
})
