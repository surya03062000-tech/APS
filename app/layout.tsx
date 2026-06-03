import './globals.css';
import type { Metadata, Viewport } from 'next';
import BottomNav from '@/components/BottomNav';
import TopBar from '@/components/TopBar';
import ToastContainer from '@/components/Toast';
import InstallPrompt from '@/components/InstallPrompt';
import PinLock from '@/components/PinLock';
import PullToRefresh from '@/components/PullToRefresh';

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
          <PullToRefresh />
          <ToastContainer />
          <main className="page px-4 pt-2">{children}</main>
          <BottomNav />
          <InstallPrompt />
          <PinLock />
        </div>
      </body>
    </html>
  );
}
