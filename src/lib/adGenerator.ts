import { supabase } from '@/lib/supabase';
import type { AdGenerationFormValues, AiAdCreative } from '@/types/ai';

const PRODUCT_IMAGE_BUCKET = 'product-images';

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
  const { data, error } = await supabase.functions.invoke('generate-ad-creative', {
    body: payload,
  });

  if (error) {
    let msg = error.message;
    try {
      const errBody = await error.context?.json?.();
      if (errBody?.error) msg = errBody.error;
    } catch {}
    throw new Error(msg || 'Advertisement creative generation failed.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
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
