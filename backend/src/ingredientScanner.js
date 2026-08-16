import { GoogleGenAI, Type } from '@google/genai';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export async function handleIngredientExtraction(req, res) {
  try {
    const { image, mimeType, fileName } = req.body ?? {};

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image data is required.' });
    }

    const normalizedMime = (mimeType || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
      return res.status(400).json({
        error: 'Unsupported image format. Only JPG, PNG, and WebP are supported.'
      });
    }

    // Strip data URI scheme prefix if present (e.g. data:image/png;base64,...)
    const cleanBase64 = image.includes(',') ? image.split(',')[1] : image;

    // Estimate size in bytes from base64 string length
    const estimatedSizeBytes = Math.round((cleanBase64.length * 3) / 4);
    if (estimatedSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      return res.status(400).json({
        error: 'Image file size exceeds the 10 MB maximum limit.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY environment variable is not configured on the server.'
      });
    }

    const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const candidateModels = Array.from(new Set([primaryModel, 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']));
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `Analyze the provided product label image and extract ONLY the text and ingredient information that is visibly present on the label.

RULES:
1. Extract ONLY text visibly printed on the label. Do NOT diagnose medical conditions, do NOT state whether a product is safe or unsafe, and do NOT invent missing ingredients.
2. productName: Name of the product visibly printed on the label, or null if absent/unreadable.
3. brand: Brand or manufacturer name visibly printed on the label, or null if absent/unreadable.
4. ingredientTextRaw: The full exact raw text of the ingredients section as printed on the label, or null if absent.
5. ingredients: An array of clean, individual ingredient strings parsed from the label. If none readable, return an empty array [].
6. allergenStatement: Any explicit allergen warning printed on the label (e.g. "Contains milk, soy. May contain nuts"), or null if absent.
7. confidence: Assess OCR readability clarity as "high", "medium", or "low".
8. warnings: An array of strings describing label text unreadability or truncation (e.g. "Label text cut off at bottom edge"). Do NOT add medical/health warnings here.`;

    let response = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: normalizedMime,
                    data: cleanBase64
                  }
                }
              ]
            }
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                productName: { type: Type.STRING, nullable: true },
                brand: { type: Type.STRING, nullable: true },
                ingredientTextRaw: { type: Type.STRING, nullable: true },
                ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                allergenStatement: { type: Type.STRING, nullable: true },
                confidence: {
                  type: Type.STRING,
                  enum: ['high', 'medium', 'low']
                },
                warnings: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: [
                'productName',
                'brand',
                'ingredientTextRaw',
                'ingredients',
                'allergenStatement',
                'confidence',
                'warnings'
              ]
            }
          }
        });
        if (response?.text) break;
      } catch (modelErr) {
        lastError = modelErr;
        const msg = modelErr?.message || '';
        if (msg.includes('not available') || msg.includes('not found') || msg.includes('404')) {
          continue;
        }
        throw modelErr;
      }
    }

    if (!response?.text) {
      throw lastError || new Error('No response returned from Gemini API.');
    }

    const responseText = response.text;
    let parsedData = {};

    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const cleanJson = responseText.replace(/```json\s*|\s*```/g, '').trim();
      parsedData = JSON.parse(cleanJson);
    }

    const validatedResult = {
      productName: typeof parsedData.productName === 'string' ? parsedData.productName : null,
      brand: typeof parsedData.brand === 'string' ? parsedData.brand : null,
      ingredientTextRaw: typeof parsedData.ingredientTextRaw === 'string' ? parsedData.ingredientTextRaw : null,
      ingredients: Array.isArray(parsedData.ingredients)
        ? parsedData.ingredients.map(item => String(item).trim()).filter(Boolean)
        : [],
      allergenStatement: typeof parsedData.allergenStatement === 'string' ? parsedData.allergenStatement : null,
      confidence: ['high', 'medium', 'low'].includes(parsedData.confidence)
        ? parsedData.confidence
        : 'medium',
      warnings: Array.isArray(parsedData.warnings)
        ? parsedData.warnings.map(item => String(item).trim()).filter(Boolean)
        : []
    };

    return res.json(validatedResult);
  } catch (err) {
    console.error('Error during ingredient extraction:', err);
    return res.status(500).json({
      error: err.message || 'Failed to extract label ingredients via Gemini API.'
    });
  }
}
