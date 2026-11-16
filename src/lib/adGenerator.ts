import { generateImagenImage, generateLuxuryCaption, getGoogleAiKey, hasGoogleAiKey } from '@/lib/googleAi';
import { supabase } from '@/lib/supabase';
import type { AdGenerationFormValues, AiAdCreative } from '@/types/ai';

const PRODUCT_IMAGE_BUCKET = 'product-images';

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

export function getAdImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl;
}

export async function fetchAiAds(): Promise<AiAdCreative[]> {
  const { data, error } = await supabase
    .from('ai_ads')
    .select(`
      id, user_id, product_id, campaign_id, image_path, ad_style, theme, aspect_ratio,
      prompt, caption, hashtags, settings, created_at,
      products ( name )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    product_id: row.product_id,
    campaign_id: row.campaign_id,
    image_path: row.image_path,
    ad_style: row.ad_style,
    theme: row.theme,
    aspect_ratio: row.aspect_ratio,
    prompt: row.prompt,
    caption: row.caption || '',
    hashtags: row.hashtags || '',
    settings: row.settings || {},
    created_at: row.created_at,
    product_name: row.products?.name,
  }));
}

// Client-side Google AI Studio fallback engine
async function generateAdWithClientEngine(
  payload: AdGenerationFormValues
): Promise<{
  id?: string;
  imageUrl: string;
  imagePath: string;
  adStyle: string;
  theme: string;
  aspectRatio: string;
  prompt: string;
  caption: string;
  hashtags: string;
  createdAt: string;
}> {
  const apiKey = getGoogleAiKey();
  if (!apiKey) {
    const err = new Error('GOOGLE_AI_KEY_REQUIRED');
    (err as any).code = 'GOOGLE_AI_KEY_REQUIRED';
    throw err;
  }

  // 1. Check user session gracefully
  let user: any = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (authErr) {
    console.warn('Supabase auth check notice:', authErr);
  }

  // 2. Fetch product details
  let product: any = null;
  if (payload.productId) {
    try {
      const { data: prodData } = await supabase
        .from('products')
        .select('id, name, category, description, material, gemstone, image_path')
        .eq('id', payload.productId)
        .maybeSingle();
      product = prodData;
    } catch {}
  }

  if (!product) {
    product = {
      id: payload.productId || 'demo-product',
      name: 'The Emerald Cut Solitaire Pendant',
      category: 'Fine Jewellery',
      material: '18K Yellow Gold',
      gemstone: 'Brilliant Diamond',
      description: 'Handcrafted luxury jewellery piece',
    };
  }

  // 3. Fetch user brand profile
  let profile: any = null;
  if (user?.id) {
    try {
      const { data: profData } = await supabase
        .from('profiles')
        .select('brand_name, marketing_tone')
        .eq('id', user.id)
        .maybeSingle();
      profile = profData;
    } catch {}
  }

  const styleDesc = AD_STYLES[payload.adStyle] || AD_STYLES.luxuryEditorial;
  const themeDesc = CAMPAIGN_THEMES[payload.theme] || CAMPAIGN_THEMES.midnightVelvet;

  const prompt = [
    `A high-end luxury advertising photograph for fine jewellery.`,
    `Product: "${product.name}", fine ${product.category}. Crafted in ${product.material || 'precious metals'} adorned with ${product.gemstone || 'fine gems'}.`,
    `JEWELLERY HIGHLIGHT: Centerpiece hero shot of the exact piece. Preserve metal lustres, prong settings, gemstone brilliance, facets and delicate filigree.`,
    `Creative Style: ${styleDesc}.`,
    `Campaign Theme: ${themeDesc}.`,
    payload.customPrompt ? `Art Direction: ${payload.customPrompt}.` : '',
    `Lighting: Dramatic cinematic studio lighting, crisp highlights, warm soft shadows, reflection on polished surfaces.`,
    `Quality: 8K commercial advertisement photography, ultra-high resolution, hyper-realistic, luxury print campaign standard, no text, no watermark.`,
  ].filter(Boolean).join('\n');

  // 4. Generate Image & Caption concurrently via Google AI Studio
  const [imgResult, captionResult] = await Promise.all([
    generateImagenImage(apiKey, prompt, payload.aspectRatio),
    generateLuxuryCaption(
      apiKey,
      product,
      payload.adStyle,
      payload.theme,
      profile?.brand_name,
      profile?.marketing_tone
    ),
  ]);

  // 5. Save to Supabase Storage & Database if logged in, otherwise use local in-memory URL
  let finalImageUrl = '';
  let imagePath = 'local-preview';
  let adRowId: string | undefined;

  if (user?.id) {
    try {
      const storagePath = `${user.id}/ads/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(storagePath, imgResult.blob, { contentType: imgResult.mimeType, cacheControl: '3600' });

      if (!uploadError) {
        imagePath = storagePath;
        const { data: publicUrl } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath);
        finalImageUrl = publicUrl.publicUrl;

        // Insert record into ai_ads table
        const { data: adRow } = await supabase
          .from('ai_ads')
          .insert({
            user_id: user.id,
            product_id: product.id !== 'demo-product' ? product.id : null,
            campaign_id: payload.campaignId || null,
            image_path: storagePath,
            ad_style: payload.adStyle,
            theme: payload.theme,
            aspect_ratio: payload.aspectRatio,
            prompt,
            caption: captionResult.caption,
            hashtags: captionResult.hashtags,
            settings: {
              adStyle: payload.adStyle,
              theme: payload.theme,
              aspectRatio: payload.aspectRatio,
              customPrompt: payload.customPrompt,
            },
          })
          .select('id, created_at')
          .maybeSingle();

        adRowId = adRow?.id;
      }
    } catch (saveErr) {
      console.warn('Supabase persistence notice (using local blob for instant preview):', saveErr);
    }
  }

  // Fallback to in-memory URL so user is NEVER blocked
  if (!finalImageUrl) {
    finalImageUrl = URL.createObjectURL(imgResult.blob);
  }

  return {
    id: adRowId || crypto.randomUUID(),
    imageUrl: finalImageUrl,
    imagePath,
    adStyle: payload.adStyle,
    theme: payload.theme,
    aspectRatio: payload.aspectRatio,
    prompt,
    caption: captionResult.caption,
    hashtags: captionResult.hashtags,
    createdAt: new Date().toISOString(),
  };
}

