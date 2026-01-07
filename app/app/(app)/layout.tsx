import DemoBanner from '@/app/components/ui/DemoBanner';
import MobileTopBar from '@/app/components/layout/MobileTopBar';
import AppSidebar from '@/app/ui/app-sidebar';

// Layout wrapper for authenticated app pages.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full flex-1">
      <MobileTopBar />
      <div className="mx-auto w-full max-w-6xl space-y-3 px-4 py-4 md:space-y-4 md:py-8">
        <DemoBanner />
        <div className="relative flex w-full flex-1 flex-col gap-5 md:flex-row md:gap-6">
          <AppSidebar />
          <main className="w-full flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
