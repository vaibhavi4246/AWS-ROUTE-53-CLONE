export type ZoneType = 'Public' | 'Private';
export type RecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'PTR' | 'SRV' | 'TXT' | 'CAA';
export type RoutingPolicy = 'Simple' | 'Weighted';
export type SortDirection = 'asc' | 'desc';
export type TransferFormat = 'bind' | 'json';

export interface User {
  id: number;
  username: string;
  aws_account_id: string;
  /** True for the passwordless demo account that comes with sample data. */
  is_demo: boolean;
}

export interface DemoLoginResult {
  token: string;
  user: User;
  /** True when this sign-in loaded the sample hosted zones (i.e. the console was empty). */
  seeded: boolean;
}

export interface DemoResetResult {
  zones: number;
  records: number;
}

export interface HostedZone {
  id: string;
  name: string;
  description: string | null;
  type: ZoneType;
  created_by: string | null;
  vpc_id: string | null;
  vpc_region: string | null;
  record_count: number;
  created_at: string;
}

export interface HostedZoneInput {
  name: string;
  description: string | null;
  type: ZoneType;
  vpc_id: string | null;
  vpc_region: string | null;
}

export interface DNSRecord {
  id: string;
  hosted_zone_id: string;
  name: string;
  type: string;
  routing_policy: RoutingPolicy;
  ttl: number;
  value: string;
  weight: number | null;
  set_id: string | null;
  alias: boolean;
  alias_target: string | null;
  health_check_id: string | null;
  created_at: string;
}

export interface RecordInput {
  name: string;
  type: RecordType;
  routing_policy: RoutingPolicy;
  ttl: number;
  value: string;
  weight: number | null;
  set_id: string | null;
  alias: boolean;
  alias_target: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ListParams {
  query?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: SortDirection;
}

export interface RecordListParams extends ListParams {
  type?: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ImportResult {
  imported_count: number;
  skipped: { name: string; type: string; reason: string }[];
}

export interface BulkDeleteResult {
  deleted_count: number;
  skipped_count: number;
}
