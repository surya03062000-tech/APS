# APS MILK CENTER

Mobile-first Progressive Web App for daily dairy operations. Tamil + English. Installs to home screen like a native app.

---

## Tech Stack

| Layer       | Choice                                         |
|-------------|------------------------------------------------|
| Framework   | Next.js 14 App Router (TypeScript)             |
| Database    | Supabase (PostgreSQL + Row-Level Security)     |
| Auth        | Supabase Auth (email/password + magic link)    |
| Styling     | Tailwind CSS + Noto Sans Tamil font            |
| State       | Zustand with persist (lang, dark, pin, staff)  |
| Voice       | Web Speech API (ta-IN / en-IN)                 |
| SMS/Call    | Twilio (Programmable Voice + WhatsApp + SMS)   |
| Email       | Nodemailer (Gmail SMTP)                        |
| PDF         | HTML print page (browser native, Tamil-safe)   |
| Excel       | xlsx (3-sheet bilingual workbook)              |
| AI          | Anthropic Claude Haiku (monthly summary)       |
| Cron        | Vercel Cron Jobs                               |
| Deploy      | Vercel                                         |

---

## Features

- **Voice entry** — say "Surya morning 22 litres" → auto-fill + save
- **Bilingual** — Tamil / English, switchable per session
- **Dashboard** — today's entry status (green = done, red = missing), outstanding balance widget
- **Reports** — monthly & daily, Excel (3 sheets) + styled HTML-print PDF
- **Per-customer PDF** — two-column daily table (first half / second half), financial summary, signatures
- **WhatsApp** — bulk monthly summary, individual summary via wa.me
- **Voice calls** — Twilio calls each customer with Tamil TTS (Polly.Aditi): litres, rate, milk amount, balance
- **SMS fallback** — for customers not on WhatsApp
- **Analytics** — monthly comparison chart, 14-day trend, top 5 customers, AI summary
- **PIN lock** — 4-digit PIN overlay, auto-locks on tab hide / 30-min idle
- **Staff mode** — hides Reports & Analytics, entry-only
- **Dark mode** — full dark theme
- **PWA** — installable, offline shell, home-screen shortcuts (Morning Entry, Evening Entry, Reports)
- **Rate history** — auto-logged on every rate change
- **Login activity log** — last 20 logins with IP

---

## Project Structure

```
app/
  (main)/           ← Main app pages (has TopBar + BottomNav)
    dashboard/
    customers/
    entry/
    inventory/
    analytics/
    profile/
    reports/
    layout.tsx      ← TopBar, BottomNav, PinLock, Toast, etc.
  auth/             ← Sign-in / reset-password (no nav)
  reports/
    print/          ← Standalone print pages (no nav — clean PDF via browser print)
      monthly/
      customer/[id]/
  api/              ← API routes
layout.tsx          ← Root: html/body/fonts only (no nav)
```

---

## Environment Variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (cron/admin) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_VOICE_FROM` | Twilio phone number for calls (e.g. +1xxxxxxxxxx) |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+14155238886` (sandbox) |
| `TWILIO_SMS_FROM` | Twilio phone number for SMS |
| `CRON_SECRET` | Random string to protect cron endpoints |
| `ANTHROPIC_API_KEY` | Claude Haiku for AI monthly summary |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Drive/Sheets) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Google refresh token |
| `GOOGLE_SHEET_ID` | Target Google Sheet for sync |
| `GMAIL_USER` | Gmail address for daily email |
| `GMAIL_PASS` | Gmail app password |

---

## Supabase Setup

Run `supabase/schema-additions.sql` in the Supabase SQL Editor after initial schema:
- `login_activity` table (login history)
- `rate_history` table + trigger (auto-logs rate changes)
- `entry-photos` storage bucket
- `role` and `shop_name_ta` columns on `user_settings`
- Performance indexes on `entries`

---

## Reports

### Excel (3 sheets — Tamil or English based on app language)
| Sheet | Content |
|-------|---------|
| சுருக்கம் / Summary | Grand totals, per-customer morning/evening totals, rank |
| முழு பதிவேடு / Full Register | Day-by-day M/E columns for every customer |
| நிதி சுருக்கம் / Financials | Rate, milk ₹, feed ₹, advance ₹, payable ₹ |

### PDF (browser print)
- **Monthly all-customers** — Reports page → "அழகான மாதாந்திர அறிக்கை (PDF)"
- **Per-customer statement** — Customer page → PDF button
- Both open a clean print page (no app nav), click Print → Save as PDF

---

## Twilio Setup

1. Get **Account SID** + **Auth Token** from console.twilio.com
2. Buy a phone number (Voice + SMS capabilities)
3. WhatsApp sandbox: Messaging → Try it out → customers send `join <code>` to `+14155238886`
4. Add env vars to Vercel and redeploy
5. Trial accounts: add customer numbers as Verified Caller IDs before calling
