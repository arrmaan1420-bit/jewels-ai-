import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const PRODUCT_IMAGE_BUCKET = 'product-images';
const TIMEOUT_MS = 120_000;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ASPECT_RATIOS: Record<string, string> = {
  '1:1': '1:1',
  '4:5': '4:5',
  '9:16': '9:16',
  '16:9': '16:9',
};

const STYLES: Record<string, string> = {
  luxuryFashion: 'high-end luxury fashion editorial styling, refined, elegant and contemporary',
  indianBridal: 'Indian royal bridal styling with traditional bridal makeup and rich wedding-season jewellery glamour',
  minimalistChic: 'clean minimalist aesthetic, quiet luxury, crisp soft lighting',
  vintageHeritage: 'timeless vintage heirloom aesthetic, opulent royal palace atmosphere',
};

const BACKGROUNDS: Record<string, string> = {
  'black-studio': 'a deep onyx black luxury studio backdrop with soft atmospheric falloff',
  'emerald-studio': 'a rich deep emerald green studio backdrop with a subtle champagne gradient',
  'royal-palace': 'an ornate royal palace interior with marble columns and warm gold accents',
  'ivory-studio': 'a warm silk ivory studio backdrop with gentle shadows',
  'champagne-silk': 'luxurious draped champagne silk backdrop with soft golden highlights',
};

const CAMERAS: Record<string, string> = {
  'eye-level': 'eye-level portrait shot on an 85mm f/1.4 prime lens',
  'low-angle': 'low-angle hero shot on a 50mm lens showcasing the piece',
  'close-up': 'tight close-up macro portrait on a 100mm macro lens focusing on jewellery craftsmanship',
  'overhead': 'overhead three-quarter angle with dramatic studio lighting',
  'full-body': 'full-body editorial fashion pose on a 35mm lens',
};

const POSES: Record<string, string> = {
  'standing-three-quarter': 'standing in an poised three-quarter pose',
  'seated-elegant': 'seated in a regal, relaxed editorial pose',
  'hand-to-face': 'with one hand gracefully near the face highlighting the ring or bracelet',
  'looking-over-shoulder': 'looking back over the shoulder with captivating gaze',
  'profile-chin-up': 'in an elegant profile view with the chin gently lifted',
};

const MODEL_OPTIONS = {
  female: {
    hairstyles: {
      'sleek-bun': 'a sleek architectural low bun',
      'loose-waves': 'voluminous glossy loose waves',
      'braided-updo': 'a regal braided updo adorned elegantly',
      'side-swept': 'side-swept Hollywood waves',
    } as Record<string, string>,
    outfits: {
      'evening-gown': 'a sculpted black haute couture evening gown with clean neckline',
      'silk-saree': 'a richly draped Banarasi or Kanjeevaram silk saree with gold zari border',
      'lehenga': 'an intricately embroidered bridal lehenga choli in deep jewel tones',
      'black-dress': 'a sleek off-shoulder black velvet cocktail dress',
      'ivory-blazer': 'a tailored ivory silk satin pantsuit with plunge lapel',
    } as Record<string, string>,
  },
  male: {
    hairstyles: {
      'short-crop': 'a short textured editorial crop',
      'slicked-back': 'neatly slicked-back gentleman hairstyle',
      'side-part': 'a classic refined side part',
    } as Record<string, string>,
    outfits: {
      'tuxedo': 'a bespoke midnight black tailored tuxedo with silk lapels',
      'sherwani': 'an embroidered ivory royal sherwani with regal collar',
      'silk-kurta': 'a tailored emerald or raw silk kurta jacket',
      'formal-suit': 'a sharp charcoal double-breasted designer suit',
    } as Record<string, string>,
  },
} as const;

type Gender = keyof typeof MODEL_OPTIONS;

interface GenerationOptions {
  gender: Gender;
  style: keyof typeof STYLES;
  hairstyle: string;
  outfit: string;
  pose: keyof typeof POSES;
  camera: keyof typeof CAMERAS;
  background: keyof typeof BACKGROUNDS;
  aspectRatio: keyof typeof ASPECT_RATIOS;
  customPrompt?: string;
}

