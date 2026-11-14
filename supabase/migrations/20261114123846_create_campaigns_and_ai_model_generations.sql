/*
# Create campaigns and AI model generation history

Plain-English summary:
This adds two tables. `campaigns` lets a user group advertisements into named
campaigns. `ai_models` is the generation history: every AI fashion model image
created in the AI Model Studio, with the product it was made from, the prompt
used, the options chosen and which campaign (if any) it was saved to.

1. New Tables
- `campaigns`: id, owner, name, created and updated timestamps.
- `ai_models`: id, owner, product (optional link), campaign (optional link),
  storage path of the generated image, prompt text, generation settings (JSON),
  created timestamp.

2. Security
- Row Level Security enabled on both tables.
- Each user can only read, create, update and delete their own rows.
- Users may change only the campaign link on a generation; the image, prompt
  and settings are fixed once generated.
- Grants are limited to the signed-in role; anonymous visitors have no access.

3. Important Notes
- 3.1 Deleting a product or campaign keeps the generated images in history
  (the link is cleared rather than the image removed).
- 3.2 No existing data is changed.
*/

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaigns_user_id_created_at_idx ON campaigns (user_id, created_at DESC);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON campaigns FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;

DROP POLICY IF EXISTS "Users can view own campaigns" ON campaigns;
CREATE POLICY "Users can view own campaigns" ON campaigns FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaigns;
CREATE POLICY "Users can insert own campaigns" ON campaigns FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
CREATE POLICY "Users can update own campaigns" ON campaigns FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaigns;
CREATE POLICY "Users can delete own campaigns" ON campaigns FOR DELETE
TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  image_path text NOT NULL,
  prompt text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_models_user_id_created_at_idx ON ai_models (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_models_product_id_idx ON ai_models (product_id);
CREATE INDEX IF NOT EXISTS ai_models_campaign_id_idx ON ai_models (campaign_id);

ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ai_models FROM anon;
GRANT SELECT, INSERT, DELETE ON ai_models TO authenticated;
GRANT UPDATE (campaign_id) ON ai_models TO authenticated;

DROP POLICY IF EXISTS "Users can view own AI model images" ON ai_models;
CREATE POLICY "Users can view own AI model images" ON ai_models FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own AI model images" ON ai_models;
CREATE POLICY "Users can insert own AI model images" ON ai_models FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI model images" ON ai_models;
CREATE POLICY "Users can update own AI model images" ON ai_models FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own AI model images" ON ai_models;
CREATE POLICY "Users can delete own AI model images" ON ai_models FOR DELETE
TO authenticated USING (auth.uid() = user_id);
