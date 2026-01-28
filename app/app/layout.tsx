import './ui/global.css';
import LanguageProvider from './components/i18n/LanguageProvider';
import SiteFooter from './ui/site-footer';
import SiteHeader from './ui/site-header';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <LanguageProvider>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
