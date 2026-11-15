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
  const { data, error } = await supabase
    .from('instagram_accounts')
    .upsert({
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

export async function publishToInstagram(
  imageUrl: string,
  caption: string,
  scheduledPostId?: string
): Promise<{ success: boolean; mediaId: string; username: string }> {
  const { data, error } = await supabase.functions.invoke('instagram-publish', {
    body: { imageUrl, caption, scheduledPostId },
  });

  if (error) {
    let msg = error.message;
    try {
      const errBody = await error.context?.json?.();
      if (errBody?.error) msg = errBody.error;
    } catch {}
    throw new Error(msg || 'Instagram publishing failed.');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}
