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

const GEMINI_MODEL = 'gemini-3.1-flash-image';
const GEMINI_INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const PRODUCT_IMAGE_BUCKET = 'product-images';
const GEMINI_TIMEOUT_MS = 120_000;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const ASPECT_RATIOS: Record<string, string> = {
  '1:1': 'a square 1:1 Instagram post composition',
  '4:5': 'a portrait 4:5 Instagram feed composition',
  '9:16': 'a vertical 9:16 Instagram story and reel composition',
  '16:9': 'a wide 16:9 website banner composition',
};

const STYLES: Record<string, string> = {
  luxuryFashion: 'high-end luxury fashion editorial styling, refined and contemporary',
  indianBridal: 'Indian bridal editorial styling with traditional bridal makeup and rich wedding-season glamour',
};

const BACKGROUNDS: Record<string, string> = {
  'black-studio': 'a deep black luxury studio backdrop with soft falloff',
  'emerald-studio': 'a rich deep emerald green studio backdrop with a subtle gradient',
  'royal-palace': 'an ornate royal palace interior with marble columns and warm gold accents',
  'ivory-studio': 'a warm ivory studio backdrop with gentle shadows',
};

const CAMERAS: Record<string, string> = {
  'eye-level': 'eye-level portrait shot on an 85mm lens',
  'low-angle': 'low-angle hero shot on a 50mm lens',
  'close-up': 'tight close-up on the jewellery and face on a 100mm macro-style lens',
  'overhead': 'overhead three-quarter angle on a 50mm lens',
  'full-body': 'full-body wide shot on a 35mm lens',
};

const POSES: Record<string, string> = {
  'standing-three-quarter': 'standing in a confident three-quarter pose',
  'seated-elegant': 'seated in a relaxed, elegant pose',
  'hand-to-face': 'with one hand gently touching the face',
  'looking-over-shoulder': 'looking back over the shoulder',
  'profile-chin-up': 'in a profile view with the chin lifted',
};

