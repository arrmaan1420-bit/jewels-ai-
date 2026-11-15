const STORAGE_KEY = 'jewels_ai_gemini_key';

export function getGoogleAiKey(): string {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem(STORAGE_KEY) || '';
  if (stored) return stored.trim();
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  return envKey.trim();
}

export function setGoogleAiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, key.trim());
}

export function clearGoogleAiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function hasGoogleAiKey(): boolean {
  return Boolean(getGoogleAiKey());
}

const ASPECT_MAP: Record<string, string> = {
  '1:1': '1:1',
  '4:5': '3:4', // Imagen 3 maps 4:5 to 3:4
  '9:16': '9:16',
  '16:9': '16:9',
};

export async function generateImagenImage(
  apiKey: string,
  prompt: string,
  aspectRatio: string
): Promise<{ blob: Blob; mimeType: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Google AI Studio API key is required. Please enter your API key.');
  }

  const targetRatio = ASPECT_MAP[aspectRatio] || '1:1';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${cleanKey}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: targetRatio,
          outputMimeType: 'image/jpeg',
          personGeneration: 'ALLOW_ADULT',
        },
      }),
    });
  } catch (netErr) {
    throw new Error('Could not reach Google AI Studio. Please check your internet connection.');
  }

  if (!response.ok) {
    const errorBody = await response.text();
    let msg = `Google AI Studio error (${response.status})`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) {
        msg = parsed.error.message;
      }
    } catch {}
    throw new Error(msg);
  }

  const data = await response.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    throw new Error('Google AI did not return an image. Please try adjusting your prompt or style.');
  }

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: 'image/jpeg' });
  return { blob, mimeType: 'image/jpeg' };
}

export async function generateLuxuryCaption(
  apiKey: string,
  product: { name: string; category: string; material?: string; gemstone?: string; description?: string },
  adStyle: string,
  theme: string,
  brandName?: string,
  tone?: string
): Promise<{ caption: string; hashtags: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return {
      caption: `Elegance sculpted in every detail. Introducing "${product.name}", handcrafted with immaculate precision in ${product.material || 'fine metal'} and ${product.gemstone || 'rare gemstones'}.\n\nDesigned for moments that demand perfection.\n\nEnquire now for pricing and bespoke orders.`,
      hashtags: `#${(brandName || 'JewelsAI').replace(/\s+/g, '')} #FineJewellery #LuxuryJewelry #${product.category.replace(/\s+/g, '')} #BespokeJewels #HandcraftedJewellery`,
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cleanKey}`;

  const promptText = `You are a world-class luxury jewellery copywriter for high-end Maisons like Cartier, Bulgari and Harry Winston.
Write an Instagram post caption and hashtags for this fine jewellery piece:
Brand: ${brandName || 'JEWELS AI'}
Product: ${product.name} (${product.category})
Material: ${product.material || 'Precious Metal'}
Gemstones: ${product.gemstone || 'Fine Diamonds and Gems'}
Description: ${product.description || 'Artisanal jewellery craftsmanship'}
Style: ${adStyle}
Theme: ${theme}
Tone: ${tone || 'Luxury & Sophisticated'}

Respond ONLY with a JSON object:
{
  "caption": "A 2 to 4 paragraph luxury caption with an irresistible opening hook, sensory craftsmanship details, and an elegant call to action (e.g. 'Tap to enquire or DM for private viewings').",
  "hashtags": "10-15 high-performing luxury jewellery hashtags separated by single spaces (e.g. #FineJewellery #HighJewelry #BespokeJewels...)"
}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return {
          caption: parsed.caption || '',
          hashtags: parsed.hashtags || '',
        };
      }
    }
  } catch (err) {
    console.warn('Gemini caption generation skipped:', err);
  }

  return {
    caption: `Elegance sculpted in every detail. Introducing "${product.name}", handcrafted with immaculate precision in ${product.material || 'fine metal'} and ${product.gemstone || 'rare gemstones'}.\n\nDesigned for moments that demand perfection.\n\nEnquire now for pricing and bespoke orders.`,
    hashtags: `#${(brandName || 'JewelsAI').replace(/\s+/g, '')} #FineJewellery #LuxuryJewelry #${product.category.replace(/\s+/g, '')} #BespokeJewels #HandcraftedJewellery`,
  };
}
