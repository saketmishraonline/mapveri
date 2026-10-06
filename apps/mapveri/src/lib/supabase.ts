import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

const rawSupabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env as any).SUPABASE_URL
) as string | undefined;

const normalizedSupabaseUrl = rawSupabaseUrl ? rawSupabaseUrl.trim().replace(/\/+$/, '') : undefined;

const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env as any).SUPABASE_ANON_KEY ||
  (import.meta.env as any).SUPABASE_PUBLISHABLE_KEY
) as string | undefined;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    normalizedSupabaseUrl &&
    supabaseAnonKey &&
    (normalizedSupabaseUrl.startsWith('http://') || normalizedSupabaseUrl.startsWith('https://')) &&
    supabaseAnonKey.length > 10
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(normalizedSupabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;


/**
 * Initiates OAuth login using Supabase (e.g. Google, Azure/Outlook, Zoho)
 */
export async function signInWithSupabase(
  provider: 'google' | 'azure' | 'zoho' | string,
  redirectTo = `${window.location.origin}/login`
) {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
    );
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as any,
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        ...(provider === 'google' ? { prompt: 'select_account' } : {}),
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data?.url) {
    window.location.href = data.url;
  }

  return data;
}

/**
 * Completely sign out user from both MapVeri backend and Supabase
 */
export async function signOutUser() {
  window.localStorage.removeItem('mapveri_token');
  if (supabase) {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn('Supabase sign-out error:', e);
    }
  }
}

/**
 * Sync Supabase authenticated user with MapVeri PostgreSQL database and obtain MapVeri JWT
 */
export async function syncSupabaseUserWithBackend(session: Session) {
  const user = session.user;
  const email = user.email;
  if (!email) {
    throw new Error('Supabase session does not contain an email address');
  }

  const res = await fetch('/api/auth/supabase-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supabaseAccessToken: session.access_token,
      email: email,
      name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.user_metadata?.user_name ||
        email.split('@')[0],
      avatarUrl:
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        user.user_metadata?.avatar ||
        null,
      provider: user.app_metadata?.provider || user.identities?.[0]?.provider || 'google',
      providerId: user.id || user.identities?.[0]?.id,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to sync Supabase user with backend database');
  }

  const result = await res.json();
  if (result.token) {
    window.localStorage.setItem('mapveri_token', result.token);
  }
  return result;
}
