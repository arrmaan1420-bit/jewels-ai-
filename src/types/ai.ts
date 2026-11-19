export interface AiModelGeneration {
  id: string;
  user_id: string;
  product_id: string | null;
  campaign_id: string | null;
  image_path: string;
  prompt: string;
  settings: Record<string, unknown>;
  created_at: string;
  // joined product if available
  product_name?: string;
  category?: string;
}

export interface AiAdCreative {
  id: string;
  user_id: string;
  product_id: string | null;
  campaign_id: string | null;
  image_path: string;
  ad_style: string;
  theme: string;
  aspect_ratio: string;
  prompt: string;
  caption: string;
  hashtags: string;
  headline?: string;
  cta?: string;
  settings: Record<string, unknown>;
  created_at: string;
  // joined product if available
  product_name?: string;
}

export interface ModelGenerationFormValues {
  gender: 'female' | 'male';
  style: string;
  hairstyle: string;
  outfit: string;
  pose: string;
  camera: string;
  background: string;
  aspectRatio: string;
  modelEthnicity?: string;
  creativeMode?: string;
  customPrompt?: string;
}

export interface AdGenerationFormValues {
  productId: string;
  adStyle: string;
  theme: string;
  aspectRatio: string;
  customPrompt: string;
  campaignId?: string;
  modelEthnicity?: string;
  creativeMode?: string;
  forensicDescription?: string;
  customImageBlob?: Blob;
  modelBaseId?: string;
}
