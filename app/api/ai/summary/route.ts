import { NextRequest, NextResponse } from 'next/server';
import { createServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const sb = createServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lang } = await req.json().catch(() => ({ lang: 'ta' }));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: lang === 'ta'
        ? 'AI அமைக்கப்படவில்லை. ANTHROPIC_API_KEY env variable சேர்க்கவும்.'
        : 'AI not configured. Add ANTHROPIC_API_KEY env variable.',
    }, { status: 500 });
  }

  // Gather this month + last month data
  const now = new Date();
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);

  const [{ data: customers }, { data: entries }] = await Promise.all([
    sb.from('customers').select('id, name, advance_balance'),
    sb.from('entries').select('*').gte('entry_date', lastStart),
  ]);

  const litresOf = (e: any) => Number(e.morning_litres) + Number(e.evening_litres);
  const thisMonth = (entries ?? []).filter(e => e.entry_date >= thisStart);
  const lastMonth = (entries ?? []).filter(e => e.entry_date < thisStart);

  const stats = {
    thisMonthLitres: thisMonth.reduce((s, e) => s + litresOf(e), 0).toFixed(1),
    lastMonthLitres: lastMonth.reduce((s, e) => s + litresOf(e), 0).toFixed(1),
    customers: customers?.length ?? 0,
    totalOutstanding: (customers ?? []).reduce((s, c) => s + Math.max(0, Number(c.advance_balance)), 0),
    topCustomers: (customers ?? []).slice(0, 3).map(c => c.name).join(', '),
  };

  const prompt = `You are a dairy business assistant. Write a SHORT 3-4 sentence summary ${lang === 'ta' ? 'in Tamil' : 'in English'} of this milk center's performance. Be encouraging and practical.

Data:
- This month milk: ${stats.thisMonthLitres} L
- Last month milk: ${stats.lastMonthLitres} L
- Total customers: ${stats.customers}
- Total outstanding balance to collect: ₹${stats.totalOutstanding}

Write naturally, mention the trend (up/down), and one actionable tip.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const j = await res.json();
    const summary = j?.content?.[0]?.text ?? 'No summary generated';
    return NextResponse.json({ summary });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