export async function generateAdCreative(
  payload: AdGenerationFormValues
): Promise<{
  id?: string;
  imageUrl: string;
  imagePath: string;
  adStyle: string;
  theme: string;
  aspectRatio: string;
  prompt: string;
  caption: string;
  hashtags: string;
  createdAt: string;
}> {
  // If user has direct Google AI key saved in browser, run instant client engine!
  if (hasGoogleAiKey()) {
    return await generateAdWithClientEngine(payload);
  }

  // Try Edge Function if deployed
  try {
    const { data, error } = await supabase.functions.invoke('generate-ad-creative', {
      body: payload,
    });

    if (!error && !data?.error && data?.imageUrl) {
      return data;
    }
  } catch (edgeErr) {
    console.warn('Edge Function invoke error, falling back to direct Google AI engine:', edgeErr);
  }

  // Fallback to client-side Google AI Studio engine (prompts user for free key)
  return await generateAdWithClientEngine(payload);
}

export async function updateAdCaption(id: string, caption: string, hashtags: string): Promise<void> {
  const { error } = await supabase
    .from('ai_ads')
    .update({ caption, hashtags })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function deleteAiAd(id: string, imagePath: string): Promise<void> {
  const { error } = await supabase.from('ai_ads').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (imagePath && !imagePath.startsWith('http')) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([imagePath]);
  }
}

export async function linkAdToCampaign(adId: string, campaignId: string | null): Promise<void> {
  const { error } = await supabase
    .from('ai_ads')
    .update({ campaign_id: campaignId })
    .eq('id', adId);

  if (error) throw new Error(error.message);
}
