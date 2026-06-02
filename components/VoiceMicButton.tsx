'use client';
import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import type { Lang } from '@/lib/i18n';

interface Props {
  lang: Lang;
  onValue: (val: string) => void;
}

// Convert spoken Tamil/English words to a number string
function parseSpokenNumber(transcript: string): string {
  let t = transcript.trim().toLowerCase();

  // Tamil word → digit mapping
  const tamilMap: Record<string, string> = {
    'ஒன்று': '1', 'ஒன்': '1',
    'இரண்டு': '2', 'இரண்': '2',
    'மூன்று': '3', 'மூன்': '3',
    'நான்கு': '4', 'நான்': '4',
    'ஐந்து': '5', 'ஐந்': '5',
    'ஆறு': '6',
    'ஏழு': '7',
    'எட்டு': '8', 'எட்': '8',
    'ஒன்பது': '9', 'ஒன்ப': '9',
    'பத்து': '10',
    'புள்ளி': '.',
    'பாயிண்ட்': '.',
  };

  // Replace Tamil words
  for (const [word, digit] of Object.entries(tamilMap)) {
    t = t.replace(new RegExp(word, 'g'), digit);
  }

  // English word-to-digit
  const enMap: Record<string, string> = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'point': '.', 'dot': '.', 'decimal': '.',
  };
  for (const [word, digit] of Object.entries(enMap)) {
    t = t.replace(new RegExp(`\\b${word}\\b`, 'g'), digit);
  }

  // Remove spaces between digits/dots
  t = t.replace(/\s+/g, '');

  // Extract first valid number-like string
  const match = t.match(/[\d.]+/);
  return match ? match[0] : '';
}

export default function VoiceMicButton({ lang, onValue }: Props) {
  const [state, setState] = useState<'idle' | 'listening' | 'error'>('idle');
  const recRef = useRef<any>(null);

  const start = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
      return;
    }

    const rec = new SpeechRecognition();
    recRef.current = rec;
    rec.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => setState('listening');

    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      const val = parseSpokenNumber(transcript);
      if (val) onValue(val);
      else setState('error');
      setTimeout(() => setState('idle'), val ? 0 : 1500);
    };

    rec.onerror = () => {
      setState('error');
      setTimeout(() => setState('idle'), 1500);
    };

    rec.onend = () => {
      if (state === 'listening') setState('idle');
    };

    rec.start();
  };

  const stop = () => {
    recRef.current?.stop();
    setState('idle');
  };

  return (
    <button
      type="button"
      onClick={state === 'listening' ? stop : start}
      title={lang === 'ta' ? 'குரல் உள்ளீடு' : 'Voice input'}
      className={`tap flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow transition
        ${state === 'listening' ? 'bg-red-500 text-white animate-pulse' :
          state === 'error'     ? 'bg-orange-400 text-white' :
                                  'bg-gold-50 text-gold-700 border border-gold-400/40'}`}
    >
      {state === 'listening' ? <MicOff size={18} /> :
       state === 'error'     ? <MicOff size={18} /> :
                               <Mic size={18} />}
    </button>
  );
}
