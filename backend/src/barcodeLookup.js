export async function handleBarcodeLookup(req, res) {
  const { barcode } = req.params;

  if (!barcode || !/^\d{8,14}$/.test(barcode)) {
    return res.status(400).json({ error: "Invalid barcode format. Expected 8 to 14 digits." });
  }

  const userAgent = 'ResQPlus_IngredientScanner/1.0 (resqplus@example.com)';
  const fields = 'code,product_name,brands,ingredients_text,allergens,image_url';

  try {
    // Attempt Open Food Facts first
    let url = `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=${fields}`;
    let source = 'Open Food Facts';
    let productType = 'food';
    let response = await fetch(url, { headers: { 'User-Agent': userAgent } });
    
    if (response.status === 404) {
      // Fallback to Open Beauty Facts
      url = `https://world.openbeautyfacts.org/api/v2/product/${barcode}?fields=${fields}`;
      source = 'Open Beauty Facts';
      productType = 'beauty';
      response = await fetch(url, { headers: { 'User-Agent': userAgent } });
    }

    if (!response.ok) {
      if (response.status === 404) {
        return res.json({ found: false, barcode });
      }
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return res.json({ found: false, barcode });
    }

    const product = data.product;

    const parseIngredients = (text) => {
       if (!text) return [];
       return text.split(',').map(s => s.trim()).filter(Boolean);
    };

    const parseAllergens = (text) => {
       if (!text) return [];
       return text.split(',').map(s => s.replace(/^[a-z]{2}:/, '').trim().replace(/-/g, ' ')).filter(Boolean);
    };

    const normalizedResult = {
      found: true,
      barcode: barcode,
      productName: product.product_name || null,
      brand: product.brands || null,
      productType: productType,
      ingredientTextRaw: product.ingredients_text || null,
      ingredients: parseIngredients(product.ingredients_text),
      allergens: parseAllergens(product.allergens),
      imageUrl: product.image_url || null,
      source: source,
      sourceUrl: source === 'Open Food Facts' 
        ? `https://world.openfoodfacts.org/product/${barcode}`
        : `https://world.openbeautyfacts.org/product/${barcode}`
    };

    return res.json(normalizedResult);
  } catch (err) {
    console.error("Barcode lookup error:", err);
    return res.status(500).json({ error: "Failed to look up barcode." });
  }
}
