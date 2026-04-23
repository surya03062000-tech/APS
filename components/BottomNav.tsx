'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, PlusCircle, Package, FileText } from 'lucide-react';
import { useLang } from '@/lib/store';
import { t } from '@/lib/i18n';

const tabs = [
  { href: '/dashboard',  icon: Home,       key: 'dashboard' as const },
  { href: '/customers',  icon: Users,      key: 'customers' as const },
  { href: '/entry',      icon: PlusCircle, key: 'addEntry' as const, primary: true },
  { href: '/inventory',  icon: Package,    key: 'inventory' as const },
  { href: '/reports',    icon: FileText,   key: 'reports' as const },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { lang } = useLang();
  if (pathname?.startsWith('/auth')) return null;
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] bg-cream/95 backdrop-blur border-t border-gold-400/20"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, icon: Icon, key, primary }) => {
          const active = pathname === href || pathname?.startsWith(href + '/');
          return (
            <li key={href} className="flex items-center justify-center">
              <Link
                href={href}
                className={`tap flex flex-col items-center justify-center gap-0.5 w-full py-2 ${
                  primary ? 'text-gold-700' : active ? 'text-leaf-700' : 'text-ink/50'
                }`}
              >
                {primary ? (
                  <span className="flex items-center justify-center w-11 h-11 rounded-full bg-gold-400 text-white shadow-card -mt-4">
                    <Icon size={22} />
                  </span>
                ) : (
                  <Icon size={22} />
                )}
                <span className="text-[10px] font-medium leading-none mt-0.5">
                  {t(key, lang)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
