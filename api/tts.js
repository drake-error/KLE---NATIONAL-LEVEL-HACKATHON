/**
 * Vercel Serverless Function: /api/tts
 * Proxies requests to Google Translate TTS with proper headers.
 * This is the production equivalent of the Vite dev plugin.
 */
export default async function handler(req, res) {
  const { tl = 'en', q = '', client = 'tw-ob', ie = 'UTF-8' } = req.query;

  if (!q) {
    res.status(400).send('Missing q parameter');
    return;
  }

  const url = `https://translate.google.com/translate_tts?ie=${ie}&tl=${tl}&client=${client}&q=${encodeURIComponent(q)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!response.ok) {
      res.status(502).send('TTS upstream error');
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) {
    res.status(500).send('TTS proxy error: ' + err.message);
  }
}
