import { supabase } from '@/lib/supabase';
import type { BrandKitData } from '@/types/marketing';

const PRODUCT_IMAGE_BUCKET = 'product-images';

export async function fetchBrandKit(userId: string): Promise<BrandKitData> {
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, brand_name, logo_url, brand_colors, typography, default_style, brand_description, marketing_tone')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    fullName: data?.full_name || '',
    brandName: data?.brand_name || '',
    logoUrl: data?.logo_url || '',
    brandColors: data?.brand_colors || {
      primary: '#10B981',
      secondary: '#D6B56D',
      background: '#0B0F0E',
    },
    typography: data?.typography || 'Cormorant Garamond',
    defaultStyle: data?.default_style || 'luxuryEditorial',
    brandDescription: data?.brand_description || '',
    marketingTone: data?.marketing_tone || 'Luxury & Sophisticated',
  };
}

export async function updateBrandKit(userId: string, values: BrandKitData): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: values.fullName.trim(),
    brand_name: values.brandName.trim(),
    logo_url: values.logoUrl,
    brand_colors: values.brandColors,
    typography: values.typography,
    default_style: values.defaultStyle,
    brand_description: values.brandDescription.trim(),
    marketing_tone: values.marketingTone,
  });

  if (error) throw new Error(error.message);
}

export async function uploadBrandLogo(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${userId}/brand/logo-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: true });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
