import { NextRequest, NextResponse } from 'next/server';
import { createServiceRole } from '@/lib/supabase-server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? (await req.json().catch(() => ({}))).cron_secret;
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createServiceRole();
  const today = new Date().toISOString().slice(0, 10);

  // Get all users with admin_email set
  const { data: settings } = await sb.from('user_settings').select('owner_id, admin_email, shop_name');
  if (!settings?.length) return NextResponse.json({ message: 'No settings found' });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  });

  let sent = 0;
  for (const s of settings) {
    if (!s.admin_email) continue;

    const { data: entries } = await sb.from('entries')
      .select('*, customers(name, code)')
      .eq('owner_id', s.owner_id)
      .eq('entry_date', today);

    if (!entries?.length) continue;

    const totalMilk = entries.reduce((sum, e) => sum + Number(e.morning_litres) + Number(e.evening_litres), 0);
    const rows = entries.map(e => `
      <tr>
        <td>#${(e.customers as any)?.code}</td>
        <td>${(e.customers as any)?.name}</td>
        <td>${Number(e.morning_litres).toFixed(1)}</td>
        <td>${Number(e.evening_litres).toFixed(1)}</td>
        <td><b>${(Number(e.morning_litres) + Number(e.evening_litres)).toFixed(1)}</b></td>
      </tr>`).join('');

    const html = `
      <h2>${s.shop_name ?? 'APS MILK CENTER'} — Daily Report (${today})</h2>
      <table border="1" cellpadding="6" style="border-collapse:collapse">
        <tr><th>#</th><th>Name</th><th>Morning L</th><th>Evening L</th><th>Total L</th></tr>
        ${rows}
        <tr style="background:#f0f0f0"><td colspan="4"><b>Total</b></td><td><b>${totalMilk.toFixed(1)}</b></td></tr>
      </table>
      <p>${entries.length} entries | ${totalMilk.toFixed(1)} L total</p>`;

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: s.admin_email,
      subject: `${s.shop_name ?? 'APS'} Daily Report — ${today}`,
      html,
    });
    sent++;
  }

  return NextResponse.json({ message: `Daily report sent to ${sent} admin(s)` });
}
