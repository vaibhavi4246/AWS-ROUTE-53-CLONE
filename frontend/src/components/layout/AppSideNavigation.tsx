'use client';

import React from 'react';
import Badge from '@cloudscape-design/components/badge';
import SideNavigation, { type SideNavigationProps } from '@cloudscape-design/components/side-navigation';
import { usePathname } from 'next/navigation';
import { useFollow } from '@/hooks/useFollow';
import { NAVIGATION, flatNavigation, isActivePath, isGroup, type NavLeaf } from '@/lib/navigation';

const toLink = (leaf: NavLeaf): SideNavigationProps.Link => ({
  type: 'link',
  text: leaf.label,
  href: leaf.href,
  info: leaf.badge ? <Badge color="blue">{leaf.badge}</Badge> : undefined,
});

const ITEMS: SideNavigationProps.Item[] = NAVIGATION.map((entry) =>
  isGroup(entry)
    ? { type: 'section', text: entry.label, defaultExpanded: true, items: entry.items.map(toLink) }
    : toLink(entry),
);

export default function AppSideNavigation() {
  const pathname = usePathname();
  const follow = useFollow();
  // The most specific nav entry wins, so /hosted-zones/Z1/... still highlights "Hosted zones".
  const active = flatNavigation
    .filter((leaf) => isActivePath(pathname, leaf.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <SideNavigation
      header={{ text: 'Route 53', href: '/dashboard' }}
      activeHref={active?.href}
      items={ITEMS}
      onFollow={follow}
    />
  );
}
