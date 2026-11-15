import { supabase } from '@/lib/supabase';
import type { Campaign } from '@/types/marketing';
import type { AiAdCreative, AiModelGeneration } from '@/types/ai';

export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, user_id, name, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function createCampaign(name: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .insert({ name: name.trim() })
    .select('id, user_id, name, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateCampaign(id: string, name: string): Promise<Campaign> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, user_id, name, created_at, updated_at')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchCampaignAssets(campaignId: string): Promise<{
  ads: AiAdCreative[];
  models: AiModelGeneration[];
}> {
  const [adsRes, modelsRes] = await Promise.all([
    supabase
      .from('ai_ads')
      .select('id, user_id, product_id, campaign_id, image_path, ad_style, theme, aspect_ratio, prompt, caption, hashtags, settings, created_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false }),
    supabase
      .from('ai_models')
      .select('id, user_id, product_id, campaign_id, image_path, prompt, settings, created_at')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false }),
  ]);

  if (adsRes.error) throw new Error(adsRes.error.message);
  if (modelsRes.error) throw new Error(modelsRes.error.message);

  return {
    ads: (adsRes.data || []) as AiAdCreative[],
    models: (modelsRes.data || []) as AiModelGeneration[],
  };
}
