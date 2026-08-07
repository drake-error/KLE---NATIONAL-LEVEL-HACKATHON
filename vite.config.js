import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'

/**
 * Custom Vite plugin that creates a server-side endpoint at /api/tts.
 * It fetches audio from Google Translate TTS using Node.js (server-side),
 * with proper headers so Google returns real audio. The audio is then
 * streamed back to the browser as same-origin audio/mpeg.
 *
 * This is needed because Windows has NO Kannada/Tamil/Telugu TTS voices,
 * so we must use Google Translate TTS for those languages.
 */
function googleTTSProxy() {
  return {
    name: 'google-tts-proxy',
    configureServer(server) {
      server.middlewares.use('/api/tts', (req, res) => {
        // Extract query string from the incoming request
        const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        const googleUrl = `https://translate.google.com/translate_tts${qs}`;

        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/',
            'Accept': 'audio/mpeg, audio/*, */*',
          },
        };

        https.get(googleUrl, options, (googleRes) => {
          if (googleRes.statusCode !== 200) {
            console.error(`[TTS Proxy] Google returned ${googleRes.statusCode} for: ${qs}`);
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('TTS proxy error');
            return;
          }
          res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400',
          });
          googleRes.pipe(res);
        }).on('error', (err) => {
          console.error('[TTS Proxy] Request error:', err.message);
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('TTS proxy error');
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), googleTTSProxy()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
