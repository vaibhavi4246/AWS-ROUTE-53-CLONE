import { describe, expect, it } from 'vitest';
import { buildCrumbs } from './breadcrumbs';

const labels = (path: string, zone?: string) => buildCrumbs(path, zone).map((crumb) => crumb.label);

describe('buildCrumbs', () => {
  it('shows Route 53 > section for navigation pages', () => {
    expect(labels('/hosted-zones')).toEqual(['Route 53', 'Hosted zones']);
    expect(labels('/dashboard')).toEqual(['Route 53', 'Dashboard']);
    expect(labels('/resolver/vpcs')).toEqual(['Route 53', 'VPCs']);
    expect(labels('/cidr-collections')).toEqual(['Route 53', 'CIDR collections']);
  });

  it('humanises unknown sections', () => {
    expect(labels('/some-new-page')).toEqual(['Route 53', 'Some new page']);
  });

  it('uses the zone name once the page has published it, and the id until then', () => {
    expect(labels('/hosted-zones/Z123', 'example.com.')).toEqual(['Route 53', 'Hosted zones', 'example.com.']);
    expect(labels('/hosted-zones/Z123')).toEqual(['Route 53', 'Hosted zones', 'Z123']);
  });

  it('builds the create and edit trails', () => {
    expect(labels('/hosted-zones/create')).toEqual(['Route 53', 'Hosted zones', 'Create hosted zone']);
    expect(labels('/hosted-zones/Z1/records/create', 'a.com.')).toEqual(['Route 53', 'Hosted zones', 'a.com.', 'Create record']);
    expect(labels('/hosted-zones/Z1/records/R9/edit', 'a.com.')).toEqual(['Route 53', 'Hosted zones', 'a.com.', 'Edit record']);
  });

  it('links every crumb except the last', () => {
    const crumbs = buildCrumbs('/hosted-zones/Z1/records/create', 'a.com.');
    expect(crumbs.slice(0, -1).every((crumb) => crumb.href)).toBe(true);
    expect(crumbs.at(-1)?.href).toBeUndefined();
  });
});
