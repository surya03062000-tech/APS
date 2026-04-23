import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { mode, year, month, date, rows, totals } = body;

  const wb = XLSX.utils.book_new();

  if (mode === 'monthly') {
    // --- Sheet 1: Customer summary ---
    const summary = [
      ['Code', 'Name', 'Litres', 'Rate', 'Milk ₹', 'Feed ₹', 'Advance bal', 'Payable ₹'],
      ...rows.map((r: any) => [
        r.code, r.name, Number(r.litres.toFixed(3)), r.rate,
        Math.round(r.milkAmount), Math.round(r.feed),
        Math.round(r.advanceBalance), Math.round(r.balance),
      ]),
      [],
      ['', 'TOTAL', Number(totals.litres.toFixed(3)), '',
        Math.round(totals.milkAmount), Math.round(totals.feed), '', Math.round(totals.balance)],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summary);
    ws1['!cols'] = [{ wch:6 }, { wch:24 }, { wch:10 }, { wch:8 }, { wch:12 }, { wch:12 }, { wch:12 }, { wch:12 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // --- Sheet 2: Milk day-by-day (morning/evening) per customer ---
    const start = new Date(year, month-1, 1);
    const end   = new Date(year, month, 0);
    const { data: entries } = await sb.from('entries').select('*')
      .gte('entry_date', start.toISOString().slice(0,10))
      .lte('entry_date', end.toISOString().slice(0,10));

    const days: string[] = [];
    for (let d = 1; d <= end.getDate(); d++) {
      days.push(`${String(d).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`);
    }
    const header = ['S.No', 'Name'];
    days.forEach(d => { header.push(d, ''); });
    const sub = ['', ''];
    days.forEach(() => { sub.push('Morning', 'Evening'); });

    const milkRows: any[] = [header, sub];
    rows.forEach((r: any, idx: number) => {
      const row: any[] = [idx+1, r.name];
      for (let d = 1; d <= end.getDate(); d++) {
        const iso = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const e = entries?.find(x => x.customer_id === r.customer_id && x.entry_date === iso);
        row.push(e?.morning_litres ?? '', e?.evening_litres ?? '');
      }
      milkRows.push(row);
    });
    const ws2 = XLSX.utils.aoa_to_sheet(milkRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'Milk Total');

    // --- Sheet 3: Thivanam (feed) log ---
    const thivRows = [
      ['Code', 'Name', 'Date', 'Qty', 'Amount'],
      ...(entries ?? []).filter(e => Number(e.thivanam_qty) > 0).map(e => {
        const c = rows.find((r:any) => r.customer_id === e.customer_id);
        return [c?.code, c?.name, e.entry_date, e.thivanam_qty, Number(e.thivanam_amount)];
      }),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(thivRows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Thivanam Total');

    // --- Sheet 4: Advance log ---
    const advRows = [
      ['Code', 'Name', 'Date', 'Amount', 'Running balance'],
      ...(entries ?? []).filter(e => Number(e.advance_amount) !== 0).map(e => {
        const c = rows.find((r:any) => r.customer_id === e.customer_id);
        return [c?.code, c?.name, e.entry_date, Number(e.advance_amount), c?.advanceBalance];
      }),
    ];
    const ws4 = XLSX.utils.aoa_to_sheet(advRows);
    XLSX.utils.book_append_sheet(wb, ws4, 'Advance Total');

  } else {
    // --- Daily: single sheet ---
    const daily = [
      ['Code', 'Name', 'Morning', 'Evening', 'Total L', 'Rate', 'Milk ₹', 'Feed ₹', 'Advance ₹'],
      ...rows.map((r: any) => [
        r.code, r.name,
        /* we'd need morning/evening split from the raw entry; included in row litres */
        '', '', Number(r.litres.toFixed(3)),
        r.rate, Math.round(r.milkAmount), Math.round(r.feed), Math.round(r.advanceGiven ?? 0),
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(daily);
    XLSX.utils.book_append_sheet(wb, ws, date);
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="APS_${mode}_${year}_${month || ''}.xlsx"`,
    },
  });
}
