/** Single source of truth for the side navigation, breadcrumbs and "coming soon" page titles. */

export interface NavLeaf {
  label: string;
  href: string;
  badge?: string;
  /** Pages that only render a "Coming soon" placeholder. */
  mocked?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavLeaf[];
}

export type NavEntry = NavLeaf | NavGroup;

export const isGroup = (entry: NavEntry): entry is NavGroup => 'items' in entry;

export const NAVIGATION: NavEntry[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Hosted zones', href: '/hosted-zones' },
  { label: 'Health checks', href: '/health-checks', mocked: true },
  { label: 'Profiles', href: '/profiles', mocked: true },
  {
    label: 'Global Resolver',
    items: [
      { label: 'Global resolvers', href: '/global-resolvers', badge: 'New', mocked: true },
      { label: 'Shared DNS views', href: '/shared-dns-views', badge: 'New', mocked: true },
    ],
  },
  {
    label: 'VPC Resolver',
    items: [
      { label: 'VPCs', href: '/resolver/vpcs', mocked: true },
      { label: 'Inbound endpoints', href: '/resolver/inbound-endpoints', mocked: true },
      { label: 'Outbound endpoints', href: '/resolver/outbound-endpoints', mocked: true },
      { label: 'Rules', href: '/resolver/rules', mocked: true },
      { label: 'Query logging', href: '/resolver/query-logging', mocked: true },
      { label: 'Outposts', href: '/resolver/outposts', mocked: true },
    ],
  },
  {
    label: 'Domains',
    items: [
      { label: 'Registered domains', href: '/registered-domains', mocked: true },
      { label: 'Requests', href: '/requests', mocked: true },
    ],
  },
  {
    label: 'IP-based routing',
    items: [{ label: 'CIDR collections', href: '/cidr-collections', mocked: true }],
  },
  {
    label: 'Traffic flow',
    items: [
      { label: 'Traffic policies', href: '/traffic-policies', mocked: true },
      { label: 'Policy records', href: '/policy-records', mocked: true },
    ],
  },
];

export const flatNavigation: NavLeaf[] = NAVIGATION.flatMap((entry) => (isGroup(entry) ? entry.items : [entry]));

export function findNavLeaf(pathname: string): NavLeaf | undefined {
  return flatNavigation.find((leaf) => pathname === leaf.href);
}

/** True when `pathname` is this leaf or lives underneath it. */
export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
