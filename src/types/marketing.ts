export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  product_count?: number;
  creative_count?: number;
}

export interface InstagramAccount {
  id: string;
  user_id: string;
  instagram_user_id: string;
  username: string;
  account_type: string;
  profile_picture_url: string;
  token_expires_at: string | null;
  connected_at: string;
}

export interface ScheduledPost {
  id: string;
  user_id: string;
  campaign_id: string | null;
  product_id: string | null;
  creative_type: 'ad' | 'model';
  image_url: string;
  caption: string;
  scheduled_for: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  published_at: string | null;
  instagram_media_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BrandKitData {
  fullName: string;
  brandName: string;
  logoUrl: string;
  brandColors: {
    primary: string;
    secondary: string;
    background: string;
  };
  typography: string;
  defaultStyle: string;
  brandDescription: string;
  marketingTone: string;
}
