import { findNavLeaf } from './navigation';

export interface Crumb {
  label: string;
  href?: string;
}

/** Derive the breadcrumb trail from the URL; `zoneLabel` is the hosted zone's name, published by the page. */
export function buildCrumbs(pathname: string, zoneLabel: string | undefined): Crumb[] {
  const root: Crumb = { label: 'Route 53', href: '/dashboard' };
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] === 'hosted-zones' && segments.length > 1) {
    const zones: Crumb = { label: 'Hosted zones', href: '/hosted-zones' };
    if (segments[1] === 'create') return [root, zones, { label: 'Create hosted zone' }];

    const zone: Crumb = { label: zoneLabel ?? segments[1], href: `/hosted-zones/${segments[1]}` };
    if (segments[2] === 'records' && segments[3] === 'create') return [root, zones, zone, { label: 'Create record' }];
    if (segments[2] === 'records' && segments[4] === 'edit') return [root, zones, zone, { label: 'Edit record' }];
    return [root, zones, { label: zone.label }];
  }

  const leaf = findNavLeaf(pathname);
  if (leaf) return [root, { label: leaf.label }];
  const last = segments[segments.length - 1] ?? 'Route 53';
  return [root, { label: last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ') }];
}