function parseOptions(raw: unknown): GenerationOptions | string {
  if (!raw || typeof raw !== 'object') return 'Choose your model options before generating.';
  const o = raw as Record<string, unknown>;
  const gender = o.gender;
  if (gender !== 'female' && gender !== 'male') return 'Choose a model gender.';
  const pick = <T extends Record<string, unknown>>(table: T, key: unknown): key is keyof T & string =>
    typeof key === 'string' && Object.prototype.hasOwnProperty.call(table, key);

  const genderOptions = MODEL_OPTIONS[gender];
  if (!pick(STYLES, o.style)) return 'Choose a valid style.';
  if (!pick(genderOptions.hairstyles, o.hairstyle)) return 'Choose a hairstyle for this model.';
  if (!pick(genderOptions.outfits, o.outfit)) return 'Choose an outfit for this model.';
  if (!pick(POSES, o.pose)) return 'Choose a valid pose.';
  if (!pick(CAMERAS, o.camera)) return 'Choose a valid camera angle.';
  if (!pick(BACKGROUNDS, o.background)) return 'Choose a valid background.';
  if (!pick(ASPECT_RATIOS, o.aspectRatio)) return 'Choose a valid aspect ratio.';

  return {
    gender,
    style: o.style,
    hairstyle: o.hairstyle,
    outfit: o.outfit,
    pose: o.pose,
    camera: o.camera,
    background: o.background,
    aspectRatio: o.aspectRatio,
    customPrompt: typeof o.customPrompt === 'string' ? o.customPrompt.trim() : undefined,
  };
}

function placementFor(category: string): string {
  switch (category) {
    case 'Rings':
      return 'on the model’s hand/finger, clearly visible in sharp focus in foreground';
    case 'Necklaces':
    case 'Pendants':
      return 'adorning the neck and resting naturally on the collarbone, center of attention';
    case 'Earrings':
      return 'on the earlobe, beautifully framed by hair pulled away for clear visibility';
    case 'Bracelets':
    case 'Bangles':
    case 'Luxury Watches':
      return 'around the wrist, prominently featured in the pose';
    default:
      return 'naturally worn and in focal spotlight';
  }
}

function buildPrompt(
  product: { name: string; category: string; description: string; material: string; gemstone: string },
  options: GenerationOptions
): string {
  const genderWord = options.gender === 'female' ? 'female' : 'male';
  const genderData = MODEL_OPTIONS[options.gender];
  const hairDesc = genderData.hairstyles[options.hairstyle] || 'styled hair';
  const outfitDesc = genderData.outfits[options.outfit] || 'luxury designer attire';

  const details = [
    `Product name: ${product.name}`,
    `Category: ${product.category}`,
    product.material ? `Metal/Material: ${product.material}` : '',
    product.gemstone ? `Gemstones/Diamonds: ${product.gemstone}` : '',
  ].filter(Boolean).join(', ');

  return [
    `A high-end luxury advertisement photograph of an elegant ${genderWord} model wearing authentic fine jewellery.`,
    `JEWELLERY HIGHLIGHT: ${details}. The piece is worn ${placementFor(product.category)}. Maintain the exact gemstone cuts, metal shine, sparkle, facets, and craftsmanship of the fine jewellery.`,
    product.description ? `Jewellery specifications: ${product.description}.` : '',
    `Model styling: ${STYLES[options.style]}. Hair: ${hairDesc}. Attire: ${outfitDesc}.`,
    `Pose & Camera: ${POSES[options.pose]}, captured with ${CAMERAS[options.camera]}.`,
    `Atmosphere & Studio: ${BACKGROUNDS[options.background]}, illuminated with warm studio strobe lighting, subtle reflections on the gemstones and gold.`,
    options.customPrompt ? `Additional creative direction: ${options.customPrompt}.` : '',
    'Vogue / Harper’s Bazaar editorial photography, ultra-detailed 8K resolution, realistic skin pore texture, sparkling diamond luster, no watermark, no text.',
  ].filter(Boolean).join('\n');
}

