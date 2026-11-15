import { supabase } from '@/lib/supabase';
import type { AiModelGeneration, ModelGenerationFormValues } from '@/types/ai';

const PRODUCT_IMAGE_BUCKET = 'product-images';

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
  const { data, error } = await supabase.functions.invoke('generate-model-image', {
    body: { productId, options },
  });

  if (error) {
    let msg = error.message;
    try {
      const errBody = await error.context?.json?.();
      if (errBody?.error) msg = errBody.error;
    } catch {}
    throw new Error(msg || 'Model image generation failed.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
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
