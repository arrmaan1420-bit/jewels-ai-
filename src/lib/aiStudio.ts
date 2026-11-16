import { generateImagenImage, getGoogleAiKey } from '@/lib/googleAi';
import { supabase } from '@/lib/supabase';
import type { AiModelGeneration, ModelGenerationFormValues } from '@/types/ai';

const PRODUCT_IMAGE_BUCKET = 'product-images';

const STYLES: Record<string, string> = {
  luxuryFashion: 'high-end luxury fashion editorial styling, refined, elegant and contemporary',
  indianBridal: 'Indian royal bridal styling with traditional bridal makeup and rich wedding-season jewellery glamour',
  minimalistChic: 'clean minimalist aesthetic, quiet luxury, crisp soft lighting',
  vintageHeritage: 'timeless vintage heirloom aesthetic, opulent royal palace atmosphere',
};

const BACKGROUNDS: Record<string, string> = {
  'black-studio': 'a deep onyx black luxury studio backdrop with soft atmospheric falloff',
  'emerald-studio': 'a rich deep emerald green studio backdrop with a subtle champagne gradient',
  'champagne-silk': 'luxurious draped champagne silk backdrop with soft golden highlights',
  'royal-palace': 'an ornate royal palace interior with marble columns and warm gold accents',
  'ivory-studio': 'a warm silk ivory studio backdrop with gentle shadows',
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

export function getGeneratedImageUrl(imagePath: string): string {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  return supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl;
}

export async function fetchAiModelGenerations(): Promise<AiModelGeneration[]> {
  const { data, error } = await supabase
    .from('ai_models')
    .select(`
      id, user_id, product_id, campaign_id, image_path, prompt, settings, created_at,
      products ( name, category )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    product_id: row.product_id,
    campaign_id: row.campaign_id,
    image_path: row.image_path,
    prompt: row.prompt,
    settings: row.settings || {},
    created_at: row.created_at,
    product_name: row.products?.name,
    category: row.products?.category,
  }));
}

async function generateModelWithClientEngine(
  productId: string,
  options: ModelGenerationFormValues
): Promise<{
  id?: string;
  imageUrl: string;
  imagePath: string;
  prompt: string;
  createdAt: string;
}> {
  const apiKey = getGoogleAiKey();
  if (!apiKey) {
    const err = new Error('GOOGLE_AI_KEY_REQUIRED');
    (err as any).code = 'GOOGLE_AI_KEY_REQUIRED';
    throw err;
  }

  // Check user session safely
  let user: any = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {}

  let product: any = null;
  if (productId) {
    try {
      const { data: prodData } = await supabase
        .from('products')
        .select('id, name, category, description, material, gemstone, image_path')
        .eq('id', productId)
        .maybeSingle();
      product = prodData;
    } catch {}
  }

  if (!product) {
    product = {
      id: productId || 'demo-product',
      name: 'The Royal Solitaire Jewellery',
      category: 'Jewellery',
      material: '18K Yellow Gold',
      gemstone: 'Diamonds',
      description: 'Luxury handcrafted jewellery',
    };
  }

  const genderWord = options.gender === 'female' ? 'female' : 'male';
  const prompt = [
    `A high-end luxury advertisement photograph of an elegant ${genderWord} model wearing authentic fine jewellery.`,
    `Product: "${product.name}", category ${product.category}. Crafted in ${product.material || 'fine metal'} with ${product.gemstone || 'gemstones'}.`,
    `JEWELLERY HIGHLIGHT: Centerpiece hero shot of the exact piece worn naturally on the ${options.gender === 'female' ? 'woman' : 'man'}. Maintain gemstone brilliance, diamond facets, and metal craftsmanship.`,
    `Model styling: ${STYLES[options.style] || 'Luxury fashion'}. Hair: ${options.hairstyle}. Outfit: ${options.outfit}.`,
    `Pose & Camera: ${POSES[options.pose] || 'poised pose'}, captured with ${CAMERAS[options.camera] || '85mm lens'}.`,
    `Atmosphere & Studio: ${BACKGROUNDS[options.background] || 'Studio'}, illuminated with warm studio strobe lighting.`,
    options.customPrompt ? `Additional creative direction: ${options.customPrompt}.` : '',
    'Vogue / Harper’s Bazaar editorial photography, ultra-detailed 8K resolution, realistic skin texture, diamond sparkle, no watermark, no text.',
  ].filter(Boolean).join('\n');

  const imgResult = await generateImagenImage(apiKey, prompt, options.aspectRatio);

  let finalImageUrl = '';
  let imagePath = 'local-preview';
  let rowId: string | undefined;

  if (user?.id) {
    try {
      const storagePath = `${user.id}/generated/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(storagePath, imgResult.blob, { contentType: imgResult.mimeType, cacheControl: '3600' });

      if (!uploadError) {
        imagePath = storagePath;
        const { data: publicUrl } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath);
        finalImageUrl = publicUrl.publicUrl;

        const { data: row } = await supabase
          .from('ai_models')
          .insert({
            user_id: user.id,
            product_id: product.id !== 'demo-product' ? product.id : null,
            image_path: storagePath,
            prompt,
            settings: options,
          })
          .select('id, created_at')
          .maybeSingle();

        rowId = row?.id;
      }
    } catch (saveErr) {
      console.warn('Supabase model photo save notice:', saveErr);
    }
  }

  if (!finalImageUrl) {
    finalImageUrl = URL.createObjectURL(imgResult.blob);
  }

  return {
    id: rowId || crypto.randomUUID(),
    imageUrl: finalImageUrl,
    imagePath,
    prompt,
    createdAt: new Date().toISOString(),
  };
}

export async function generateModelImage(
  productId: string,
  options: ModelGenerationFormValues
): Promise<{
  id?: string;
  imageUrl: string;
  imagePath: string;
  prompt: string;
  createdAt: string;
}> {
  // If user has direct Google AI key saved in browser, run instant client engine!
  if (hasGoogleAiKey()) {
    return await generateModelWithClientEngine(productId, options);
  }

  // Try Edge Function if deployed
  try {
    const { data, error } = await supabase.functions.invoke('generate-model-image', {
      body: { productId, options },
    });

    if (!error && !data?.error && data?.imageUrl) {
      return data;
    }
  } catch (edgeErr) {
    console.warn('Edge Function invoke error, falling back to direct Google AI engine:', edgeErr);
  }

  // Fallback to direct client Google AI engine
  return await generateModelWithClientEngine(productId, options);
}

export async function deleteAiModelGeneration(id: string, imagePath: string): Promise<void> {
  const { error } = await supabase.from('ai_models').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (imagePath && !imagePath.startsWith('http')) {
    await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([imagePath]);
  }
}

export async function linkGenerationToCampaign(generationId: string, campaignId: string | null): Promise<void> {
  const { error } = await supabase
    .from('ai_models')
    .update({ campaign_id: campaignId })
    .eq('id', generationId);

  if (error) throw new Error(error.message);
}
