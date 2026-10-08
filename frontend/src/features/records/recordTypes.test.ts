import { describe, expect, it } from 'vitest';
import { RECORD_TYPES, VALUE_HELP, isManagedRecord, relativeName } from './recordTypes';

describe('record helpers', () => {
  it('offers every record type the assignment requires, each with value help', () => {
    const types = RECORD_TYPES.map((type) => type.value);
    expect(types).toEqual(expect.arrayContaining(['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'PTR', 'SRV', 'CAA']));
    for (const type of types) expect(VALUE_HELP[type].placeholder).toBeTruthy();
  });

  it('only treats apex NS and SOA as managed by Route 53', () => {
    const zone = { name: 'example.com.' };
    expect(isManagedRecord({ name: 'example.com.', type: 'NS' }, zone)).toBe(true);
    expect(isManagedRecord({ name: 'example.com.', type: 'SOA' }, zone)).toBe(true);
    expect(isManagedRecord({ name: 'example.com.', type: 'A' }, zone)).toBe(false);
    expect(isManagedRecord({ name: 'sub.example.com.', type: 'NS' }, zone)).toBe(false);
  });

  it('computes the editable name relative to the zone', () => {
    expect(relativeName('www.example.com.', 'example.com.')).toBe('www');
    expect(relativeName('a.b.example.com.', 'example.com.')).toBe('a.b');
    expect(relativeName('example.com.', 'example.com.')).toBe('');
  });
});
