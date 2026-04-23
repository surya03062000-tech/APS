import { createBrowserClient } from '@supabase/ssr';

// Browser client — used in Client Components only.
// This file MUST NOT import next/headers or any server-only module,
// because Client Components pull it into the browser bundle.
export const createBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
