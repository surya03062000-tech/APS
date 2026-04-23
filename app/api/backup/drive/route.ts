import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { createAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  // Protect this route - only callable with CRON_SECRET
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdmin();
  const [customers, entries, inventory, monthlyRates] = await Promise.all([
    admin.from('customers').select('*'),
    admin.from('entries').select('*'),
    admin.from('inventory').select('*'),
    admin.from('monthly_rates').select('*'),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    customers:    customers.data,
    entries:      entries.data,
    inventory:    inventory.data,
    monthly_rates: monthlyRates.data,
  };

  // OAuth2 with refresh token → Drive v3 upload
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const drive = google.drive({ version: 'v3', auth: oauth2 });

  const filename = `aps_backup_${new Date().toISOString().slice(0,10)}.json`;
  const content = JSON.stringify(payload, null, 2);

  const file = await drive.files.create({
    requestBody: {
      name: filename,
      mimeType: 'application/json',
      parents: process.env.GOOGLE_DRIVE_FOLDER_ID ? [process.env.GOOGLE_DRIVE_FOLDER_ID] : undefined,
    },
    media: {
      mimeType: 'application/json',
      body: Readable.from([content]),
    },
    fields: 'id, webViewLink',
  });

  return NextResponse.json({
    message: 'Backup uploaded',
    fileId: file.data.id,
    link:   file.data.webViewLink,
  });
}
