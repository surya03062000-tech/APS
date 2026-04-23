import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mode, year, month, date, rows, totals, lang } = body;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Header
  const title = lang === 'ta' ? 'APS பால்பண்ணை, மூங்கிலாறு' : 'APS MILK CENTER, Mungilaru';
  const period = mode === 'monthly'
    ? `${String(month).padStart(2,'0')}/${year}`
    : date;

  doc.setFontSize(16);
  // Note: bundled PDF fonts don't render Tamil glyphs well. To ship with full
  // Tamil rendering, register "NotoSansTamil" as a VFS font — see README.
  doc.text(mode === 'monthly' ? 'APS MILK CENTER — Monthly Report' : 'APS MILK CENTER — Daily Report', 105, 15, { align:'center' });
  doc.setFontSize(11);
  doc.text(`Period: ${period}`, 105, 22, { align: 'center' });

  autoTable(doc, {
    startY: 30,
    head: [['Code', 'Name', 'Litres', 'Rate', 'Milk ₹', 'Feed ₹', 'Adv Bal ₹', 'Payable ₹']],
    body: rows.map((r: any) => [
      r.code, r.name,
      r.litres.toFixed(3), r.rate.toFixed(2),
      Math.round(r.milkAmount), Math.round(r.feed),
      Math.round(r.advanceBalance), Math.round(r.balance),
    ]),
    foot: [[
      '', 'TOTAL',
      totals.litres.toFixed(3), '',
      Math.round(totals.milkAmount), Math.round(totals.feed), '', Math.round(totals.balance),
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [232, 178, 74] },
    footStyles: { fillColor: [255, 248, 225], textColor: 20, fontStyle: 'bold' },
  });

  const buf = Buffer.from(doc.output('arraybuffer'));
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="APS_${mode}_${year}_${month || date}.pdf"`,
    },
  });
}
