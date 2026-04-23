import './globals.css';
import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import TopBar from '@/components/TopBar';

export const metadata: Metadata = {
  title: 'APS MILK CENTER',
  description: 'Daily dairy operations — Tamil/English',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'APS Milk' },
};

export const viewport: Viewport = {
  themeColor: '#FFF8EC',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ta">
      <body className="min-h-screen">
        <div className="max-w-[520px] mx-auto min-h-screen relative">
          <TopBar />
          <main className="page px-4 pt-2">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
