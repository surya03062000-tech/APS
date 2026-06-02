import { NextRequest, NextResponse } from 'next/server';
import Twilio from 'twilio';
import { createServer } from '@/lib/supabase-server';
import { whatsappTemplate } from '@/lib/i18n';

export async function POST(req: NextRequest) {
  // Auth check
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { rows, lang } = body;

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!twilioSid || !twilioToken || !from) {
    return NextResponse.json({
      error: lang === 'ta'
        ? 'Twilio அமைக்கப்படவில்லை. சுற்றுச்சூழல் மாறிகளை சரிபாருங்கள்.'
        : 'Twilio not configured. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM env vars.'
    }, { status: 500 });
  }

  const client = Twilio(twilioSid, twilioToken);

  const eligible = (rows ?? []).filter((r: any) => r.whatsapp_enabled && r.phone);

  if (eligible.length === 0) {
    return NextResponse.json({
      message: lang === 'ta'
        ? 'வாட்ஸ்அப் இயக்கப்பட்ட வாடிக்கையாளர்கள் இல்லை'
        : 'No WhatsApp-enabled customers found',
      sent: 0, failed: 0,
    });
  }

  const results = await Promise.allSettled(
    eligible.map((r: any) => {
      const toNum = r.phone.startsWith('+') ? r.phone : '+91' + r.phone.replace(/\D/g,'');
      return client.messages.create({
        from,
        to: `whatsapp:${toNum}`,
        body: whatsappTemplate(lang, {
          name: r.name,
          litres: r.litres,
          amount: Math.round(r.milkAmount),
          balance: Math.round(r.balance),
        }),
      });
    })
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason?.message ?? 'unknown')
    .slice(0, 3);

  return NextResponse.json({
    message: lang === 'ta'
      ? `வாட்ஸ்அப்: ${sent} அனுப்பப்பட்டது, ${failed} தோல்வி`
      : `WhatsApp: ${sent} sent, ${failed} failed`,
    sent, failed,
    ...(errors.length ? { errors } : {}),
  });
}
