import type { DNSRecord, HostedZone, RecordType } from '@/lib/api/types';

export const RECORD_TYPES: { value: RecordType; label: string }[] = [
  { value: 'A', label: 'A – Routes traffic to an IPv4 address and some AWS resources' },
  { value: 'AAAA', label: 'AAAA – Routes traffic to an IPv6 address and some AWS resources' },
  { value: 'CAA', label: 'CAA – Restricts CAs that can create SSL/TLS certifications of the domain' },
  { value: 'CNAME', label: 'CNAME – Routes traffic to another domain name and to some AWS resources' },
  { value: 'MX', label: 'MX – Specifies mail servers' },
  { value: 'NS', label: 'NS – Identifies the name servers for the hosted zone' },
  { value: 'PTR', label: 'PTR – Maps an IP address to a domain name' },
  { value: 'SRV', label: 'SRV – Application-specific values that identify servers' },
  { value: 'TXT', label: 'TXT – Verifies email senders and application-specific values' },
];

export const VALUE_HELP: Record<RecordType, { placeholder: string; hint: string }> = {
  A: { placeholder: '192.0.2.235', hint: 'Enter multiple IPv4 addresses on separate lines.' },
  AAAA: { placeholder: '2001:db8:85a3::8a2e:370:7334', hint: 'Enter multiple IPv6 addresses on separate lines.' },
  CAA: { placeholder: '0 issue "letsencrypt.org"', hint: 'Format: flags tag "value". Enter multiple values on separate lines.' },
  CNAME: { placeholder: 'www.example.com', hint: 'Enter a single domain name.' },
  MX: { placeholder: '10 mail.example.com', hint: 'Format: priority mail-server. Enter multiple values on separate lines.' },
  NS: { placeholder: 'ns-1.example.net', hint: 'Enter one name server per line.' },
  PTR: { placeholder: 'www.example.com', hint: 'Enter the domain name this address maps to.' },
  SRV: { placeholder: '1 10 5269 xmpp-server.example.com', hint: 'Format: priority weight port target.' },
  TXT: { placeholder: '"v=spf1 include:example.com ~all"', hint: 'Enter multiple values on separate lines.' },
};

/** SOA and the apex NS record are created and owned by Route 53; they cannot be edited or deleted. */
export function isManagedRecord(record: Pick<DNSRecord, 'name' | 'type'>, zone: Pick<HostedZone, 'name'>): boolean {
  return record.name === zone.name && (record.type === 'NS' || record.type === 'SOA');
}

/** "www.example.com." in zone "example.com." -> "www"; the apex becomes "". */
export function relativeName(recordName: string, zoneName: string): string {
  if (recordName === zoneName) return '';
  const suffix = `.${zoneName}`;
  return recordName.endsWith(suffix) ? recordName.slice(0, -suffix.length) : recordName;
}
