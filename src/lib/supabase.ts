import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Strip any trailing slashes to prevent double slashes in API calls
const supabaseUrl = rawUrl.trim().replace(/\/+$/, '');
const supabaseAnonKey = rawAnonKey.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[JEWELS AI] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'jewels-ai-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
