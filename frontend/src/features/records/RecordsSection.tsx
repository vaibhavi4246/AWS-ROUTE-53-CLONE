'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ButtonDropdown from '@cloudscape-design/components/button-dropdown';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import type { TableProps } from '@cloudscape-design/components/table';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ServerTable, { type SortState } from '@/components/ui/ServerTable';
import { useApp } from '@/context/AppContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useFollow } from '@/hooks/useFollow';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useResource } from '@/hooks/useResource';
import { recordsApi } from '@/lib/api/resources';
import { downloadText } from '@/lib/download';
import type { DNSRecord, HostedZone, Page, TransferFormat } from '@/lib/api/types';
import ImportZoneModal from './ImportZoneModal';
import { RECORD_TYPES, isManagedRecord } from './recordTypes';

interface RecordsSectionProps {
  zone: HostedZone;
  /** Called after any change so the parent can refresh zone-level data (record count). */
  onChanged: () => void;
}

const ANY_TYPE = { value: '', label: 'Type: Any' };
const TYPE_FILTER_OPTIONS = [ANY_TYPE, ...RECORD_TYPES.map((type) => ({ value: type.value, label: type.value })), { value: 'SOA', label: 'SOA' }];

export default function RecordsSection({ zone, onChanged }: RecordsSectionProps) {
  const router = useRouter();
  const follow = useFollow();
  const { addToast } = useApp();

  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<SortState>();
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);

  const query = useDebouncedValue(filter.trim(), 300);
  const key = JSON.stringify([zone.id, query, typeFilter, page, pageSize, sort]);

  const records = useResource<Page<DNSRecord>>(
    () => recordsApi.list(zone.id, { query, type: typeFilter || undefined, page, pageSize, sortBy: sort?.key, sortDir: sort?.dir }),
    key,
  );
  const rows = records.data?.items ?? [];
  const total = records.data?.total ?? 0;

  const selectedRecords = rows.filter((record) => selected.includes(record.id));
  const singleSelected = selectedRecords.length === 1 ? selectedRecords[0] : undefined;
  const createHref = `/hosted-zones/${zone.id}/records/create`;

  const refresh = () => {
    records.reload();
    onChanged();
  };

  useHotkeys({ c: () => router.push(createHref), r: () => records.reload() });

  const changeFilters = (apply: () => void) => {
    apply();
    setPage(1);
    setSelected([]);
  };

  const confirmDelete = async () => {
    try {
      const result = await recordsApi.bulkDelete(zone.id, selected);
      addToast(`Successfully deleted ${result.deleted_count} record${result.deleted_count === 1 ? '' : 's'}.`, 'success');
      setSelected([]);
      setDeleting(false);
      // Step back a page if we just emptied the last one.
      if (page > 1 && result.deleted_count >= rows.length) setPage(page - 1);
      refresh();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to delete records', 'error');
      setDeleting(false);
    }
  };

  const exportZone = async (format: TransferFormat) => {
    try {
      const content = await recordsApi.exportZone(zone.id, format);
      const base = zone.name.replace(/\.$/, '');
      downloadText(format === 'json' ? `${base}.json` : `${base}.zone`, content, format === 'json' ? 'application/json' : 'text/plain');
      addToast(`Exported ${zone.name} as ${format === 'json' ? 'JSON' : 'a BIND zone file'}.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Export failed', 'error');
    }
  };

  const columns: TableProps.ColumnDefinition<DNSRecord>[] = [
    { id: 'name', header: 'Record name', sortingField: 'name', cell: (record) => record.name },
    { id: 'type', header: 'Type', sortingField: 'type', width: 100, cell: (record) => record.type },
    { id: 'routing', header: 'Routing policy', sortingField: 'routing_policy', cell: (record) => record.routing_policy },
    {
      id: 'differentiator',
      header: 'Differentiator',
      cell: (record) => (record.routing_policy === 'Weighted' ? `Weight: ${record.weight} · ID: ${record.set_id}` : '-'),
    },
    { id: 'alias', header: 'Alias', width: 90, cell: (record) => (record.alias ? 'Yes' : 'No') },
    {
      id: 'value',
      header: 'Value/Route traffic to',
      sortingField: 'value',
      minWidth: 220,
      cell: (record) =>
        record.alias ? (
          <span>
            Alias to <Box variant="code">{record.alias_target}</Box>
          </span>
        ) : (
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{record.value}</div>
        ),
    },
    { id: 'ttl', header: 'TTL (seconds)', sortingField: 'ttl', width: 140, cell: (record) => (record.alias ? '-' : record.ttl) },
    { id: 'health', header: 'Health check ID', minWidth: 140, cell: (record) => record.health_check_id ?? '-' },
    { id: 'evaluate', header: 'Evaluate target health', minWidth: 190, cell: (record) => (record.alias ? 'No' : '-') },
  ];

  return (
    <SpaceBetween size="m">
      {records.error && (
        <Alert
          type="error"
          header="Unable to load records"
          action={<Button onClick={() => records.reload()}>Retry</Button>}
        >
          {records.error}
        </Alert>
      )}

      <ServerTable<DNSRecord>
        ariaLabel="Records"
        title="Records"
        items={rows}
        rowId={(record) => record.id}
        columns={columns}
        loading={records.loading}
        selectionType="multi"
        selectedIds={selected}
        onSelectionChange={setSelected}
        isItemDisabled={(record) => isManagedRecord(record, zone)}
        sort={sort}
        onSortChange={(next) => changeFilters(() => setSort(next))}
        filterText={filter}
        onFilterChange={(text) => changeFilters(() => setFilter(text))}
        filterPlaceholder="Filter records by property or value"
        filterExtras={
          <div style={{ width: 160 }}>
            <Select
              selectedOption={TYPE_FILTER_OPTIONS.find((option) => option.value === typeFilter) ?? ANY_TYPE}
              options={TYPE_FILTER_OPTIONS}
              onChange={({ detail }) => changeFilters(() => setTypeFilter(detail.selectedOption.value ?? ''))}
              ariaLabel="Filter by record type"
            />
          </div>
        }
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(next) => {
          setPage(next);
          setSelected([]);
        }}
        onPageSizeChange={(size) => changeFilters(() => setPageSize(size))}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName="refresh" ariaLabel="Refresh records" onClick={() => records.reload()} />
            <Button disabled={selected.length === 0} onClick={() => setDeleting(true)}>
              Delete record{selected.length > 1 ? 's' : ''}
            </Button>
            <Button iconName="upload" onClick={() => setImporting(true)}>
              Import zone file
            </Button>
            <ButtonDropdown
              items={[
                { id: 'bind', text: 'Export as BIND zone file' },
                { id: 'json', text: 'Export as JSON' },
              ]}
              onItemClick={({ detail }) => exportZone(detail.id as TransferFormat)}
            >
              Export zone
            </ButtonDropdown>
            <Button disabled={!singleSelected} href={singleSelected ? `/hosted-zones/${zone.id}/records/${singleSelected.id}/edit` : undefined} onFollow={follow}>
              Edit record
            </Button>
            <Button variant="primary" href={createHref} onFollow={follow}>
              Create record
            </Button>
          </SpaceBetween>
        }
        empty={
          <Box textAlign="center" color="inherit">
            <b>No records</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              This hosted zone has no records.
            </Box>
            <Button variant="primary" href={createHref} onFollow={follow}>
              Create record
            </Button>
          </Box>
        }
        noMatch={
          <Box textAlign="center" color="inherit">
            <b>No matches</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              We can&apos;t find a match.
            </Box>
            <Button onClick={() => changeFilters(() => { setFilter(''); setTypeFilter(''); })}>Clear filter</Button>
          </Box>
        }
      />

      {deleting && (
        <ConfirmModal
          title={`Delete record${selected.length > 1 ? 's' : ''}`}
          confirmLabel="Delete"
          onClose={() => setDeleting(false)}
          onConfirm={confirmDelete}
        >
          <Box>
            Are you sure you want to delete {selected.length === 1 ? 'this record' : `these ${selected.length} records`}? This can&apos;t be undone.
          </Box>
          <ul style={{ margin: 0, paddingLeft: 20, maxHeight: 180, overflowY: 'auto' }}>
            {selectedRecords.slice(0, 10).map((record) => (
              <li key={record.id}>
                <b>{record.name}</b> ({record.type})
              </li>
            ))}
            {selectedRecords.length > 10 && <li>…and {selectedRecords.length - 10} more</li>}
          </ul>
        </ConfirmModal>
      )}

      {importing && (
        <ImportZoneModal
          zone={zone}
          onClose={() => setImporting(false)}
          onImported={(result) => {
            addToast(`Imported ${result.imported_count} record${result.imported_count === 1 ? '' : 's'} into ${zone.name}.`, 'success');
            setPage(1);
            refresh();
          }}
        />
      )}
    </SpaceBetween>
  );
}
