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

const AD_STYLES: Record<string, string> = {
  luxuryEditorial:
    'Vogue / Harper’s Bazaar luxury editorial style, ultra-sophisticated composition, dramatic lighting, high contrast and flawless reflections',
  minimalist:
    'Modern quiet luxury minimalist styling, architectural shapes, soft neutral gradients, clean negative space highlighting fine jewellery craftsmanship',
  festiveIndian:
    'Opulent festive Indian royal bridal styling, rich marigold or emerald tones, antique gold motifs, warm festive candlelight and celebratory ambiance',
  weddingCampaign:
    'Dreamy romantic wedding jewellery campaign, soft champagne tulle and silk, warm romantic golden-hour illumination',
  premiumProduct:
    'Hyper-detailed macro studio product photography on black obsidian glass with mirror reflections and crisp diamond facets',
  instagramPromo:
    'Dynamic high-converting Instagram promotional creative, bold luxury aesthetics, eye-catching focal point and premium colour palette',
  festivalSale:
    'Glamorous festive jewellery celebration banner, subtle floating golden dust particles and rich velvet backdrops',
  luxuryBoutique:
    'High-end Fifth Avenue / Place Vendôme boutique showcase aesthetic, museum-grade glass pedestal and warm recessed spotlight',
};

const CAMPAIGN_THEMES: Record<string, string> = {
  royalHeritage: 'Royal Rajasthani & Mughal palace grandeur with carved stone, intricate jali patterns, and warm antique gold ambiance',
  modernMinimal: 'Modern geometric architectural studio, travertine stone slabs, soft natural diffused light and muted tones',
  goldenHour: 'Radiant golden hour sunset illumination casting warm honey-coloured light and elongated elegant shadows',
  midnightVelvet: 'Deep midnight velvet black backdrop with subtle emerald green undertones and jewel-toned rim lighting',
  botanicalBloom: 'Organic luxury with fresh white orchid petals, dewy eucalyptus leaves, and natural polished marble',
  festiveSparkle: 'Gleaming festive ambiance with floating bokeh lights, festive diwali/holiday warmth and sparkling accents',
};

const ASPECT_RATIOS: Record<string, string> = {
  '1:1': '1:1',
  '4:5': '3:4', // Imagen 3 maps 4:5 to 3:4
  '9:16': '9:16',
  '16:9': '16:9',
};

async function generateImageWithImagen(
  apiKey: string,
  prompt: string,
  aspectRatio: string
): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
  const targetRatio = ASPECT_RATIOS[aspectRatio] || '1:1';

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

  if (!res.ok) {
    const errorText = await res.text();
    console.error('Imagen 3 API failed:', res.status, errorText);
    throw new Error(`Google Imagen 3 image generation failed (${res.status}). Verify API key permissions.`);
  }

  const data = await res.json();
  const b64 = data.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) {
    throw new Error('No image was returned by the generation model. Please adjust the prompt and try again.');
  }

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return { bytes, mimeType: 'image/jpeg' };
}

