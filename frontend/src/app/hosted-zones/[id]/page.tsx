'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Tabs from '@cloudscape-design/components/tabs';
import { useApp } from '@/context/AppContext';
import { useCrumbLabel } from '@/hooks/useCrumbLabel';
import { useFollow } from '@/hooks/useFollow';
import { useResource } from '@/hooks/useResource';
import DeleteZoneModal from '@/features/hosted-zones/DeleteZoneModal';
import EditZoneModal from '@/features/hosted-zones/EditZoneModal';
import RecordsSection from '@/features/records/RecordsSection';
import { hostedZonesApi } from '@/lib/api/resources';

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Box variant="awsui-key-label">{label}</Box>
      <div>{children ?? '-'}</div>
    </div>
  );
}

export default function HostedZoneDetailPage() {
  const { id: zoneId } = useParams<{ id: string }>();
  const router = useRouter();
  const follow = useFollow();
  const { addToast } = useApp();
  const zoneResource = useResource(() => hostedZonesApi.get(zoneId), zoneId);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const zone = zoneResource.data?.id === zoneId ? zoneResource.data : undefined;
  useCrumbLabel(zone?.name);

  if (!zone) {
    return zoneResource.error ? (
      <Alert
        type="error"
        header="Unable to load hosted zone"
        action={
          <Button href="/hosted-zones" onFollow={follow}>
            Back to hosted zones
          </Button>
        }
      >
        {zoneResource.error}
      </Alert>
    ) : (
      <Header variant="h1">Loading…</Header>
    );
  }

  return (
    <SpaceBetween size="m">
      <Header
        variant="h1"
        info={<Link variant="info">Info</Link>}
        actions={<Button onClick={() => setDeleting(true)}>Delete zone</Button>}
      >
        {zone.name}
      </Header>

      <ExpandableSection
        variant="container"
        headerText="Hosted zone details"
        headerActions={<Button onClick={() => setEditing(true)}>Edit hosted zone</Button>}
      >
        <ColumnLayout columns={3} variant="text-grid">
          <Detail label="Hosted zone name">{zone.name}</Detail>
          <Detail label="Hosted zone ID">{zone.id}</Detail>
          <Detail label="Description">{zone.description || '-'}</Detail>
          <Detail label="Type">{zone.type}</Detail>
          <Detail label="Record count">{zone.record_count}</Detail>
          <Detail label="Created by">{zone.created_by ?? '-'}</Detail>
          {zone.type === 'Private' && <Detail label="Associated VPC">{`${zone.vpc_id} (${zone.vpc_region})`}</Detail>}
        </ColumnLayout>
      </ExpandableSection>

      <Tabs
        tabs={[
          {
            id: 'records',
            label: `Records (${zone.record_count})`,
            content: <RecordsSection zone={zone} onChanged={zoneResource.reload} />,
          },
          {
            id: 'dnssec',
            label: 'DNSSEC signing',
            content: <Box color="text-body-secondary">DNSSEC signing is not part of this clone.</Box>,
          },
          {
            id: 'tags',
            label: 'Hosted zone tags',
            content: <Box color="text-body-secondary">Tags are not part of this clone.</Box>,
          },
        ]}
      />

      {editing && (
        <EditZoneModal
          zone={zone}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            addToast(`Successfully updated hosted zone ${saved.name}`, 'success');
            zoneResource.reload();
          }}
        />
      )}
      {deleting && <DeleteZoneModal zone={zone} onClose={() => setDeleting(false)} onDeleted={() => router.push('/hosted-zones')} />}
    </SpaceBetween>
  );
}
