/*
=============================================================================
  JEWELS AI — COMPLETE MASTER DATABASE SCHEMA & SETUP SCRIPT
=============================================================================
  This script creates all required tables, triggers, storage buckets, 
  and Row Level Security (RLS) policies from scratch.
  
  Safe to run on a brand new or existing Supabase project (100% idempotent).
=============================================================================
*/

-- ---------------------------------------------------------------------------
-- 1. PROFILES & BRAND KIT
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  brand_name text NOT NULL DEFAULT '',
  logo_url text DEFAULT '',
  brand_colors jsonb DEFAULT '{"primary": "#10B981", "secondary": "#D6B56D", "background": "#0B0F0E"}'::jsonb,
  typography text DEFAULT 'Cormorant Garamond',
  default_style text DEFAULT 'luxuryEditorial',
  brand_description text DEFAULT '',
  marketing_tone text DEFAULT 'Luxury & Sophisticated',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- ---------------------------------------------------------------------------
-- 2. AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 3. PRODUCTS (JEWELLERY CATALOGUE)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(12, 2),
  material text NOT NULL DEFAULT '',
  gemstone text NOT NULL DEFAULT '',
  image_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_user_id_created_at_idx ON public.products (user_id, created_at DESC);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.products FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Users can view own products" ON public.products FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
CREATE POLICY "Users can insert own products" ON public.products FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE
TO authenticated USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 4. MARKETING CAMPAIGNS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_user_id_created_at_idx ON public.campaigns (user_id, created_at DESC);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.campaigns FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;

DROP POLICY IF EXISTS "Users can view own campaigns" ON public.campaigns;
CREATE POLICY "Users can view own campaigns" ON public.campaigns FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaigns" ON public.campaigns;
CREATE POLICY "Users can insert own campaigns" ON public.campaigns FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaigns" ON public.campaigns;
CREATE POLICY "Users can update own campaigns" ON public.campaigns FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaigns" ON public.campaigns;
CREATE POLICY "Users can delete own campaigns" ON public.campaigns FOR DELETE
TO authenticated USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 5. AI MODEL STUDIO GENERATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  image_path text NOT NULL,
  prompt text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_models_user_id_created_at_idx ON public.ai_models (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_models_product_id_idx ON public.ai_models (product_id);
CREATE INDEX IF NOT EXISTS ai_models_campaign_id_idx ON public.ai_models (campaign_id);

ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_models FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_models TO authenticated;

DROP POLICY IF EXISTS "Users can view own AI model images" ON public.ai_models;
CREATE POLICY "Users can view own AI model images" ON public.ai_models FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI model images" ON public.ai_models;
CREATE POLICY "Users can insert own AI model images" ON public.ai_models FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI model images" ON public.ai_models;
CREATE POLICY "Users can update own AI model images" ON public.ai_models FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own AI model images" ON public.ai_models;
CREATE POLICY "Users can delete own AI model images" ON public.ai_models FOR DELETE
TO authenticated USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 6. AI AD GENERATOR CREATIVES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  image_path text NOT NULL,
  ad_style text NOT NULL,
  theme text NOT NULL DEFAULT '',
  aspect_ratio text NOT NULL DEFAULT '1:1',
  prompt text NOT NULL,
  caption text DEFAULT '',
  hashtags text DEFAULT '',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_ads_user_id_created_at_idx ON public.ai_ads (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_ads_product_id_idx ON public.ai_ads (product_id);
CREATE INDEX IF NOT EXISTS ai_ads_campaign_id_idx ON public.ai_ads (campaign_id);

ALTER TABLE public.ai_ads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_ads FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_ads TO authenticated;

DROP POLICY IF EXISTS "Users can view own AI ads" ON public.ai_ads;
CREATE POLICY "Users can view own AI ads" ON public.ai_ads FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI ads" ON public.ai_ads;
CREATE POLICY "Users can insert own AI ads" ON public.ai_ads FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI ads" ON public.ai_ads;
CREATE POLICY "Users can update own AI ads" ON public.ai_ads FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own AI ads" ON public.ai_ads;
CREATE POLICY "Users can delete own AI ads" ON public.ai_ads FOR DELETE
TO authenticated USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 7. INSTAGRAM ACCOUNTS (META INTEGRATION)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.instagram_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_user_id text NOT NULL,
  username text NOT NULL,
  account_type text DEFAULT 'BUSINESS',
  profile_picture_url text DEFAULT '',
  access_token text NOT NULL,
  token_expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_instagram UNIQUE(user_id, instagram_user_id)
);

CREATE INDEX IF NOT EXISTS instagram_accounts_user_id_idx ON public.instagram_accounts (user_id);

ALTER TABLE public.instagram_accounts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.instagram_accounts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_accounts TO authenticated;

DROP POLICY IF EXISTS "Users can view own Instagram accounts" ON public.instagram_accounts;
CREATE POLICY "Users can view own Instagram accounts" ON public.instagram_accounts FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own Instagram accounts" ON public.instagram_accounts;
CREATE POLICY "Users can insert own Instagram accounts" ON public.instagram_accounts FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own Instagram accounts" ON public.instagram_accounts;
CREATE POLICY "Users can update own Instagram accounts" ON public.instagram_accounts FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own Instagram accounts" ON public.instagram_accounts;
CREATE POLICY "Users can delete own Instagram accounts" ON public.instagram_accounts FOR DELETE
TO authenticated USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 8. CONTENT CALENDAR / SCHEDULED POSTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  creative_type text NOT NULL DEFAULT 'ad',
  image_url text NOT NULL,
  caption text NOT NULL DEFAULT '',
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  published_at timestamptz,
  instagram_media_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduled_posts_user_id_date_idx ON public.scheduled_posts (user_id, scheduled_for ASC);
CREATE INDEX IF NOT EXISTS scheduled_posts_status_idx ON public.scheduled_posts (status);

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.scheduled_posts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_posts TO authenticated;

DROP POLICY IF EXISTS "Users can view own scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users can view own scheduled posts" ON public.scheduled_posts FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users can insert own scheduled posts" ON public.scheduled_posts FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users can update own scheduled posts" ON public.scheduled_posts FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own scheduled posts" ON public.scheduled_posts;
CREATE POLICY "Users can delete own scheduled posts" ON public.scheduled_posts FOR DELETE
TO authenticated USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 9. PRODUCT IMAGES STORAGE BUCKET & POLICIES
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images" ON storage.objects FOR SELECT
TO public USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Users can upload own product images" ON storage.objects;
CREATE POLICY "Users can upload own product images" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own product images" ON storage.objects;
CREATE POLICY "Users can update own product images" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own product images" ON storage.objects;
CREATE POLICY "Users can delete own product images" ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ---------------------------------------------------------------------------
-- 10. BACKFILL PROFILES FOR ANY EXISTING AUTH USERS
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (id, full_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