async function generateCaptionWithGemini(
  apiKey: string,
  product: { name: string; category: string; material: string; gemstone: string; description: string },
  adStyle: string,
  theme: string,
  brandName?: string,
  tone?: string
): Promise<{ caption: string; hashtags: string }> {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const brandContext = brandName ? `Brand name: ${brandName}` : 'Jewellery brand: JEWELS AI';
  const toneContext = tone || 'Luxury, poetic, engaging, high-end';

  const prompt = `You are a world-class luxury jewellery copywriter.
Write an Instagram post caption and hashtags for the following jewellery piece:
${brandContext}
Product: ${product.name}
Category: ${product.category}
Material: ${product.material || 'Fine precious metal'}
Gemstones: ${product.gemstone || 'Natural precious gems'}
Details: ${product.description || 'Handcrafted luxury jewellery'}
Campaign Style: ${adStyle}
Theme: ${theme}
Tone: ${toneContext}

Output MUST be a JSON object with two fields:
{
  "caption": "An engaging, luxury caption with an irresistible opening hook, sensory product description, and clear call-to-action (e.g. 'Tap to enquire' or 'DM for bespoke private viewings'). Keep it between 2 to 4 elegant paragraphs.",
  "hashtags": "10-15 high-converting, relevant luxury jewellery hashtags separated by spaces (e.g. #FineJewellery #HighJewelry #BespokeJewels ...)"
}
Return ONLY valid JSON.`;

  try {
    const res = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(30_000),
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
    console.warn('Gemini caption generation skipped or failed:', err);
  }

  // Fallback caption
  return {
    caption: `Elegance sculpted in every detail. Introducing "${product.name}", handcrafted with immaculate precision in ${product.material || 'fine metal'} and ${product.gemstone || 'rare gemstones'}.\n\nDesigned for moments that demand perfection.\n\nEnquire now for pricing and bespoke orders.`,
    hashtags: `#${(brandName || 'JewelsAI').replace(/\s+/g, '')} #FineJewellery #LuxuryJewelry #${product.category.replace(/\s+/g, '')} #BespokeJewels #JewelryLover #HandcraftedJewellery`,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Please sign in to generate advertisements.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    if (!supabaseUrl || !anonKey) {
      return json({ error: 'Database environment configuration is missing on server.' }, 500);
    }
    if (!geminiKey) {
      return json(
        {
          error:
            'GEMINI_API_KEY is not configured in Supabase secrets. Please add your Google AI Studio API key in Supabase Dashboard → Settings → Edge Functions.',
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
      return json({ error: 'Session expired. Please sign in again.' }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => null)) as {
      productId?: string;
      adStyle?: string;
      theme?: string;
      aspectRatio?: string;
      customPrompt?: string;
      campaignId?: string;
    } | null;

    const productId = body?.productId || '';
    if (!/^[0-9a-f-]{36}$/i.test(productId)) {
      return json({ error: 'Please select a valid jewellery product.' }, 400);
    }

    const adStyleKey = body?.adStyle && AD_STYLES[body.adStyle] ? body.adStyle : 'luxuryEditorial';
    const themeKey = body?.theme && CAMPAIGN_THEMES[body.theme] ? body.theme : 'midnightVelvet';
    const aspectRatio = body?.aspectRatio || '1:1';
    const customPrompt = (body?.customPrompt || '').trim();
    const campaignId = body?.campaignId && /^[0-9a-f-]{36}$/i.test(body.campaignId) ? body.campaignId : null;

    // Fetch product details
    const { data: product, error: prodErr } = await client
      .from('products')
      .select('id, name, category, description, material, gemstone, image_path')
      .eq('id', productId)
      .maybeSingle();

    if (prodErr || !product) {
      return json({ error: 'The selected product could not be retrieved.' }, 404);
    }

    // Fetch user profile / brand kit if present
    const { data: profile } = await client
      .from('profiles')
      .select('brand_name, marketing_tone')
      .eq('id', userId)
      .maybeSingle();

    const styleDesc = AD_STYLES[adStyleKey];
    const themeDesc = CAMPAIGN_THEMES[themeKey];

    const prompt = [
      `A high-end luxury advertising photograph for fine jewellery.`,
      `Product: "${product.name}", fine ${product.category}. Crafted in ${product.material || 'precious metals'} adorned with ${product.gemstone || 'fine gems'}.`,
      `JEWELLERY PRESERVATION: Show the exact piece in clear macro sharpness. Preserve metal lustres, prong settings, gemstone brilliance, and delicate filigree.`,
      `Creative Style: ${styleDesc}.`,
      `Campaign Theme: ${themeDesc}.`,
      customPrompt ? `Art Direction: ${customPrompt}.` : '',
      `Lighting: Dramatic cinematic studio lighting, crisp highlights, warm soft shadows, reflection on polished surfaces.`,
      `Quality: 8K commercial advertisement photography, ultra-high resolution, hyper-realistic, luxury print campaign standard, no text, no watermark.`,
    ].filter(Boolean).join('\n');

    // 1. Generate Image
    const { bytes, mimeType } = await generateImageWithImagen(geminiKey, prompt, aspectRatio);

    // 2. Generate Caption & Hashtags concurrently
    const { caption, hashtags } = await generateCaptionWithGemini(
      geminiKey,
      product,
      adStyleKey,
      themeKey,
      profile?.brand_name,
      profile?.marketing_tone
    );

    // 3. Upload generated creative to storage
    const imagePath = `${userId}/ads/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await client.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .upload(imagePath, bytes, { contentType: mimeType, cacheControl: '3600' });

    if (uploadError) {
      console.error('Storage upload failed:', uploadError.message);
      return json({ error: 'Creative generated but could not be saved to storage.' }, 500);
    }

    // 4. Record into ai_ads table
    const { data: adRow, error: insertError } = await client
      .from('ai_ads')
      .insert({
        user_id: userId,
        product_id: product.id,
        campaign_id: campaignId,
        image_path: imagePath,
        ad_style: adStyleKey,
        theme: themeKey,
        aspect_ratio: aspectRatio,
        prompt,
        caption,
        hashtags,
        settings: {
          adStyle: adStyleKey,
          theme: themeKey,
          aspectRatio,
          customPrompt,
        },
      })
      .select('id, created_at')
      .maybeSingle();

    if (insertError) {
      console.error('Insert to ai_ads failed:', insertError.message);
    }

    const { data: publicUrl } = client.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath);

    return json({
      id: adRow?.id,
      productId: product.id,
      imageUrl: publicUrl.publicUrl,
      imagePath,
      adStyle: adStyleKey,
      theme: themeKey,
      aspectRatio,
      prompt,
      caption,
      hashtags,
      createdAt: adRow?.created_at || new Date().toISOString(),
    });
  } catch (err) {
    console.error('generate-ad-creative error:', err);
    const msg = err instanceof Error ? err.message : 'Something went wrong while generating the advertisement.';
    return json({ error: msg }, 500);
  }
});
