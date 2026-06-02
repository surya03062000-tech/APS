'use client';
import { useState, useRef } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import type { Lang } from '@/lib/i18n';
import type { Customer } from '@/types';

export interface ParsedCommand {
  customer?: Customer;
  session?: 'morning' | 'evening';
  field?: 'morning_litres' | 'evening_litres' | 'advance_amount' | 'biscuit_qty' | 'biscuit_amount' | 'thivanam_qty' | 'thivanam_amount';
  value?: number;
  raw: string;
}

interface Props {
  lang: Lang;
  customers: Customer[];
  onParsed: (cmd: ParsedCommand) => void;
}

// ─── Number word → digit ───────────────────────────────────────────────────
function wordsToNumber(text: string): string {
  const tamilDigits: Record<string, number | string> = {
    'ஒன்று': 1, 'ஒன்': 1, 'இரண்டு': 2, 'இரண்': 2,
    'மூன்று': 3, 'மூன்': 3, 'நான்கு': 4, 'நான்': 4,
    'ஐந்து': 5, 'ஐந்': 5, 'ஆறு': 6, 'ஏழு': 7,
    'எட்டு': 8, 'எட்': 8, 'ஒன்பது': 9, 'பத்து': 10,
    'இருபது': 20, 'முப்பது': 30, 'நாற்பது': 40,
    'ஐம்பது': 50, 'அறுபது': 60, 'எழுபது': 70,
    'எண்பது': 80, 'தொண்ணூறு': 90, 'நூறு': 100,
    'புள்ளி': '.', 'பாயிண்ட்': '.', 'டாட்': '.',
  };
  const enDigits: Record<string, number | string> = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
    'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
    'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
    'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
    'eighty': 80, 'ninety': 90, 'hundred': 100,
    'point': '.', 'dot': '.',
  };

  let t = text;
  for (const [w, d] of Object.entries(tamilDigits)) t = t.replace(new RegExp(w, 'g'), ` ${d} `);
  for (const [w, d] of Object.entries(enDigits)) t = t.replace(new RegExp(`\\b${w}\\b`, 'gi'), ` ${d} `);

  // Collapse spaces and extract number
  t = t.replace(/\s+/g, ' ').trim();
  const match = t.match(/[\d.]+/);
  return match ? match[0] : '';
}

// ─── Session detection ─────────────────────────────────────────────────────
function detectSession(text: string): 'morning' | 'evening' | null {
  const t = text.toLowerCase();
  if (/காலை|morning|am\b|காலை/.test(t)) return 'morning';
  if (/மாலை|evening|pm\b|மாலை/.test(t)) return 'evening';
  return null;
}

// ─── Field detection (beyond milk) ────────────────────────────────────────
function detectField(text: string): ParsedCommand['field'] | null {
  const t = text.toLowerCase();
  if (/advance|முன்பணம்|முன்|அட்வான்ஸ்/.test(t)) return 'advance_amount';
  if (/biscuit|பிஸ்கட்/.test(t)) return 'biscuit_qty';
  if (/thivanam|தீவனம்|feed|cattle/.test(t)) return 'thivanam_qty';
  return null; // default = milk (morning/evening)
}

// ─── Customer match ────────────────────────────────────────────────────────
function matchCustomer(text: string, customers: Customer[]): Customer | undefined {
  const t = text.toLowerCase();

  // Exact code match (digits in speech)
  const codeMatch = t.match(/\b(\d+)\b/);
  if (codeMatch) {
    const byCode = customers.find(c => c.code === codeMatch[1]);
    if (byCode) return byCode;
  }

  // Name partial match (longest match wins)
  let best: Customer | undefined;
  let bestLen = 0;
  for (const c of customers) {
    const name = c.name.toLowerCase();
    // Check if any word from name appears in transcript
    const words = name.split(/\s+/);
    const matched = words.filter(w => w.length > 2 && t.includes(w));
    if (matched.length > 0 && matched.join('').length > bestLen) {
      bestLen = matched.join('').length;
      best = c;
    }
  }
  return best;
}

