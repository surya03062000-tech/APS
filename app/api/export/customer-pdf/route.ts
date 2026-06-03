import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createServer } from '@/lib/supabase-server';

// Customer-wise monthly PDF (Feature #26)
export async function POST(req: NextRequest) {
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { customerId, year, month } = await req.json();
  const start = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const end   = new Date(year, month, 0).toISOString().slice(0, 10);

  const { data: c } = await sb.from('customers').select('*').eq('id', customerId).single();
  const { data: entries } = await sb.from('entries')
    .select('*').eq('customer_id', customerId)
    .gte('entry_date', start).lte('entry_date', end)
    .order('entry_date');

  if (!c) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  const rate = Number(c.default_rate);
  const totalLitres = (entries ?? []).reduce((s, e) => s + Number(e.morning_litres) + Number(e.evening_litres), 0);
  const totalFeed   = (entries ?? []).reduce((s, e) => s + Number(e.biscuit_amount) + Number(e.thivanam_amount), 0);
  const milkAmount  = totalLitres * rate;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFontSize(16);
  doc.text('APS MILK CENTER', 105, 15, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`Customer Statement — #${c.code} ${c.name}`, 105, 23, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Period: ${String(month).padStart(2, '0')}/${year}`, 105, 29, { align: 'center' });

  autoTable(doc, {
    startY: 36,
    head: [['Date', 'Morning L', 'Evening L', 'Total L', 'Biscuit ₹', 'Feed ₹', 'Advance ₹']],
    body: (entries ?? []).map(e => [
      e.entry_date,
      Number(e.morning_litres).toFixed(1),
      Number(e.evening_litres).toFixed(1),
      (Number(e.morning_litres) + Number(e.evening_litres)).toFixed(1),
      Math.round(Number(e.biscuit_amount)),
      Math.round(Number(e.thivanam_amount)),
      Math.round(Number(e.advance_amount)),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [232, 178, 74] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text(`Total milk: ${totalLitres.toFixed(1)} L  @  ₹${rate.toFixed(1)}/L  =  ₹${Math.round(milkAmount)}`, 14, finalY);
  doc.text(`Feed/Biscuit total: ₹${Math.round(totalFeed)}`, 14, finalY + 7);
  doc.text(`Current advance balance: ₹${Number(c.advance_balance).toLocaleString('en-IN')}`, 14, finalY + 14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Net payable to customer: ₹${Math.round(milkAmount - totalFeed - Number(c.advance_balance))}`, 14, finalY + 23);

  const buf = Buffer.from(doc.output('arraybuffer'));
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${c.name}_${year}_${month}.pdf"`,
    },
  });
}
