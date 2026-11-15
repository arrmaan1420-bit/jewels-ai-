import { generateImagenImage, generateLuxuryCaption, getGoogleAiKey } from '@/lib/googleAi';
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Please sign in to generate advertisements.');
  }

  // 1. Fetch product
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, name, category, description, material, gemstone, image_path')
    .eq('id', payload.productId)
    .maybeSingle();

  if (prodErr || !product) {
    throw new Error('Could not find the selected jewellery product.');
  }

  // 2. Fetch user brand profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('brand_name, marketing_tone')
    .eq('id', user.id)
    .maybeSingle();

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

  // 3. Generate Image & Caption concurrently
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

  // 4. Upload generated image to Supabase Storage
  const imagePath = `${user.id}/ads/${crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(imagePath, imgResult.blob, { contentType: imgResult.mimeType, cacheControl: '3600' });

  if (uploadError) {
    console.error('Storage upload failed:', uploadError.message);
    throw new Error('The advertisement image was created but could not be saved to storage.');
  }

  // 5. Insert record into ai_ads
  const { data: adRow, error: insertError } = await supabase
    .from('ai_ads')
    .insert({
      user_id: user.id,
      product_id: product.id,
      campaign_id: payload.campaignId || null,
      image_path: imagePath,
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

  if (insertError) {
    console.warn('ai_ads insert warning:', insertError.message);
  }

  const { data: publicUrl } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath);

  return {
    id: adRow?.id,
    imageUrl: publicUrl.publicUrl,
    imagePath,
    adStyle: payload.adStyle,
    theme: payload.theme,
    aspectRatio: payload.aspectRatio,
    prompt,
    caption: captionResult.caption,
    hashtags: captionResult.hashtags,
    createdAt: adRow?.created_at || new Date().toISOString(),
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
  // Try Edge Function first
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

  // Fallback to client-side Google AI Studio engine
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
