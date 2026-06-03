import { NextRequest, NextResponse } from 'next/server';
import Twilio from 'twilio';
import { createServer, createAdmin } from '@/lib/supabase-server';
import { voiceTemplate } from '@/lib/i18n';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { session = 'morning', lang = 'ta', cron_secret, owner_id } = body;

  // Allow cron secret, direct owner_id from authenticated client, or cookie auth
  let ownerId: string | null = null;
  if (cron_secret && cron_secret === process.env.CRON_SECRET) {
    ownerId = owner_id ?? null;
  } else if (owner_id) {
    // Verify the owner_id belongs to the authenticated session
    const sb = createServer();
    const { data: { user } } = await sb.auth.getUser();
    ownerId = user?.id === owner_id ? owner_id : null;
    if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } else {
    const sb = createServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    ownerId = user.id;
  }
  if (!ownerId) return NextResponse.json({ error: 'No owner' }, { status: 400 });

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_VOICE_FROM;

  if (!twilioSid || !twilioToken || !from) {
    return NextResponse.json({
      error: lang === 'ta'
        ? 'Twilio அமைக்கப்படவில்லை. TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VOICE_FROM சரிபாருங்கள்.'
        : 'Twilio not configured. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VOICE_FROM env vars.'
    }, { status: 500 });
  }

  const admin = createAdmin();
  const today = new Date().toISOString().slice(0,10);
  const { data: entries, error: fetchErr } = await admin
    .from('entries')
    .select('customer_id, morning_litres, evening_litres, customers(name, phone)')
    .eq('owner_id', ownerId)
    .eq('entry_date', today);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const callable = (entries ?? []).filter((e: any) => {
    if (!e.customers?.phone) return false;
    const litres = session === 'morning' ? Number(e.morning_litres) : Number(e.evening_litres);
    return litres > 0;
  });

  if (callable.length === 0) {
    return NextResponse.json({
      message: lang === 'ta'
        ? `இன்று ${session === 'morning' ? 'காலை' : 'மாலை'} பதிவுகள் இல்லை`
        : `No ${session} entries found for today`
    });
  }

  const client = Twilio(twilioSid, twilioToken);

  // Polly.Aditi is hi-IN but renders Tamil text adequately.
  // Use alice for Tamil as fallback when Polly.Aditi mispronounces.
  const voice = lang === 'ta' ? 'Polly.Aditi' : 'Polly.Raveena';
  const language = lang === 'ta' ? 'ta-IN' : 'en-IN';

  const calls = await Promise.allSettled(
    callable.map((e: any) => {
      const litres = session === 'morning'
        ? Number(e.morning_litres) : Number(e.evening_litres);
      const msg = voiceTemplate(lang, {
        name: e.customers.name,
        session: session as 'morning' | 'evening',
        litres,
      });
      // Escape XML special characters
      const safe = msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${language}">${safe}</Say>
  <Pause length="1"/>
  <Say voice="${voice}" language="${language}">${safe}</Say>
</Response>`;
      const toNum = e.customers.phone.startsWith('+')
        ? e.customers.phone
        : '+91' + e.customers.phone.replace(/\D/g,'');
      return client.calls.create({ from, to: toNum, twiml });
    })
  );

  const ok   = calls.filter(c => c.status === 'fulfilled').length;
  const fail = calls.filter(c => c.status === 'rejected').length;
  const reasons = calls
    .filter((c): c is PromiseRejectedResult => c.status === 'rejected')
    .map(c => c.reason?.message ?? 'unknown')
    .slice(0, 3);

  return NextResponse.json({
    message: lang === 'ta'
      ? `அழைப்புகள்: ${ok} வெற்றி, ${fail} தோல்வி`
      : `Calls: ${ok} placed, ${fail} failed`,
    ok, fail,
    ...(reasons.length ? { errors: reasons } : {}),
  });
}
