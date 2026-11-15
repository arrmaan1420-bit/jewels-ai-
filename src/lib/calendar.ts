import { supabase } from '@/lib/supabase';
import type { ScheduledPost } from '@/types/marketing';

export async function fetchScheduledPosts(): Promise<ScheduledPost[]> {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .select('*')
    .order('scheduled_for', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as ScheduledPost[];
}

export async function createScheduledPost(post: {
  imageUrl: string;
  caption: string;
  scheduledFor: string;
  creativeType?: 'ad' | 'model';
  campaignId?: string | null;
  productId?: string | null;
  status?: 'draft' | 'scheduled';
}): Promise<ScheduledPost> {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .insert({
      image_url: post.imageUrl,
      caption: post.caption,
      scheduled_for: post.scheduledFor,
      creative_type: post.creativeType || 'ad',
      campaign_id: post.campaignId || null,
      product_id: post.productId || null,
      status: post.status || 'scheduled',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduledPost;
}

export async function updateScheduledPost(
  id: string,
  updates: Partial<Pick<ScheduledPost, 'caption' | 'scheduled_for' | 'status'>>
): Promise<ScheduledPost> {
  const { data, error } = await supabase
    .from('scheduled_posts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ScheduledPost;
}

export async function deleteScheduledPost(id: string): Promise<void> {
  const { error } = await supabase.from('scheduled_posts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
