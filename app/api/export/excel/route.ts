import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createServer } from '@/lib/supabase-server';

function pad(n: number) { return String(n).padStart(2, '0'); }

const MONTHS_TA = ['','ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'];
const MONTHS_EN = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

export async function POST(req: NextRequest) {
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { mode, year, month, date, rows, totals, lang = 'ta' } = body;

  const ta = lang === 'ta';
  const wb = XLSX.utils.book_new();

  if (mode === 'monthly') {
    const daysInMonth = new Date(year, month, 0).getDate();
    const start = `${year}-${pad(month)}-01`;
    const end   = `${year}-${pad(month)}-${pad(daysInMonth)}`;
    const monthName = ta ? MONTHS_TA[month] : MONTHS_EN[month];
    const shopName  = ta ? 'APS பால்பண்ணை, மூங்கிலாறு' : 'APS Milk Center, Mungilaru';

    const { data: entries } = await sb.from('entries').select('*')
      .eq('owner_id', user.id)
      .gte('entry_date', start).lte('entry_date', end);

    // --- Build per-customer morning/evening totals ---
    const custTotals = rows.map((r: any) => {
      const ce = (entries ?? []).filter((e: any) => e.customer_id === r.customer_id);
      const morningTotal = ce.reduce((s: number, e: any) => s + Number(e.morning_litres || 0), 0);
      const eveningTotal = ce.reduce((s: number, e: any) => s + Number(e.evening_litres || 0), 0);
      return { ...r, morningTotal, eveningTotal };
    });

    // Sort by total litres desc for rank
    const sorted = [...custTotals].sort((a: any, b: any) => b.litres - a.litres);
    const rankMap: Record<string, number> = {};
    sorted.forEach((r: any, i: number) => { rankMap[r.customer_id] = i + 1; });

    const grandMorning = custTotals.reduce((s: number, r: any) => s + r.morningTotal, 0);
    const grandEvening = custTotals.reduce((s: number, r: any) => s + r.eveningTotal, 0);
    const grandTotal   = grandMorning + grandEvening;

    // ===================== Sheet 1: Summary =====================
    const s1Label = ta ? 'சுருக்கம்' : 'Summary';
    const periodStr = ta
      ? `01.${pad(month)}.${year} முதல் ${pad(daysInMonth)}.${pad(month)}.${year} வரை`
      : `01.${pad(month)}.${year} to ${pad(daysInMonth)}.${pad(month)}.${year}`;
    const titleStr = ta
      ? `பால் வரவு சுருக்கம்  —  ${monthName} ${year}  (${periodStr})`
      : `Milk Supply Summary  —  ${monthName} ${year}  (${periodStr})`;

    const summaryHeaders = ta
      ? ['வ.எண்', 'பெயர்', 'காலை மொத்தம்', 'மாலை மொத்தம்', 'மொத்தம் (லி.)', 'சதவீதம் %', 'தரம்']
      : ['S.No', 'Name', 'Morning Total', 'Evening Total', 'Total (L)', 'Percent %', 'Rank'];
    const grandLabels = ta
      ? ['மொத்த பால் (லி.)', '', 'காலை மொத்தம் (லி.)', '', 'மாலை மொத்தம் (லி.)', `மொத்த பால்காரர்கள்`, '']
      : ['Total Milk (L)', '', 'Morning Total (L)', '', 'Evening Total (L)', 'Total Customers', ''];

    const s1Data: any[][] = [
      [shopName],
      [titleStr],
      [],
      [],
      grandLabels,
      [grandTotal.toFixed(1), '', grandMorning.toFixed(1), '', grandEvening.toFixed(1), custTotals.length, ''],
      [],
      summaryHeaders,
      ...custTotals.map((r: any, i: number) => [
        i + 1,
        r.name,
        Number(r.morningTotal.toFixed(1)),
        Number(r.eveningTotal.toFixed(1)),
        Number(r.litres.toFixed(1)),
        Number((r.litres / grandTotal * 100).toFixed(3)),
        rankMap[r.customer_id],
      ]),
      [],
      [ta ? 'மொத்தம்' : 'TOTAL', '',
       Number(grandMorning.toFixed(1)), Number(grandEvening.toFixed(1)), Number(grandTotal.toFixed(1)), '100.000', ''],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(s1Data);
    ws1['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    ];
    ws1['!cols'] = [{ wch: 7 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 13 }, { wch: 7 }];
    XLSX.utils.book_append_sheet(wb, ws1, s1Label);

    // ===================== Sheet 2: Full day-by-day register =====================
    const s2Label = ta ? 'முழு பதிவேடு' : 'Full Register';
    const s2Title = ta
      ? `${shopName} — பால் வாடா முழு பதிவேடு (${monthName} ${year})`
      : `${shopName} — Full Milk Supply Register (${monthName} ${year})`;
    const s2Sub = ta
      ? 'ஒவ்வொரு நாளும் காலை (M) மற்றும் மாலை (E) பால் அளவு — லிட்டரில்'
      : 'Daily Morning (M) and Evening (E) milk quantity in litres';

    // Header row: S.No, Name, 01/06, , 02/06, , ... Total
    const dateHeaders: string[] = [ta ? 'வ.எண்' : 'S.No', ta ? 'பெயர்' : 'Name'];
    const sessionRow: string[] = ['', ''];
    for (let d = 1; d <= daysInMonth; d++) {
      dateHeaders.push(`${pad(d)}/${pad(month)}`);
      dateHeaders.push('');
      sessionRow.push('M', 'E');
    }
    const totalLabel = ta ? `மொத்தம்\n(லி.)` : `Total\n(L)`;
    dateHeaders.push(totalLabel);
    sessionRow.push('');

    const s2Data: any[][] = [
      [s2Title],
      [s2Sub],
      dateHeaders,
      sessionRow,
    ];

    custTotals.forEach((r: any, idx: number) => {
      const row: any[] = [idx + 1, r.name];
      for (let d = 1; d <= daysInMonth; d++) {
        const iso = `${year}-${pad(month)}-${pad(d)}`;
        const e = (entries ?? []).find((x: any) => x.customer_id === r.customer_id && x.entry_date === iso);
        row.push(e?.morning_litres ? Number(e.morning_litres) : '');
        row.push(e?.evening_litres ? Number(e.evening_litres) : '');
      }
      row.push(Number(r.litres.toFixed(1)));
      s2Data.push(row);
    });

    // Totals row
    const totRow: any[] = [ta ? 'மொத்தம்' : 'TOTAL', ''];
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${pad(month)}-${pad(d)}`;
      const dayEntries = (entries ?? []).filter((e: any) => e.entry_date === iso);
      const dm = dayEntries.reduce((s: number, e: any) => s + Number(e.morning_litres || 0), 0);
      const de = dayEntries.reduce((s: number, e: any) => s + Number(e.evening_litres || 0), 0);
      totRow.push(dm > 0 ? Number(dm.toFixed(1)) : '');
      totRow.push(de > 0 ? Number(de.toFixed(1)) : '');
    }
    totRow.push(Number(grandTotal.toFixed(1)));
    s2Data.push(totRow);

    const ws2 = XLSX.utils.aoa_to_sheet(s2Data);
    // Merge title rows across all columns
    const totalCols = 2 + daysInMonth * 2 + 1;
    ws2['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    ];
    // Merge date header pairs
    for (let d = 0; d < daysInMonth; d++) {
      ws2['!merges'].push({ s: { r: 2, c: 2 + d * 2 }, e: { r: 2, c: 3 + d * 2 } });
    }
    ws2['!cols'] = [{ wch: 6 }, { wch: 28 }, ...Array(daysInMonth * 2).fill({ wch: 5 }), { wch: 9 }];
    XLSX.utils.book_append_sheet(wb, ws2, s2Label);

    // ===================== Sheet 3: Financial summary =====================
    const s3Label = ta ? 'நிதி சுருக்கம்' : 'Financials';
    const finHeaders = ta
      ? ['வ.எண்', 'குறியீடு', 'பெயர்', 'லிட்டர்', 'விலை/லி.', 'பால் ₹', 'தீவனம் ₹', 'முன்பணம் ₹', 'செலுத்த ₹']
      : ['S.No', 'Code', 'Name', 'Litres', 'Rate/L', 'Milk ₹', 'Feed ₹', 'Advance ₹', 'Payable ₹'];

    const s3Data: any[][] = [
      [shopName],
      [titleStr],
      [],
      finHeaders,
      ...rows.map((r: any, i: number) => [
        i + 1, r.code, r.name,
        Number(r.litres.toFixed(3)), r.rate,
        Math.round(r.milkAmount), Math.round(r.feed),
        Math.round(r.advanceBalance), Math.round(r.balance),
      ]),
      [],
      [ta ? 'மொத்தம்' : 'TOTAL', '', '',
       Number(totals.litres.toFixed(3)), '',
       Math.round(totals.milkAmount), Math.round(totals.feed), '', Math.round(totals.balance)],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(s3Data);
    ws3['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    ];
    ws3['!cols'] = [{ wch: 6 }, { wch: 7 }, { wch: 26 }, { wch: 11 }, { wch: 9 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws3, s3Label);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="APS_${monthName}_${year}.xlsx"`,
      },
    });

  } else {
    // --- Daily: single sheet ---
    const ta = lang === 'ta';
    const headers = ta
      ? ['குறியீடு', 'பெயர்', 'காலை', 'மாலை', 'மொத்தம் லி.', 'விலை', 'பால் ₹', 'தீவனம் ₹', 'முன்பணம் ₹']
      : ['Code', 'Name', 'Morning', 'Evening', 'Total L', 'Rate', 'Milk ₹', 'Feed ₹', 'Advance ₹'];

    const start2 = `${year}-${pad(month)}-01`;
    const end2 = `${year}-${pad(month)}-${pad(new Date(year, month, 0).getDate())}`;
    const { data: dayEntries } = await sb.from('entries').select('*')
      .eq('entry_date', date).eq('owner_id', user.id);

    const daily: any[][] = [
      [ta ? 'APS பால்பண்ணை, மூங்கிலாறு' : 'APS Milk Center, Mungilaru'],
      [ta ? `தினசரி அறிக்கை — ${date}` : `Daily Report — ${date}`],
      [],
      headers,
      ...rows.map((r: any) => {
        const e = (dayEntries ?? []).find((x: any) => x.customer_id === r.customer_id);
        return [
          r.code, r.name,
          e ? Number(e.morning_litres) : '',
          e ? Number(e.evening_litres) : '',
          Number(r.litres.toFixed(3)),
          r.rate, Math.round(r.milkAmount), Math.round(r.feed), Math.round(r.advanceGiven ?? 0),
        ];
      }),
    ];
    const ws = XLSX.utils.aoa_to_sheet(daily);
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    ];
    ws['!cols'] = [{ wch: 7 }, { wch: 26 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 7 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws, date);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="APS_${date}.xlsx"`,
      },
    });
  }
}
