import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? 'unknown';

  await sb.from('login_activity').insert({
    user_id: user.id,
    action: body.action ?? 'login',
    ip_address: ip,
    user_agent: ua,
    created_at: new Date().toISOString(),
  }).then(() => {}); // best-effort, ignore errors

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await sb.from('login_activity')
    .select('*').eq('user_id', user.id)
    .order('created_at', { ascending: false }).limit(20);

  return NextResponse.json({ logs: data ?? [] });
}
