'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, X } from 'lucide-react';
import { createBrowser } from '@/lib/supabase';
import { useLang } from '@/lib/store';
import type { Customer } from '@/types';

export default function CustomersPage() {
  const { lang } = useLang();
  const sb = createBrowser();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');

  // Swipe state
  const touchStart = useRef<number>(0);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  useEffect(() => {
    sb.from('customers').select('*').order('code').then(({ data }) => setCustomers(data ?? []));
  }, []);

  const filtered = customers.filter(c =>
    !query || c.name.toLowerCase().includes(query.toLowerCase()) || String(c.code).includes(query)
  );

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    touchStart.current = e.touches[0].clientX;
    if (swipedId && swipedId !== id) setSwipedId(null);
  };
  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 60) setSwipedId(id);       // swipe left → reveal actions
    else if (diff < -30) setSwipedId(null);
  };

  return (
    <section className="pt-3">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-xl font-bold">
          {lang === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Customers'}
        </h1>
        <Link href="/customers/new"
          className="tap px-4 rounded-full bg-gold-400 text-white font-semibold flex items-center gap-1">
          <Plus size={18} /> {lang === 'ta' ? 'புதிய' : 'New'}
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
        <input
          type="text"
          placeholder={lang === 'ta' ? 'பெயர் அல்லது குறியீடு தேடு…' : 'Search name or code…'}
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="tap w-full rounded-xl border border-gold-400/30 bg-white pl-9 pr-9 focus:border-gold-400 focus:outline-none text-sm"
        />
        {query && (
          <button onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40">
            <X size={15} />
          </button>
        )}
      </div>

      <ul className="space-y-2">
        {filtered.map(c => (
          <li key={c.id} className="relative overflow-hidden rounded-2xl">
            {/* Swipe action buttons (revealed on left swipe) */}
            <div className="absolute inset-y-0 right-0 flex">
              <a href={`tel:${c.phone}`}
                className="w-16 bg-leaf-700 text-white flex items-center justify-center text-xs font-bold">
                {lang === 'ta' ? 'அழை' : 'Call'}
              </a>
              <Link href={`/customers/${c.id}/edit`}
                className="w-16 bg-gold-400 text-white flex items-center justify-center text-xs font-bold">
                {lang === 'ta' ? 'திருத்து' : 'Edit'}
              </Link>
            </div>

            {/* Card — slides left on swipe */}
            <Link
              href={swipedId === c.id ? '#' : `/customers/${c.id}`}
              onClick={e => swipedId === c.id && e.preventDefault()}
              onTouchStart={e => handleTouchStart(e, c.id)}
              onTouchEnd={e => handleTouchEnd(e, c.id)}
              style={{ transform: swipedId === c.id ? 'translateX(-128px)' : 'none' }}
              className="swipe-reveal flex items-center gap-3 p-3 bg-white shadow-card relative z-10">
              <span className="w-10 h-10 rounded-full bg-gold-50 text-gold-700 font-bold grid place-items-center flex-shrink-0">
                {c.code}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{c.name}</p>
                <p className="text-xs text-ink/50 truncate">{c.phone ?? '—'}</p>
              </div>
              <span className={`text-sm font-semibold flex-shrink-0 ${Number(c.advance_balance) > 0 ? 'text-red-600' : 'text-leaf-700'}`}>
                ₹{Number(c.advance_balance).toLocaleString('en-IN')}
              </span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-center text-ink/50 py-10">
            {query ? (lang === 'ta' ? 'யாரும் இல்லை' : 'No match') : (lang === 'ta' ? 'வாடிக்கையாளர் இல்லை' : 'No customers yet.')}
          </li>
        )}
      </ul>

      {customers.length > 0 && (
        <p className="text-xs text-center text-ink/40 mt-3">
          {lang === 'ta' ? `${filtered.length} / ${customers.length} வாடிக்கையாளர்கள்` : `${filtered.length} / ${customers.length} customers`}
          {lang === 'ta' ? ' · இடதுபுறம் சுரக்கவும்' : ' · Swipe left for quick actions'}
        </p>
      )}
    </section>
  );
}
