import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Server client — use in Server Components, Route Handlers, Server Actions.
export const createServer = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o) => { try { cookieStore.set(n, v, o); } catch {} },
        remove: (n, o) => { try { cookieStore.set(n, '', o); } catch {} },
      },
    }
  );
};

// Admin client — service-role, only for CRON / trusted API routes.
// Bypasses RLS. Never import this in a Client Component.
export const createAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
