import { NextRequest, NextResponse } from 'next/server';
import Twilio from 'twilio';
import { whatsappTemplate } from '@/lib/i18n';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { rows, lang } = body;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
  }
  const client = Twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
  const from = process.env.TWILIO_WHATSAPP_FROM!;

  const results = await Promise.allSettled(
    rows
      .filter((r: any) => r.whatsapp_enabled && r.phone)
      .map((r: any) => client.messages.create({
        from,
        to: `whatsapp:${r.phone.startsWith('+') ? r.phone : '+91' + r.phone.replace(/\D/g,'')}`,
        body: whatsappTemplate(lang, {
          name: r.name, litres: r.litres,
          amount: Math.round(r.milkAmount),
          balance: Math.round(r.balance),
        }),
      }))
  );

  const sent   = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  return NextResponse.json({ message: `WhatsApp: ${sent} sent, ${failed} failed`, sent, failed });
}
