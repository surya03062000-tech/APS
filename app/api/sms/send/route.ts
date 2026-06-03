import { NextRequest, NextResponse } from 'next/server';
import Twilio from 'twilio';
import { createServer } from '@/lib/supabase-server';
import { whatsappTemplate } from '@/lib/i18n';

// SMS fallback for non-WhatsApp customers (Feature #52)
export async function POST(req: NextRequest) {
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows, lang } = await req.json();

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) {
    return NextResponse.json({
      error: lang === 'ta'
        ? 'SMS அமைக்கப்படவில்லை. TWILIO_SMS_FROM env சேர்க்கவும்.'
        : 'SMS not configured. Add TWILIO_SMS_FROM env var.',
    }, { status: 500 });
  }

  const client = Twilio(sid, token);
  // SMS goes to customers WITHOUT whatsapp (fallback)
  const eligible = (rows ?? []).filter((r: any) => !r.whatsapp_enabled && r.phone);

  if (!eligible.length) {
    return NextResponse.json({
      message: lang === 'ta' ? 'SMS அனுப்ப வாடிக்கையாளர்கள் இல்லை' : 'No SMS-eligible customers',
      sent: 0,
    });
  }

  const results = await Promise.allSettled(
    eligible.map((r: any) => {
      const to = r.phone.startsWith('+') ? r.phone : '+91' + r.phone.replace(/\D/g, '');
      return client.messages.create({
        from, to,
        body: whatsappTemplate(lang, {
          name: r.name, litres: r.litres,
          amount: Math.round(r.milkAmount), balance: Math.round(r.balance),
        }),
      });
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  return NextResponse.json({
    message: lang === 'ta' ? `SMS: ${sent} அனுப்பப்பட்டது, ${failed} தோல்வி` : `SMS: ${sent} sent, ${failed} failed`,
    sent, failed,
  });
}
