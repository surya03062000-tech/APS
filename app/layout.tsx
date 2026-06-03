import './globals.css';
import type { Metadata, Viewport } from 'next';

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
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
