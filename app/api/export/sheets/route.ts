import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createServer } from '@/lib/supabase-server';

// Google Sheets sync (Feature #49)
// Reuses the same Google OAuth refresh token as the Drive backup.
export async function POST(req: NextRequest) {
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { rows, lang, year, month } = await req.json();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientId || !clientSecret || !refreshToken || !sheetId) {
    return NextResponse.json({
      error: lang === 'ta'
        ? 'Google Sheets அமைக்கப்படவில்லை. GOOGLE_SHEET_ID env சேர்க்கவும்.'
        : 'Google Sheets not configured. Add GOOGLE_SHEET_ID + OAuth env vars.',
    }, { status: 500 });
  }

  try {
    const auth = new google.auth.OAuth2(clientId, clientSecret);
    auth.setCredentials({ refresh_token: refreshToken });
    const sheets = google.sheets({ version: 'v4', auth });

    const tabName = `${year}-${String(month).padStart(2, '0')}`;
    const values = [
      ['Code', 'Name', 'Litres', 'Rate', 'Milk ₹', 'Feed ₹', 'Adv Bal ₹', 'Payable ₹'],
      ...(rows ?? []).map((r: any) => [
        r.code, r.name, r.litres.toFixed(3), r.rate,
        Math.round(r.milkAmount), Math.round(r.feed),
        Math.round(r.advanceBalance), Math.round(r.balance),
      ]),
    ];

    // Ensure sheet/tab exists, then overwrite values
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: tabName } } }] },
      });
    } catch { /* tab already exists */ }

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tabName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return NextResponse.json({
      message: lang === 'ta'
        ? `Google Sheets-க்கு ${rows?.length ?? 0} வரிசைகள் ஒத்திசைக்கப்பட்டது ✅`
        : `Synced ${rows?.length ?? 0} rows to Google Sheets ✅`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
