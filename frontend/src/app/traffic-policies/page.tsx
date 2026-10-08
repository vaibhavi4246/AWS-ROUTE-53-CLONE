'use client';

import React, { useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import Pagination from '@cloudscape-design/components/pagination';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import { useApp } from '@/context/AppContext';

interface TrafficPolicy {
  name: string;
  versions: number;
}

/**
 * Traffic flow is mocked: the page is faithful to the console's empty state, and its actions explain
 * that traffic policies are not part of this clone.
 */
export default function TrafficPoliciesPage() {
  const { addToast } = useApp();
  const [filter, setFilter] = useState('');
  const unavailable = () => addToast('Traffic policies are not available in this clone.', 'info');

  return (
    <Table<TrafficPolicy>
      variant="full-page"
      stickyHeader
      items={[]}
      columnDefinitions={[
        { id: 'name', header: 'Name', sortingField: 'name', cell: (item) => item.name },
        { id: 'versions', header: 'Number of versions', sortingField: 'versions', cell: (item) => item.versions },
      ]}
      header={
        <Header
          variant="awsui-h1-sticky"
          counter="(0)"
          info={<Link variant="info">Info</Link>}
          description="Create sophisticated routing configurations for your resources using existing routing types."
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button disabled>Delete traffic policy</Button>
              <Button disabled>Create policy records</Button>
              <Button variant="primary" onClick={unavailable}>
                Create traffic policy
              </Button>
            </SpaceBetween>
          }
        >
          Traffic policies
        </Header>
      }
      filter={<TextFilter filteringText={filter} filteringPlaceholder="Search for a traffic policy" onChange={({ detail }) => setFilter(detail.filteringText)} />}
      pagination={<Pagination currentPageIndex={1} pagesCount={1} onChange={() => undefined} />}
      preferences={
        <CollectionPreferences
          title="Preferences"
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          preferences={{ pageSize: 10 }}
          pageSizePreference={{ title: 'Page size', options: [{ value: 10, label: '10 resources' }] }}
        />
      }
      empty={
        <Box textAlign="center" color="inherit">
          <Box padding={{ bottom: 's' }} variant="p" color="inherit">
            No traffic policies
          </Box>
          <Button onClick={unavailable}>Create traffic policy</Button>
        </Box>
      }
    />
  );
}
