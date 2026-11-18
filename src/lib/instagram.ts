import { supabase } from '@/lib/supabase';
import type { InstagramAccount } from '@/types/marketing';

export async function fetchInstagramAccount(): Promise<InstagramAccount | null> {
  const { data, error } = await supabase
    .from('instagram_accounts')
    .select('id, user_id, instagram_user_id, username, account_type, profile_picture_url, token_expires_at, connected_at')
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function connectInstagramAccount(credentials: {
  instagramUserId: string;
  username: string;
  accessToken: string;
  accountType?: string;
  profilePictureUrl?: string;
}): Promise<InstagramAccount> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('instagram_accounts')
    .upsert({
      user_id: user?.id,
      instagram_user_id: credentials.instagramUserId.trim(),
      username: credentials.username.trim().replace(/^@/, ''),
      access_token: credentials.accessToken.trim(),
      account_type: credentials.accountType || 'BUSINESS',
      profile_picture_url: credentials.profilePictureUrl || '',
      connected_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function disconnectInstagramAccount(id: string): Promise<void> {
  const { error } = await supabase.from('instagram_accounts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Direct Meta Graph API Fallback Publisher
async function publishViaClientMetaApi(
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; mediaId: string; username: string; message: string }> {
  const { data: acc, error } = await supabase
    .from('instagram_accounts')
    .select('instagram_user_id, access_token, username')
    .maybeSingle();

  if (error || !acc || !acc.access_token) {
    throw new Error('No connected Instagram account found. Please connect your account first.');
  }

  // 1. Create Media Container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${acc.instagram_user_id}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: acc.access_token,
      }),
    }
  );

  const containerData = await containerRes.json();
  if (!containerRes.ok || containerData.error) {
    throw new Error(containerData.error?.message || 'Meta API rejected image container creation.');
  }

  const creationId = containerData.id;

  // 2. Publish Container
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${acc.instagram_user_id}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: acc.access_token,
      }),
    }
  );

  const publishData = await publishRes.json();
  if (!publishRes.ok || publishData.error) {
    throw new Error(publishData.error?.message || 'Meta API rejected publishing the post.');
  }

  return {
    success: true,
    mediaId: publishData.id,
    username: acc.username,
    message: `Successfully published to @${acc.username}!`,
  };
}

export async function publishToInstagram(
  imageUrl: string,
  caption: string,
  scheduledPostId?: string
): Promise<{ success: boolean; mediaId: string; username: string; message?: string }> {
  // Try Edge Function first if deployed
  try {
    const { data, error } = await supabase.functions.invoke('instagram-publish', {
      body: { imageUrl, caption, scheduledPostId },
    });

    if (!error && !data?.error && data?.mediaId) {
      return data;
    }
  } catch (edgeErr) {
    console.warn('Edge Function invoke notice, falling back to direct Meta Graph API:', edgeErr);
  }

  // Fallback to direct client-side Meta Graph API publisher
  return await publishViaClientMetaApi(imageUrl, caption);
}
