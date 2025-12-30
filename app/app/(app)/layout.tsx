import AppSidebar from '@/app/ui/app-sidebar';

// Layout wrapper for authenticated app pages.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex w-full flex-1 gap-6 px-4 py-8">
      <AppSidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
