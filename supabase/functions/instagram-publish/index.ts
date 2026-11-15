import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Please sign in to publish content.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) {
      return json({ error: 'Database environment configuration is missing on server.' }, 500);
    }

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError || !userData.user) {
      return json({ error: 'Your session has expired. Please sign in again.' }, 401);
    }
    const userId = userData.user.id;

    const body = (await req.json().catch(() => null)) as {
      imageUrl?: string;
      caption?: string;
      scheduledPostId?: string;
    } | null;

    const imageUrl = body?.imageUrl || '';
    const caption = body?.caption || '';
    const scheduledPostId = body?.scheduledPostId;

    if (!imageUrl) {
      return json({ error: 'A public image URL is required to publish to Instagram.' }, 400);
    }

    // Retrieve user's connected Instagram Professional account
    const { data: igAccount, error: igError } = await client
      .from('instagram_accounts')
      .select('instagram_user_id, access_token, username')
      .eq('user_id', userId)
      .maybeSingle();

    if (igError || !igAccount) {
      return json(
        {
          error:
            'No Instagram Professional account is connected. Please connect your Instagram Business or Creator account in Instagram Publishing settings first.',
          requiresConnection: true,
        },
        400
      );
    }

    // Step 1: Create Instagram media container via Meta Graph API
    const createContainerUrl = `https://graph.facebook.com/v19.0/${igAccount.instagram_user_id}/media`;
    const containerRes = await fetch(createContainerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: igAccount.access_token,
      }),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok || !containerData.id) {
      console.error('Meta media container creation failed:', containerData);
      const errorMessage =
        containerData.error?.message ||
        'Meta Graph API rejected the image. Ensure the image URL is publicly accessible and meets Instagram aspect ratio requirements.';

      if (scheduledPostId) {
        await client
          .from('scheduled_posts')
          .update({ status: 'failed', error_message: errorMessage })
          .eq('id', scheduledPostId);
      }

      return json({ error: `Instagram Publishing Error: ${errorMessage}` }, 422);
    }

    const creationId = containerData.id;

    // Step 2: Publish the media container
    const publishUrl = `https://graph.facebook.com/v19.0/${igAccount.instagram_user_id}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: igAccount.access_token,
      }),
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) {
      console.error('Meta media publish failed:', publishData);
      const errorMessage = publishData.error?.message || 'Meta could not complete the Instagram publication.';

      if (scheduledPostId) {
        await client
          .from('scheduled_posts')
          .update({ status: 'failed', error_message: errorMessage })
          .eq('id', scheduledPostId);
      }

      return json({ error: `Instagram Publish Error: ${errorMessage}` }, 422);
    }

    const publishedMediaId = publishData.id;

    // Step 3: Update scheduled_post record if provided
    if (scheduledPostId) {
      await client
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          instagram_media_id: publishedMediaId,
          error_message: null,
        })
        .eq('id', scheduledPostId);
    }

    return json({
      success: true,
      mediaId: publishedMediaId,
      username: igAccount.username,
      message: `Successfully published to @${igAccount.username}!`,
    });
  } catch (err) {
    console.error('instagram-publish error:', err);
    return json(
      { error: err instanceof Error ? err.message : 'An unexpected error occurred during Instagram publishing.' },
      500
    );
  }
});
