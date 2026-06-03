// Standalone layout for print/PDF pages — no TopBar, BottomNav, PinLock etc.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
