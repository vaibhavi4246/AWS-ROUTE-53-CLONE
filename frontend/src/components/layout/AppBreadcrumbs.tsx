'use client';

import React, { useSyncExternalStore } from 'react';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import { usePathname } from 'next/navigation';
import { useFollow } from '@/hooks/useFollow';
import { buildCrumbs } from '@/lib/breadcrumbs';
import { crumbStore } from '@/lib/crumbStore';

export default function AppBreadcrumbs() {
  const pathname = usePathname();
  const follow = useFollow();
  const zoneLabel = useSyncExternalStore(crumbStore.subscribe, crumbStore.get, crumbStore.getServerSnapshot);
  const items = buildCrumbs(pathname, zoneLabel).map((crumb) => ({ text: crumb.label, href: crumb.href ?? pathname }));

  return <BreadcrumbGroup items={items} onFollow={follow} ariaLabel="Breadcrumbs" />;
}
