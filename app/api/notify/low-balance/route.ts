import { NextRequest, NextResponse } from 'next/server';
import { createAdmin } from "@/lib/supabase-server";
import twilio from 'twilio';

const THRESHOLD = 500; // ₹500 outstanding triggers alert

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? (await req.json().catch(() => ({}))).cron_secret;
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const sb = createAdmin();

  const { data: highBalance } = await sb
    .from('customers')
    .select('*')
    .gt('advance_balance', THRESHOLD)
    .eq('whatsapp_enabled', true);

  if (!highBalance?.length) {
    return NextResponse.json({ message: 'No customers with high outstanding balance' });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const c of highBalance) {
    if (!c.phone) continue;
    const phone = c.phone.replace(/\D/g, '');
    const msg = `வணக்கம் ${c.name}, உங்கள் மீதமுள்ள தொகை ₹${Number(c.advance_balance).toLocaleString('en-IN')}. தயவுசெய்து செலுத்தவும். நன்றி - APS MILK CENTER 🥛`;
    try {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM!,
        to: `whatsapp:+91${phone}`,
        body: msg,
      });
      sent++;
    } catch (e: any) {
      errors.push(`${c.name}: ${e.message}`);
    }
  }

  return NextResponse.json({
    message: `Low balance alerts sent: ${sent}/${highBalance.length}`,
    errors: errors.length ? errors : undefined,
  });
}
