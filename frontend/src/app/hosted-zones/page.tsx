'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import type { TableProps } from '@cloudscape-design/components/table';
import ServerTable, { type SortState } from '@/components/ui/ServerTable';
import { useApp } from '@/context/AppContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useFollow } from '@/hooks/useFollow';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useResource } from '@/hooks/useResource';
import DeleteZoneModal from '@/features/hosted-zones/DeleteZoneModal';
import EditZoneModal from '@/features/hosted-zones/EditZoneModal';
import { hostedZonesApi } from '@/lib/api/resources';
import type { HostedZone, Page } from '@/lib/api/types';

export default function HostedZonesPage() {
  const router = useRouter();
  const follow = useFollow();
  const { addToast } = useApp();

  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<SortState>();
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const query = useDebouncedValue(filter.trim(), 300);
  const key = JSON.stringify([query, page, pageSize, sort]);

  const zones = useResource<Page<HostedZone>>(
    () => hostedZonesApi.list({ query, page, pageSize, sortBy: sort?.key, sortDir: sort?.dir }),
    key,
  );
  const rows = zones.data?.items ?? [];
  const total = zones.data?.total ?? 0;
  const selectedZone = rows.find((zone) => zone.id === selected[0]);

  useHotkeys({ c: () => router.push('/hosted-zones/create'), r: () => zones.reload() });

  const columns: TableProps.ColumnDefinition<HostedZone>[] = [
    {
      id: 'name',
      header: 'Hosted zone name',
      sortingField: 'name',
      minWidth: 200,
      cell: (zone) => (
        <Link href={`/hosted-zones/${zone.id}`} onFollow={follow}>
          {zone.name}
        </Link>
      ),
    },
    { id: 'type', header: 'Type', sortingField: 'type', width: 110, cell: (zone) => zone.type },
    { id: 'created_by', header: 'Created by', sortingField: 'created_by', cell: (zone) => zone.created_by ?? '-' },
    { id: 'record_count', header: 'Record count', sortingField: 'record_count', width: 140, cell: (zone) => zone.record_count },
    { id: 'description', header: 'Description', sortingField: 'description', cell: (zone) => zone.description || '-' },
    { id: 'id', header: 'Hosted zone ID', sortingField: 'id', cell: (zone) => zone.id },
  ];

  const resetView = (apply: () => void) => {
    apply();
    setPage(1);
    setSelected([]);
  };

  return (
    <SpaceBetween size="m">
      {zones.error && (
        <Alert type="error" header="Unable to load hosted zones" action={<Button onClick={() => zones.reload()}>Retry</Button>}>
          {zones.error}
        </Alert>
      )}

      <ServerTable<HostedZone>
        variant="full-page"
        ariaLabel="Hosted zones"
        title="Hosted zones"
        description="Automatic mode is the current search behavior optimized for best filter results. To change modes go to settings."
        info
        items={rows}
        rowId={(zone) => zone.id}
        columns={columns}
        loading={zones.loading}
        selectionType="single"
        selectedIds={selected}
        onSelectionChange={setSelected}
        sort={sort}
        onSortChange={(next) => resetView(() => setSort(next))}
        filterText={filter}
        onFilterChange={(text) => resetView(() => setFilter(text))}
        filterPlaceholder="Filter records by property or value"
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={(next) => {
          setPage(next);
          setSelected([]);
        }}
        onPageSizeChange={(size) => resetView(() => setPageSize(size))}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName="refresh" ariaLabel="Refresh hosted zones" onClick={() => zones.reload()} />
            <Button disabled={!selectedZone} href={selectedZone ? `/hosted-zones/${selectedZone.id}` : undefined} onFollow={follow}>
              View details
            </Button>
            <Button disabled={!selectedZone} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button disabled={!selectedZone} onClick={() => setDeleting(true)}>
              Delete
            </Button>
            <Button variant="primary" href="/hosted-zones/create" onFollow={follow}>
              Create hosted zone
            </Button>
          </SpaceBetween>
        }
        empty={
          <Box textAlign="center" color="inherit">
            <b>No hosted zones</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              There are no hosted zones created for this account.
            </Box>
            <Button variant="primary" href="/hosted-zones/create" onFollow={follow}>
              Create hosted zone
            </Button>
          </Box>
        }
        noMatch={
          <Box textAlign="center" color="inherit">
            <b>No matches</b>
            <Box padding={{ bottom: 's' }} variant="p" color="inherit">
              We can&apos;t find a match.
            </Box>
            <Button onClick={() => resetView(() => setFilter(''))}>Clear filter</Button>
          </Box>
        }
      />

      {editing && selectedZone && (
        <EditZoneModal
          zone={selectedZone}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            addToast(`Successfully updated hosted zone ${saved.name}`, 'success');
            zones.reload();
          }}
        />
      )}
      {deleting && selectedZone && (
        <DeleteZoneModal
          zone={selectedZone}
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            setDeleting(false);
            setSelected([]);
            if (page > 1 && rows.length === 1) setPage(page - 1);
            zones.reload();
          }}
        />
      )}
    </SpaceBetween>
  );
}
