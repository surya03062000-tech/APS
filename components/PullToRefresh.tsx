'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

// Pull-to-refresh (Feature #37)
export default function PullToRefresh() {
  const router = useRouter();
  const startY = useRef(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) startY.current = e.touches[0].clientY;
      else startY.current = -1;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current < 0) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0 && window.scrollY <= 0) setPull(Math.min(diff * 0.4, 80));
    };
    const onEnd = () => {
      if (pull > 55) {
        setRefreshing(true);
        router.refresh();
        setTimeout(() => { setRefreshing(false); setPull(0); }, 800);
      } else setPull(0);
      startY.current = -1;
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, [pull, router]);

  if (pull === 0 && !refreshing) return null;
  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 transition-transform"
      style={{ transform: `translateY(${pull}px)` }}>
      <div className="bg-white rounded-full p-2 shadow-card">
        <RefreshCw size={20} className={`text-gold-600 ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: `rotate(${pull * 3}deg)` }} />
      </div>
    </div>
  );
}
