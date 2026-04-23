# 🥛 APS MILK CENTER

Mobile-first Progressive Web App for daily dairy operations. Tamil + English. Runs on any phone via the browser; installs to home screen like a native app.

---

## 1. Tech stack

| Layer              | Choice                              | Why                                               |
| ------------------ | ----------------------------------- | ------------------------------------------------- |
| Framework          | **Next.js 14** (App Router)         | Server Components = fast on 2G, built-in API routes |
| UI                 | **React 18 + Tailwind CSS**          | Tiny bundle, mobile-first utility classes         |
| PWA                | **next-pwa**                         | Install-to-home-screen, offline shell             |
| DB + Auth          | **Supabase** (Postgres)              | Row-level security, free tier fits this workload  |
| State              | **Zustand** (persistent)             | Language toggle survives reloads                  |
| WhatsApp + Voice   | **Twilio** (Programmable Messaging + Voice with Polly TTS) | Tamil voice (`Polly.Aditi`, `ta-IN`) |
| Excel export       | **SheetJS (xlsx)**                   | 4-sheet monthly workbook client-side or server-side |
| PDF export         | **jsPDF + jspdf-autotable**          | Per-customer + consolidated monthly PDFs          |
| Email              | **Nodemailer**                       | Monthly report auto-mailed to admin               |
| Backup             | **Google Drive API** (OAuth refresh token) | JSON snapshot of all tables daily            |
| Hosting            | **Vercel**                           | Free, native cron jobs, GitHub auto-deploy        |

---

## 2. Database schema (in `supabase/schema.sql`)

Six tables + two triggers + RLS. Key invariants:

- `customers.advance_balance` is a **continuous running balance**. The trigger `trg_entry_advance` adds/subtracts every time an `entries.advance_amount` changes. No monthly reset.
- `inventory.current_stock` auto-decrements when an entry's `biscuit_qty` or `thivanam_qty` is created/updated, and restores on delete (trigger `trg_entry_inventory`).
- `monthly_rates` holds per-customer per-month rate overrides. If no override exists, reports fall back to `customers.default_rate`.
- RLS locks every row to `auth.uid() = owner_id` so multiple shops could in principle share one project safely.

Relationships:

```
auth.users (1) ──< customers (1) ──< entries
                               (1) ──< monthly_rates
           (1) ──< inventory  (1) ──< inventory_movements
           (1) ──< user_settings
```

---

## 3. App structure

```
aps-milk-center/
├── app/
│   ├── layout.tsx           # Top bar + bottom nav, mobile-first 520px frame
│   ├── dashboard/           # Page 1 — summary tiles
│   ├── customers/           # Page 2 — list + add
│   ├── entry/               # Page 3 — 4-tab entry (Milk/Advance/Biscuit/Thivanam)
│   ├── inventory/           # Page 4 — master stock +/-
│   ├── reports/             # Page 5 — daily/monthly with editable rate
│   ├── auth/signin/
│   └── api/
│       ├── export/excel/    # 4-sheet monthly workbook
│       ├── export/pdf/      # jsPDF tabular report
│       ├── whatsapp/send/   # Twilio WA bulk
│       ├── voice/call-all/  # Twilio TTS bulk
│       ├── backup/drive/    # Google Drive upload (CRON)
│       └── cron/monthly/    # Monthly PDF → email (CRON)
├── components/              # TopBar, BottomNav, StatTile
├── lib/
│   ├── supabase.ts          # browser/server/admin clients
│   ├── i18n.ts              # UI strings + WhatsApp/voice templates
│   └── store.ts             # language Zustand
├── supabase/schema.sql
├── middleware.ts            # auth gate
├── vercel.json              # cron schedule
└── public/manifest.json     # PWA manifest
```

Key logic highlights:

**`app/entry/page.tsx`** upserts on `(customer_id, entry_date)` so opening the same customer on the same day pre-fills the row. The DB trigger handles inventory deduction automatically — the app never does a "stock minus" calculation client-side.

**`app/reports/page.tsx`** reads monthly_rates overrides, lets you edit the per-customer rate inline (mobile-friendly number input), and persists each change via upsert to `monthly_rates`. The totals row updates live.

---

## 4. Automation — step by step

### A) WhatsApp (Twilio)

1. Sign up at twilio.com, activate the **WhatsApp Sandbox** (free, for testing): Console → Messaging → Try it out → Send a WhatsApp message. Follow the "join <code>" instructions from your phone. Your `TWILIO_WHATSAPP_FROM` for sandbox is `whatsapp:+14155238886`.
2. For production, apply for a **WhatsApp Business Sender** (Meta review, ~3–5 business days), and submit a message template in Tamil. Paste the approved sender into `TWILIO_WHATSAPP_FROM`.
3. The bulk endpoint `POST /api/whatsapp/send` loops over report rows with `whatsapp_enabled=true`.

### B) Automated Tamil voice calls (Twilio + Polly)

