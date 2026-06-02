'use client';
import { useState, useRef } from 'react';
import { Mic, MicOff, Check, X } from 'lucide-react';
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
  continuous?: boolean;
}

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
  t = t.replace(/\s+/g, ' ').trim();
  const match = t.match(/[\d.]+/);
  return match ? match[0] : '';
}

function detectSession(text: string): 'morning' | 'evening' | null {
  const t = text.toLowerCase();
  if (/காலை|morning|am\b/.test(t)) return 'morning';
  if (/மாலை|evening|pm\b/.test(t)) return 'evening';
  return null;
}

function detectField(text: string): ParsedCommand['field'] | null {
  const t = text.toLowerCase();
  if (/advance|முன்பணம்|அட்வான்ஸ்/.test(t)) return 'advance_amount';
  if (/biscuit|பிஸ்கட்/.test(t)) return 'biscuit_qty';
  if (/thivanam|தீவனம்|feed|cattle/.test(t)) return 'thivanam_qty';
  return null;
}

function matchCustomer(text: string, customers: Customer[]): Customer | undefined {
  const t = text.toLowerCase();
  const codeMatch = t.match(/\b(\d+)\b/);
  if (codeMatch) {
    const byCode = customers.find(c => String(c.code) === codeMatch[1]);
    if (byCode) return byCode;
  }
  let best: Customer | undefined;
  let bestLen = 0;
  for (const c of customers) {
    const words = c.name.toLowerCase().split(/\s+/);
    const matched = words.filter(w => w.length > 2 && t.includes(w));
    if (matched.length > 0 && matched.join('').length > bestLen) {
      bestLen = matched.join('').length;
      best = c;
    }
  }
  return best;
}

export function parseVoiceCommand(transcript: string, customers: Customer[]): ParsedCommand {
  const raw = transcript;
  const text = transcript.toLowerCase();
  const customer = matchCustomer(text, customers);
  const session = detectSession(text);
  const nonMilkField = detectField(text);

  let field: ParsedCommand['field'] | undefined;
  if (nonMilkField) field = nonMilkField;
  else if (session === 'morning') field = 'morning_litres';
  else if (session === 'evening') field = 'evening_litres';

  const numStr = wordsToNumber(transcript);
  const value = numStr ? parseFloat(numStr) : undefined;
  return { customer, session: session ?? undefined, field, value, raw };
}

export default function SmartVoiceEntry({ lang, customers, onParsed, continuous = false }: Props) {
  const [state, setState] = useState<'idle' | 'listening' | 'confirm' | 'ok' | 'error'>('idle');
  const [hint, setHint]   = useState('');
  const [pending, setPending] = useState<ParsedCommand | null>(null);
  const recRef = useRef<any>(null);

  const buildHint = (cmd: ParsedCommand) => {
    let msg = '';
    if (cmd.customer) msg += cmd.customer.name + ' · ';
    if (cmd.session) msg += (cmd.session === 'morning' ? (lang === 'ta' ? 'காலை' : 'Morning') : (lang === 'ta' ? 'மாலை' : 'Evening')) + ' · ';
    if (cmd.value !== undefined) msg += cmd.value + (lang === 'ta' ? ' லிட்டர்' : ' L');
    return msg.trim();
  };

  const listen = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setHint(lang === 'ta' ? 'Browser voice ஆதரிக்கவில்லை' : 'Browser does not support voice');
      setState('error');
      setTimeout(() => setState('idle'), 2500);
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
      let best: ParsedCommand | null = null;
      for (let i = 0; i < e.results[0].length; i++) {
        const parsed = parseVoiceCommand(e.results[0][i].transcript, customers);
        if (!best || (parsed.customer && !best.customer) || (parsed.value && !best.value)) best = parsed;
      }

      if (best && (best.customer || best.value)) {
        const h = buildHint(best);
        setHint(h);
        setPending(best);
        setState('confirm'); // Show confirmation before saving
      } else {
        setState('error');
        setHint(lang === 'ta' ? 'புரியவில்லை, மீண்டும் சொல்லுங்கள்' : 'Not understood, try again');
        setTimeout(() => { setState('idle'); setHint(''); }, 2500);
      }
    };

    rec.onerror = (e: any) => {
      setState('error');
      setHint(lang === 'ta' ? 'குரல் பிழை' : `Error: ${e.error}`);
      setTimeout(() => { setState('idle'); setHint(''); }, 2000);
    };

    rec.start();
  };

  const confirmSave = () => {
    if (!pending) return;
    onParsed(pending);
    setState('ok');
    setHint(buildHint(pending));
    setPending(null);
    setTimeout(() => {
      setState('idle');
      setHint('');
      // In continuous mode, auto-listen for next entry
      if (continuous) setTimeout(listen, 800);
    }, 1500);
  };

  const cancelConfirm = () => {
    setPending(null);
    setState('idle');
    setHint('');
  };

  const stop = () => { recRef.current?.stop(); setState('idle'); setHint(''); };

  const colors = {
    idle:     'bg-gold-400 text-white shadow-lg',
    listening:'bg-red-500 text-white shadow-lg animate-pulse',
    confirm:  'bg-blue-500 text-white shadow-lg',
    ok:       'bg-leaf-600 text-white shadow-lg',
    error:    'bg-orange-500 text-white shadow-lg',
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {state === 'idle' && !hint && (
        <p className="text-xs text-ink/40 text-center">
          {lang === 'ta' ? '🎤 "சூர்யா காலை 22 லிட்டர்" என்று சொல்லுங்கள்' : '🎤 Say "Surya morning 22 litres"'}
        </p>
      )}

      <button type="button"
        onClick={state === 'listening' ? stop : (state === 'idle' || state === 'error') ? listen : undefined}
        className={`tap w-16 h-16 rounded-full flex items-center justify-center transition-all ${colors[state]}`}>
        {state === 'listening' ? <MicOff size={28} /> : <Mic size={28} />}
      </button>

      {state === 'listening' && (
        <p className="text-xs text-red-500 font-medium animate-pulse">
          {lang === 'ta' ? '🔴 கேட்கிறது… பேசுங்கள்' : '🔴 Listening… speak now'}
        </p>
      )}

      {/* Confirmation prompt */}
      {state === 'confirm' && pending && (
        <div className="w-full bg-blue-50 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800 text-center">
            {lang === 'ta' ? '✓ சரியா?' : '✓ Is this correct?'}
          </p>
          <p className="text-base font-bold text-center text-blue-900">{hint}</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={cancelConfirm}
              className="tap rounded-xl border border-blue-200 text-blue-700 font-semibold flex items-center justify-center gap-1">
              <X size={16} /> {lang === 'ta' ? 'இல்ல' : 'No'}
            </button>
            <button type="button" onClick={confirmSave}
              className="tap rounded-xl bg-leaf-700 text-white font-semibold flex items-center justify-center gap-1">
              <Check size={16} /> {lang === 'ta' ? 'ஆமா, சேமி' : 'Yes, Save'}
            </button>
          </div>
        </div>
      )}

      {(state === 'ok' || state === 'error') && hint && (
        <div className={`flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full
          ${state === 'ok' ? 'bg-leaf-50 text-leaf-700' : 'bg-red-50 text-red-600'}`}>
          {state === 'ok' ? '✅ ' : '❌ '}{hint}
        </div>
      )}

      {continuous && state === 'idle' && (
        <p className="text-xs text-ink/40">
          {lang === 'ta' ? '🔁 தொடர் பதிவு முறை' : '🔁 Continuous mode — next customer auto-listens'}
        </p>
      )}
    </div>
  );
}
