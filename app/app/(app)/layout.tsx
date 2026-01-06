import DemoBanner from '@/app/components/ui/DemoBanner';
import AppSidebar from '@/app/ui/app-sidebar';

// Layout wrapper for authenticated app pages.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full flex-1 space-y-4 px-4 py-6 md:py-8">
      <DemoBanner />
      <div className="relative flex w-full flex-1 flex-col gap-6 md:flex-row">
        <AppSidebar />
        <main className="w-full flex-1">{children}</main>
      </div>
    </div>
  );
}
