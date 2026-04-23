import { NextRequest, NextResponse } from 'next/server';
import Twilio from 'twilio';
import { createServer, createAdmin } from '@/lib/supabase-server';
import { voiceTemplate } from '@/lib/i18n';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { session = 'morning', lang = 'ta', cron_secret, owner_id } = body;

  // Allow either authed user OR cron secret
  let ownerId: string | null = null;
  if (cron_secret === process.env.CRON_SECRET) {
    // cron — caller must also supply owner_id
    ownerId = owner_id ?? null;
  } else {
    const sb = createServer();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    ownerId = user.id;
  }
  if (!ownerId) return NextResponse.json({ error: 'No owner' }, { status: 400 });

  const admin = createAdmin();
  const today = new Date().toISOString().slice(0,10);
  const { data: entries } = await admin
    .from('entries').select('customer_id, morning_litres, evening_litres, customers(name, phone)')
    .eq('owner_id', ownerId).eq('entry_date', today);

  if (!process.env.TWILIO_ACCOUNT_SID) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
  }
  const client = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  const from = process.env.TWILIO_VOICE_FROM!;
  const voice = lang === 'ta' ? 'Polly.Aditi' : 'Polly.Raveena';  // Polly Tamil/Hindi Indian voices

  const calls = await Promise.allSettled(
    (entries ?? [])
      .filter((e: any) => e.customers?.phone)
      .map((e: any) => {
        const litres = session === 'morning'
          ? Number(e.morning_litres) : Number(e.evening_litres);
        if (!litres) return Promise.resolve(null);
        const msg = voiceTemplate(lang, {
          name: e.customers.name,
          session: session as any,
          litres,
        });
        // TwiML inline — <Say> with language + voice
        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${lang==='ta'?'ta-IN':'en-IN'}">${msg}</Say>
  <Say voice="${voice}" language="${lang==='ta'?'ta-IN':'en-IN'}">${msg}</Say>
</Response>`;
        return client.calls.create({
          from,
          to: e.customers.phone.startsWith('+') ? e.customers.phone : '+91' + e.customers.phone.replace(/\D/g,''),
          twiml,
        });
      })
  );
  const ok = calls.filter(c => c.status === 'fulfilled' && c.value).length;
  const fail = calls.filter(c => c.status === 'rejected').length;
  return NextResponse.json({ message: `Calls: ${ok} placed, ${fail} failed` });
}