// ─── Main parser ───────────────────────────────────────────────────────────
export function parseVoiceCommand(transcript: string, customers: Customer[]): ParsedCommand {
  const raw = transcript;
  const text = transcript.toLowerCase();

  const customer = matchCustomer(text, customers);
  const session  = detectSession(text);
  const nonMilkField = detectField(text);

  // Determine field
  let field: ParsedCommand['field'] | undefined;
  if (nonMilkField) {
    field = nonMilkField;
  } else if (session === 'morning') {
    field = 'morning_litres';
  } else if (session === 'evening') {
    field = 'evening_litres';
  }

  // Extract value — prefer numbers that appear after session/field keywords
  const numStr = wordsToNumber(transcript);
  const value = numStr ? parseFloat(numStr) : undefined;

  return { customer, session: session ?? undefined, field, value, raw };
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function SmartVoiceEntry({ lang, customers, onParsed }: Props) {
  const [state, setState] = useState<'idle' | 'listening' | 'ok' | 'error'>('idle');
  const [hint, setHint]   = useState<string>('');
  const recRef = useRef<any>(null);

  const listen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setHint(lang === 'ta' ? 'இந்த browser voice ஆதரிக்கவில்லை' : 'Browser does not support voice');
      setState('error');
      return;
    }

    const rec = new SR();
    recRef.current = rec;
    rec.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 3;

    rec.onstart = () => { setState('listening'); setHint(''); };

    rec.onresult = (e: any) => {
      // Try all alternatives for best parse
      let best: ParsedCommand | null = null;
      for (let i = 0; i < e.results[0].length; i++) {
        const t = e.results[0][i].transcript;
        const parsed = parseVoiceCommand(t, customers);
        if (!best || (parsed.customer && !best.customer) || (parsed.value && !best.value)) {
          best = parsed;
        }
      }

      if (best && (best.customer || best.value)) {
        setState('ok');
        let msg = '';
        if (best.customer) msg += best.customer.name + ' ';
        if (best.session) msg += (best.session === 'morning' ? (lang==='ta'?'காலை':'Morning') : (lang==='ta'?'மாலை':'Evening')) + ' ';
        if (best.value !== undefined) msg += best.value + (lang==='ta'?' லிட்டர்':' L');
        setHint(msg.trim());
        onParsed(best);
      } else {
        setState('error');
        setHint(lang === 'ta' ? 'புரியவில்லை, மீண்டும் சொல்லுங்கள்' : 'Not understood, try again');
      }
      setTimeout(() => { setState('idle'); setHint(''); }, 2500);
    };

    rec.onerror = (e: any) => {
      setState('error');
      setHint(lang === 'ta' ? 'குரல் பிழை' : `Error: ${e.error}`);
      setTimeout(() => { setState('idle'); setHint(''); }, 2000);
    };

    rec.start();
  };

  const stop = () => { recRef.current?.stop(); setState('idle'); setHint(''); };

  const colors = {
    idle:      'bg-gold-400 text-white shadow-lg',
    listening: 'bg-red-500 text-white shadow-red-300 shadow-lg animate-pulse',
    ok:        'bg-leaf-600 text-white shadow-lg',
    error:     'bg-orange-500 text-white shadow-lg',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Hint text example */}
      {state === 'idle' && !hint && (
        <p className="text-xs text-ink/40 text-center">
          {lang === 'ta'
            ? '🎤 "சூர்யா காலை 22 லிட்டர்" என்று சொல்லுங்கள்'
            : '🎤 Say "Surya morning 22 litres"'}
        </p>
      )}

      {/* Big mic button */}
      <button
        type="button"
        onClick={state === 'listening' ? stop : listen}
        className={`tap w-16 h-16 rounded-full flex items-center justify-center transition-all ${colors[state]}`}
      >
        {state === 'listening' ? <MicOff size={28} /> : <Mic size={28} />}
      </button>

      {/* Status / result hint */}
      {hint && (
        <div className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full
          ${state === 'ok' ? 'bg-leaf-50 text-leaf-700' :
            state === 'error' ? 'bg-red-50 text-red-600' : 'text-ink/60'}`}>
          {state === 'ok' && '✅ '}
          {state === 'error' && '❌ '}
          {hint}
        </div>
      )}

      {state === 'listening' && (
        <p className="text-xs text-red-500 font-medium animate-pulse">
          {lang === 'ta' ? '🔴 கேட்கிறது… பேசுங்கள்' : '🔴 Listening… speak now'}
        </p>
      )}
    </div>
  );
}