// Generate image via Google AI Studio Imagen 3 or Gemini endpoint
async function generateImageWithGoogleAI(
  apiKey: string,
  prompt: string,
  aspectRatio: string
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  // 1. Try Google Imagen 3 API (predict endpoint)
  const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

  const aspectMap: Record<string, string> = {
    '1:1': '1:1',
    '4:5': '3:4', // Imagen 3 supports 1:1, 3:4, 4:3, 9:16, 16:9
    '9:16': '9:16',
    '16:9': '16:9',
  };
  const targetRatio = aspectMap[aspectRatio] || '1:1';

  try {
    const res = await fetch(imagenUrl, {
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
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) {
      const data = await res.json();
      const b64 = data.predictions?.[0]?.bytesBase64Encoded;
      if (b64) {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return { bytes, mimeType: 'image/jpeg' };
      }
    } else {
      const errText = await res.text();
      console.warn('Imagen 3 returned non-200:', res.status, errText.slice(0, 300));
    }
  } catch (err) {
    console.warn('Imagen 3 call failed, attempting fallback:', err);
  }

  // 2. Fallback to Gemini Interactions API or Image Generation if available
  const interactionsUrl = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  try {
    const res = await fetch(interactionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash-exp',
        input: [{ type: 'text', text: prompt }],
        response_format: { type: 'image', aspect_ratio: aspectRatio },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (res.ok) {
      const data = await res.json();
      // Search for image in steps or output
      const images: string[] = [];
      const scan = (node: unknown) => {
        if (!node || typeof node !== 'object') return;
        const o = node as Record<string, unknown>;
        if (o.type === 'image' && typeof o.data === 'string') images.push(o.data);
        for (const v of Object.values(o)) scan(v);
      };
      scan(data);
      if (images.length > 0) {
        const b64 = images[images.length - 1];
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        return { bytes, mimeType: 'image/png' };
      }
    }
  } catch (err) {
    console.warn('Interactions fallback failed:', err);
  }

  throw new Error(
    'Image generation failed. Please verify that your Google AI Studio API key has access to Imagen 3 (imagen-3.0-generate-002).'
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Please sign in to generate images.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    if (!supabaseUrl || !anonKey) {
      return json({ error: 'The server is missing its Supabase database configuration.' }, 500);
    }
    if (!geminiKey) {
      return json(
        {
          error:
            'The AI image generation key is not configured in Supabase secrets. Please set GEMINI_API_KEY in your Supabase project settings.',
        },
        503
      );
    }

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'Your session has expired. Please sign in again.' }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => null)) as { productId?: unknown; options?: unknown } | null;
    const productId = typeof body?.productId === 'string' ? body.productId : '';
    if (!/^[0-9a-f-]{36}$/i.test(productId)) {
      return json({ error: 'Please choose a valid product from your catalogue.' }, 400);
    }

    const options = parseOptions(body?.options);
    if (typeof options === 'string') return json({ error: options }, 400);

    const { data: product, error: productError } = await client
      .from('products')
      .select('id, name, category, description, material, gemstone, image_path')
      .eq('id', productId)
      .maybeSingle();

    if (productError || !product) {
      return json({ error: 'The selected product could not be found.' }, 404);
    }

    const prompt = buildPrompt(product, options);

    const { bytes, mimeType } = await generateImageWithGoogleAI(
      geminiKey,
      prompt,
      options.aspectRatio
    );

    const extension = EXTENSIONS[mimeType] || 'jpg';
    const imagePath = `${userId}/generated/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(imagePath, bytes, { contentType: mimeType, cacheControl: '3600' });

    if (uploadError) {
      console.error('Storage upload failed:', uploadError.message);
      return json({ error: 'The image was generated but could not be saved to storage.' }, 500);
    }

    const { data: row, error: insertError } = await client
      .from('ai_models')
      .insert({
        user_id: userId,
        product_id: product.id,
        image_path: imagePath,
        prompt,
        settings: options,
      })
      .select('id, created_at')
      .maybeSingle();

    if (insertError || !row) {
      console.error('Generation history insert failed:', insertError?.message);
    }

    const { data: publicUrl } = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath);

    return json({
      id: row?.id,
      productId: product.id,
      imageUrl: publicUrl.publicUrl,
      imagePath,
      prompt,
      settings: options,
      createdAt: row?.created_at || new Date().toISOString(),
    });
  } catch (err) {
    console.error('generate-model-image error:', err);
    const msg = err instanceof Error ? err.message : 'Something went wrong while generating the image.';
    return json({ error: msg }, 500);
  }
});
