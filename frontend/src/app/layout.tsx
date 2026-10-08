import type { Metadata } from 'next';
import '@cloudscape-design/global-styles/index.css';
import { AppProvider } from '@/context/AppContext';
import AppShell from '@/components/layout/AppShell';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'Route 53 Management Console',
  description: 'A clone of the Amazon Route 53 console backed by FastAPI and SQLite.',
  icons: { icon: { url: '/route53-logo.webp', type: 'image/webp' }, apple: '/route53-logo.webp' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* The dark-mode class is added by the inline script before hydration, so React must not warn about it. */}
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
