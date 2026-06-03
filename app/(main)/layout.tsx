import BottomNav from '@/components/BottomNav';
import TopBar from '@/components/TopBar';
import ToastContainer from '@/components/Toast';
import InstallPrompt from '@/components/InstallPrompt';
import PinLock from '@/components/PinLock';
import PullToRefresh from '@/components/PullToRefresh';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[520px] mx-auto min-h-screen relative">
      <TopBar />
      <PullToRefresh />
      <ToastContainer />
      <main className="page px-4 pt-2">{children}</main>
      <BottomNav />
      <InstallPrompt />
      <PinLock />
    </div>
  );
}
