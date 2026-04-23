import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdmin();

  // Previous month
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const year  = prev.getFullYear();
  const month = prev.getMonth() + 1;
  const start = new Date(year, month - 1, 1).toISOString().slice(0,10);
  const end   = new Date(year, month, 0).toISOString().slice(0,10);

  // Pull per-user data and email each user their summary
  const { data: settings } = await admin.from('user_settings').select('*');

  for (const s of settings ?? []) {
    if (!s.admin_email) continue;
    const { data: customers } = await admin.from('customers').select('*').eq('owner_id', s.owner_id);
    const { data: entries }   = await admin.from('entries').select('*')
      .eq('owner_id', s.owner_id).gte('entry_date', start).lte('entry_date', end);
    const { data: rates }     = await admin.from('monthly_rates').select('*')
      .eq('year', year).eq('month', month);
    const rateMap: Record<string, number> = Object.fromEntries(
      (rates ?? []).map(r => [r.customer_id, Number(r.rate)])
    );

    const rows = (customers ?? []).map(c => {
      const es = (entries ?? []).filter(e => e.customer_id === c.id);
      const litres = es.reduce((x, e) => x + Number(e.morning_litres) + Number(e.evening_litres), 0);
      const feed   = es.reduce((x, e) => x + Number(e.biscuit_amount) + Number(e.thivanam_amount), 0);
      const rate   = rateMap[c.id] ?? Number(c.default_rate);
      const milk   = litres * rate;
      const balance = milk - feed - Number(c.advance_balance);
      return { c, litres, feed, rate, milk, balance };
    }).filter(r => r.litres > 0);

    // Build PDF
    const doc = new jsPDF();
    doc.setFontSize(15);
    doc.text(`APS MILK CENTER — ${String(month).padStart(2,'0')}/${year}`, 105, 15, { align:'center' });
    autoTable(doc, {
      startY: 22,
      head: [['Code', 'Name', 'Litres', 'Rate', 'Milk ₹', 'Feed ₹', 'Payable ₹']],
      body: rows.map(r => [
        r.c.code, r.c.name, r.litres.toFixed(3), r.rate.toFixed(2),
        Math.round(r.milk), Math.round(r.feed), Math.round(r.balance),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [232, 178, 74] },
    });
    const pdfBuf = Buffer.from(doc.output('arraybuffer'));

    // Email it
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transporter.sendMail({
      from: `"APS Milk" <${process.env.SMTP_USER}>`,
      to: s.admin_email,
      subject: `APS MILK CENTER — Monthly Report ${String(month).padStart(2,'0')}/${year}`,
      text: `Attached: monthly report for ${String(month).padStart(2,'0')}/${year}.`,
      attachments: [{ filename: `APS_${year}_${month}.pdf`, content: pdfBuf }],
    });
  }

  return NextResponse.json({ message: 'Monthly reports emailed', month: `${month}/${year}` });
}
