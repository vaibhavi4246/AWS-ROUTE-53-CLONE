'use client';

import React, { useEffect, useRef, useState } from 'react';
import AppLayout, { type AppLayoutProps } from '@cloudscape-design/components/app-layout';
import type { AutosuggestProps } from '@cloudscape-design/components/autosuggest';
import Box from '@cloudscape-design/components/box';
import Spinner from '@cloudscape-design/components/spinner';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useHotkeys } from '@/hooks/useHotkeys';
import AppBreadcrumbs from './AppBreadcrumbs';
import AppSideNavigation from './AppSideNavigation';
import AppTopNavigation from './AppTopNavigation';
import NotificationBar from './NotificationBar';
import ShortcutsModal from './ShortcutsModal';

function Splash({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, height: '100vh' }}>
      <Spinner size="large" />
      <span>{label}</span>
    </div>
  );
}

/** Tables use the wide layout; create/edit pages use the narrow form layout. */
function contentTypeFor(pathname: string): AppLayoutProps.ContentType {
  if (pathname === '/hosted-zones') return 'table';
  if (pathname === '/hosted-zones/create' || pathname.includes('/records/')) return 'form';
  return 'default';
}

/** Console chrome around every page, plus the login/session guard. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, resetDemo } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<AutosuggestProps.Ref>(null);
  const [navOpen, setNavOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1000));
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const focusSearch = () => searchRef.current?.focus();
  useHotkeys({ '/': focusSearch, 'alt+s': focusSearch, '?': () => setShortcutsOpen(true) }, !!user);

  const onLoginPage = pathname === '/login';

  // Session guard: signed-out users go to /login, signed-in users never see it.
  useEffect(() => {
    if (loading) return;
    if (!user && !onLoginPage) router.replace('/login');
    if (user && onLoginPage) router.replace('/hosted-zones');
  }, [loading, user, onLoginPage, router]);

  if (loading) return <Splash label="Loading console" />;
  if (!user) return onLoginPage ? <>{children}</> : <Splash label="Redirecting to sign in" />;
  if (onLoginPage) return <Splash label="Redirecting" />;

  return (
    <>
      <div id="top-nav" style={{ position: 'sticky', top: 0, zIndex: 1002 }}>
        <AppTopNavigation searchRef={searchRef} onShowShortcuts={() => setShortcutsOpen(true)} onResetDemo={() => setResetOpen(true)} />
      </div>
      <AppLayout
        headerSelector="#top-nav"
        contentType={contentTypeFor(pathname)}
        navigation={<AppSideNavigation />}
        navigationOpen={navOpen}
        onNavigationChange={({ detail }) => setNavOpen(detail.open)}
        breadcrumbs={<AppBreadcrumbs />}
        notifications={<NotificationBar />}
        stickyNotifications
        toolsHide
        content={children}
        ariaLabels={{ navigation: 'Route 53 navigation', navigationToggle: 'Open navigation', navigationClose: 'Close navigation' }}
      />
      {shortcutsOpen && <ShortcutsModal onClose={() => setShortcutsOpen(false)} />}
      {resetOpen && (
        <ConfirmModal
          title="Reset demo data"
          confirmLabel="Reset"
          onClose={() => setResetOpen(false)}
          onConfirm={async () => {
            await resetDemo();
            setResetOpen(false);
            router.push('/hosted-zones');
          }}
        >
          <Box>
            This deletes every hosted zone and record, including any you created, and restores the original sample data.
          </Box>
        </ConfirmModal>
      )}
    </>
  );
}