1. Buy a **voice-enabled Twilio number** (India needs a regulatory bundle; a US number works for outbound calls to India and is the fastest path). Put it in `TWILIO_VOICE_FROM`.
2. The endpoint `POST /api/voice/call-all` builds inline TwiML with `<Say voice="Polly.Aditi" language="ta-IN">…</Say>` — Tamil neural voice, no audio file needed.
3. Schedule **10:00** (morning) and **20:00** (evening) with a free service like **cron-job.org**. Target:
   ```
   POST https://<your-app>.vercel.app/api/voice/call-all
   Headers: Content-Type: application/json
   Body:    {"session":"morning","lang":"ta","cron_secret":"<CRON_SECRET>","owner_id":"<your-user-id>"}
   ```
   (Vercel's built-in cron does not send request bodies, so for dynamic body use cron-job.org, EasyCron, or GitHub Actions `schedule`.)

### C) Excel exports (SheetJS)

- `POST /api/export/excel` produces either a single-sheet daily workbook or a **4-sheet monthly workbook** (Summary / Milk Total / Thivanam Total / Advance Total) matching the spec.
- Response is `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with `Content-Disposition: attachment`, so the browser downloads it directly on mobile.

### D) Google Drive backup (daily)

1. In Google Cloud Console → create an OAuth 2.0 Desktop client → copy `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`.
2. Get a refresh token (one-time): use the OAuth Playground ( https://developers.google.com/oauthplayground ), set scope `https://www.googleapis.com/auth/drive.file`, authorize, exchange for tokens. Paste `refresh_token` into `GOOGLE_REFRESH_TOKEN`.
3. Create a folder in Drive and copy its ID (from the URL) into `GOOGLE_DRIVE_FOLDER_ID`.
4. `vercel.json` runs `/api/backup/drive` every day at 17:30 UTC = 23:00 IST. Vercel cron sends `Authorization: Bearer $CRON_SECRET` automatically when you set the `CRON_SECRET` env var.

### E) Monthly PDF auto-email

- `vercel.json` runs `/api/cron/monthly` at `0 3 1 * *` = 03:00 UTC on the 1st of each month.
- The route pulls last month's data for every user who has `user_settings.admin_email` set, builds a jsPDF with jspdf-autotable, and emails it via Nodemailer.
- For Gmail: enable 2-Step Verification on the sending account, create an **App Password**, use it as `SMTP_PASS`.

**Tamil glyphs in PDF:** the default jsPDF fonts don't ship Tamil. To render Tamil correctly, download `NotoSansTamil-Regular.ttf`, convert with jsPDF's `fontconverter` tool, then in the route do `doc.addFileToVFS('NotoSansTamil.ttf', base64); doc.addFont('NotoSansTamil.ttf','NotoSansTamil','normal'); doc.setFont('NotoSansTamil');`. Left as an enhancement — current PDFs use English labels + customer names in Tamil Unicode which render in most PDF viewers.

---

## 5. Local setup

```bash
# 1. Install
npm install

# 2. Configure Supabase
# - Create a project at supabase.com
# - SQL Editor → paste contents of supabase/schema.sql → Run
# - Authentication → Users → invite yourself by email (set a password)

# 3. Create .env.local
cp .env.example .env.local
# fill in SUPABASE + Twilio + Google + SMTP values

# 4. Run
npm run dev
# open http://localhost:3000 on your phone (same Wi-Fi) via your machine's LAN IP
```

---

## 6. Deployment (GitHub → Vercel)

**One-time:**

```bash
cd aps-milk-center
git init
git add .
git commit -m "Initial APS MILK CENTER build"
# create an empty repo on github.com called aps-milk-center
git remote add origin https://github.com/<you>/aps-milk-center.git
git branch -M main
git push -u origin main
```

**Vercel:**

1. Go to vercel.com → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected).
3. Environment Variables: paste everything from `.env.local` (both `NEXT_PUBLIC_*` and server-only keys).
4. Click **Deploy**. First build takes ~90 seconds.
5. After deploy, go to **Project Settings → Cron Jobs** and confirm the two jobs from `vercel.json` are listed.
6. Open the production URL on your phone → Chrome menu → **Install app** (or Safari → Share → Add to Home Screen). You now have a launcher icon.

**Every push to `main` auto-deploys.** Preview URLs for pull requests come for free.

**Custom domain (optional):** Vercel → Domains → add `app.apsmilkcenter.com` (or any domain you own). Free SSL included.

---

## 7. First-run checklist inside the app

1. Sign in.
2. **Inventory** page → set opening stock (e.g., `100` for thivanam, `30` for biscuit). The low-stock warning is at ≤5.
3. **Customers** → add each customer. Set `default_rate` to whatever ₹/L you pay them (e.g., 60).
4. **Add Entry** → pick customer, today, fill morning/evening L + any biscuit/thivanam/advance → Save.
5. **Reports** → pick the month → edit any rates that changed that month → WhatsApp / Excel / PDF / Call All.

---

## 8. What you might want to add later

- **Offline entry queue** (IndexedDB → replay on reconnect). The PWA shell is already cached.
- **Bulk entry mode** (enter morning milk for all customers in one scroll, common at 6 AM).
- **Per-customer history chart** on customer detail page.
- **SMS fallback** when WhatsApp sending fails (same Twilio account).
- **Tamil-fonted PDFs** (see §4.E note).

---

Built for speed on a phone in dim dawn light. Stay caffeinated. 🥛
