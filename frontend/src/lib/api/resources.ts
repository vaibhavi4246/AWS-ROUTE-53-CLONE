import { apiRequest } from './client';
import type {
  BulkDeleteResult,
  DemoLoginResult,
  DemoResetResult,
  DNSRecord,
  HostedZone,
  HostedZoneInput,
  ImportResult,
  ListParams,
  Page,
  RecordInput,
  RecordListParams,
  TransferFormat,
  User,
} from './types';

function listQuery(params: ListParams) {
  return {
    query: params.query?.trim(),
    page: params.page,
    page_size: params.pageSize,
    sort_by: params.sortBy,
    sort_dir: params.sortDir,
  };
}

export const authApi = {
  login: (username: string, password: string) =>
    apiRequest<{ user: User }>('/api/auth/login', { method: 'POST', body: { username, password } }),
  demoLogin: () => apiRequest<DemoLoginResult>('/api/auth/demo', { method: 'POST' }),
  logout: () => apiRequest<void>('/api/auth/logout', { method: 'POST' }),
  me: () => apiRequest<User>('/api/auth/me'),
};

export const demoApi = {
  reset: () => apiRequest<DemoResetResult>('/api/demo/reset', { method: 'POST' }),
};

export const hostedZonesApi = {
  list: (params: ListParams) => apiRequest<Page<HostedZone>>('/api/hosted-zones', { query: listQuery(params) }),
  get: (id: string) => apiRequest<HostedZone>(`/api/hosted-zones/${id}`),
  create: (input: HostedZoneInput) => apiRequest<HostedZone>('/api/hosted-zones', { method: 'POST', body: input }),
  updateDescription: (id: string, description: string) =>
    apiRequest<HostedZone>(`/api/hosted-zones/${id}`, { method: 'PUT', body: { description } }),
  remove: (id: string) => apiRequest<void>(`/api/hosted-zones/${id}`, { method: 'DELETE' }),
};

export const recordsApi = {
  list: (zoneId: string, params: RecordListParams) =>
    apiRequest<Page<DNSRecord>>(`/api/hosted-zones/${zoneId}/records`, {
      query: { ...listQuery(params), type: params.type },
    }),
  get: (zoneId: string, recordId: string) => apiRequest<DNSRecord>(`/api/hosted-zones/${zoneId}/records/${recordId}`),
  create: (zoneId: string, input: RecordInput) =>
    apiRequest<DNSRecord>(`/api/hosted-zones/${zoneId}/records`, { method: 'POST', body: input }),
  update: (zoneId: string, recordId: string, input: RecordInput) =>
    apiRequest<DNSRecord>(`/api/hosted-zones/${zoneId}/records/${recordId}`, { method: 'PUT', body: input }),
  remove: (zoneId: string, recordId: string) =>
    apiRequest<void>(`/api/hosted-zones/${zoneId}/records/${recordId}`, { method: 'DELETE' }),
  bulkDelete: (zoneId: string, recordIds: string[]) =>
    apiRequest<BulkDeleteResult>(`/api/hosted-zones/${zoneId}/records/bulk-delete`, {
      method: 'POST',
      body: { record_ids: recordIds },
    }),
  importFile: (zoneId: string, file: File, format: TransferFormat) => {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<ImportResult>(`/api/hosted-zones/${zoneId}/import`, {
      method: 'POST',
      query: { format },
      body: form,
    });
  },
  exportZone: (zoneId: string, format: TransferFormat) =>
    apiRequest<string>(`/api/hosted-zones/${zoneId}/export`, { query: { format }, as: 'text' }),
};