const MODEL_OPTIONS = {
  female: {
    hairstyles: {
      'sleek-bun': 'a sleek low bun',
      'loose-waves': 'voluminous loose waves',
      'braided-updo': 'a braided updo',
    } as Record<string, string>,
    outfits: {
      'evening-gown': 'a sculpted floor-length evening gown',
      'silk-saree': 'a draped silk saree with a fitted blouse',
      'lehenga': 'an embroidered lehenga choli',
      'black-dress': 'a sleek black satin cocktail dress',
    } as Record<string, string>,
  },
  male: {
    hairstyles: {
      'short-crop': 'a short textured crop',
      'slicked-back': 'neatly slicked-back hair',
      'side-part': 'a classic side part',
    } as Record<string, string>,
    outfits: {
      'tuxedo': 'a tailored black tuxedo',
      'sherwani': 'an embroidered ivory sherwani',
      'silk-kurta': 'a fitted silk kurta',
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
  } as GenerationOptions;
}

function placementFor(category: string): string {
  switch (category) {
    case 'Rings':
      return 'on the model\'s finger, clearly visible in the frame';
    case 'Necklaces':
    case 'Pendants':
      return 'around the neck, resting naturally on the collarbone';
    case 'Earrings':
      return 'on the ears, with the earrings clearly visible';
    case 'Bracelets':
    case 'Bangles':
    case 'Luxury Watches':
      return 'on the wrist';
    default:
      return 'where it would naturally be worn';
  }
}

function buildPrompt(
  product: { name: string; category: string; description: string; material: string; gemstone: string },
  options: GenerationOptions,
): string {
  const genderWord = options.gender === 'female' ? 'female' : 'male';
  const details = [
    `Product: ${product.name}, category ${product.category}`,
    product.material ? `material ${product.material}` : '',
    product.gemstone ? `gemstones ${product.gemstone}` : '',
  ].filter(Boolean).join(', ');

  return [
    `Create a photorealistic luxury advertisement photograph of a ${genderWord} fashion model wearing the jewellery shown in the reference image.`,
    `JEWELLERY PRESERVATION (highest priority): The reference image is a real product photograph. Reproduce this exact piece: keep its design, silhouette, metal colour and finish, and the number, colour, cut and arrangement of every gemstone identical to the reference. Do not redesign, simplify, add, remove or recolour any stone or metal detail. Show the jewellery ${placementFor(product.category)}, large enough to be clearly visible.`,
    `${details}.${product.description ? ` Details: ${product.description}.` : ''}`,
    `Model styling: ${STYLES[options.style]}. Hairstyle: ${genderOptions(options).hairstyles[options.hairstyle]}. Outfit: ${genderOptions(options).outfits[options.outfit]}. Pose: ${POSES[options.pose]}.`,
    `Camera: ${CAMERAS[options.camera]}. Background: ${BACKGROUNDS[options.background]}. Composition: ${ASPECT_RATIOS[options.aspectRatio]}. Soft, flattering luxury studio lighting with realistic reflections on the metal and gemstones.`,
    'Premium magazine editorial quality, sharp focus on the jewellery, natural skin texture. No text, no logos, no watermarks, and no jewellery beyond the reference piece.',
  ].join('\n');
}

function genderOptions(options: GenerationOptions) {
  return MODEL_OPTIONS[options.gender];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

interface ImageBlock {
  data: string;
  mime_type?: string;
}

function isImageBlock(value: unknown): value is ImageBlock {
  if (!value || typeof value !== 'object') return false;
  const block = value as Record<string, unknown>;
  return block.type === 'image' && typeof block.data === 'string' && block.data.length > 0;
}

function collectImageBlocks(node: unknown, found: ImageBlock[] = []): ImageBlock[] {
  if (Array.isArray(node)) {
    for (const item of node) collectImageBlocks(item, found);
  } else if (node && typeof node === 'object') {
    if (isImageBlock(node)) found.push(node);
    for (const value of Object.values(node)) collectImageBlocks(value, found);
  }
  return found;
}

function extractGeneratedImage(payload: unknown, inputImageData: string): ImageBlock | null {
  const body = payload as { steps?: unknown };
  const searchRoot = Array.isArray(body.steps)
    ? body.steps.filter((step) => (step as { type?: string })?.type === 'model_output')
    : payload;
  const images = collectImageBlocks(searchRoot).filter((image) => image.data !== inputImageData);
  return images.length > 0 ? images[images.length - 1] : null;
}

function geminiErrorMessage(status: number, text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } };
    if (parsed.error?.message) return `Gemini request failed (${status}): ${parsed.error.message}`;
  } catch {
    // Non-JSON error bodies fall through to the generic message below.
  }
  return `Gemini request failed (${status}).`;
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
    if (!supabaseUrl || !anonKey) return json({ error: 'The server is missing its database configuration.' }, 500);
    if (!geminiKey) return json({ error: 'The AI image service is not configured yet.' }, 503);

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Your session has expired. Please sign in again.' }, 401);
    const userId = userData.user.id;

    const body = (await req.json().catch(() => null)) as { productId?: unknown; options?: unknown } | null;
    const productId = typeof body?.productId === 'string' ? body.productId : '';
    if (!/^[0-9a-f-]{36}$/i.test(productId)) return json({ error: 'Choose a product to generate a model image.' }, 400);

    const options = parseOptions(body?.options);
    if (typeof options === 'string') return json({ error: options }, 400);

    const { data: product, error: productError } = await client
      .from('products')
      .select('id, name, category, description, material, gemstone, image_path')
      .eq('id', productId)
      .maybeSingle();
    if (productError) return json({ error: 'Could not load this product. Please try again.' }, 500);
    if (!product) return json({ error: 'This product could not be found.' }, 404);

    const { data: sourceBlob, error: downloadError } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .download(product.image_path);
    if (downloadError || !sourceBlob) return json({ error: 'The product photograph could not be read.' }, 500);

    const sourceMime = EXTENSIONS[sourceBlob.type] ? sourceBlob.type : 'image/jpeg';
    const sourceBase64 = bytesToBase64(new Uint8Array(await sourceBlob.arrayBuffer()));
    const prompt = buildPrompt(product, options);

    let geminiResponse: Response;
    try {
      geminiResponse = await fetch(GEMINI_INTERACTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiKey,
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          input: [
            { type: 'text', text: prompt },
            { type: 'image', mime_type: sourceMime, data: sourceBase64 },
          ],
          response_format: {
            type: 'image',
            aspect_ratio: options.aspectRatio,
            image_size: '2K',
          },
          store: false,
        }),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      });
    } catch (fetchError) {
      console.error('Gemini request did not complete', fetchError);
      return json({ error: 'The AI image service did not respond in time. Please try again.' }, 504);
    }

    const responseText = await geminiResponse.text();
    if (!geminiResponse.ok) {
      console.error('Gemini error', geminiResponse.status, responseText.slice(0, 500));
      return json({ error: geminiErrorMessage(geminiResponse.status, responseText) }, 502);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(responseText);
    } catch {
      return json({ error: 'The AI image service returned an unreadable response.' }, 502);
    }

    const generated = extractGeneratedImage(payload, sourceBase64);
    if (!generated) {
      console.error('No image in Gemini response', responseText.slice(0, 800));
      return json(
        { error: 'The model did not return an image for these options. Try a different pose, background or outfit.' },
        422,
      );
    }

    const generatedMime = generated.mime_type && EXTENSIONS[generated.mime_type] ? generated.mime_type : 'image/png';
    const bytes = Uint8Array.from(atob(generated.data), (char) => char.charCodeAt(0));
    const imagePath = `${userId}/generated/${crypto.randomUUID()}.${EXTENSIONS[generatedMime]}`;

    const { error: uploadError } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(imagePath, bytes, { contentType: generatedMime, cacheControl: '3600' });
    if (uploadError) {
      console.error('Storage upload failed', uploadError.message);
      return json({ error: 'The image was created but could not be saved. Please try again.' }, 500);
    }

    const { data: row, error: insertError } = await client
      .from('ai_models')
      .insert({ product_id: product.id, image_path: imagePath, prompt, settings: options })
      .select('id, created_at')
      .maybeSingle();
    if (insertError || !row) {
      console.error('Generation history insert failed', insertError?.message);
      await client.storage.from(PRODUCT_IMAGE_BUCKET).remove([imagePath]);
      return json({ error: 'The image was created but could not be recorded. Please try again.' }, 500);
    }

    const { data: publicUrl } = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath);

    return json({
      id: row.id,
      productId: product.id,
      imageUrl: publicUrl.publicUrl,
      prompt,
      settings: options,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('generate-model-image failed', err);
    return json({ error: 'Something went wrong while generating the image. Please try again.' }, 500);
  }
});
