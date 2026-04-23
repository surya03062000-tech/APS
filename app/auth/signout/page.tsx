import { createServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';

export default async function SignOut() {
  const sb = createServer();
  await sb.auth.signOut();
  redirect('/auth/signin');
}
