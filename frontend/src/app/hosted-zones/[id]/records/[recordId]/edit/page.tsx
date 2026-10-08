'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Alert from '@cloudscape-design/components/alert';
import Button from '@cloudscape-design/components/button';
import Header from '@cloudscape-design/components/header';
import { useApp } from '@/context/AppContext';
import { useCrumbLabel } from '@/hooks/useCrumbLabel';
import { useFollow } from '@/hooks/useFollow';
import { useResource } from '@/hooks/useResource';
import RecordForm from '@/features/records/RecordForm';
import { isManagedRecord } from '@/features/records/recordTypes';
import { hostedZonesApi, recordsApi } from '@/lib/api/resources';

export default function EditRecordPage() {
  const { id: zoneId, recordId } = useParams<{ id: string; recordId: string }>();
  const router = useRouter();
  const follow = useFollow();
  const { addToast } = useApp();
  const zoneResource = useResource(() => hostedZonesApi.get(zoneId), zoneId);
  const recordResource = useResource(() => recordsApi.get(zoneId, recordId), `${zoneId}/${recordId}`);

  const zone = zoneResource.data?.id === zoneId ? zoneResource.data : undefined;
  const record = recordResource.data?.id === recordId ? recordResource.data : undefined;
  useCrumbLabel(zone?.name);

  const backButton = (
    <Button href={`/hosted-zones/${zoneId}`} onFollow={follow}>
      Back to hosted zone
    </Button>
  );

  const error = zoneResource.error ?? recordResource.error;
  if (error) {
    return (
      <Alert type="error" header="Unable to load record" action={backButton}>
        {error}
      </Alert>
    );
  }
  if (!zone || !record) return <Header variant="h1">Edit record</Header>;

  if (isManagedRecord(record, zone)) {
    return (
      <Alert type="info" header="Managed by Route 53" action={backButton}>
        The apex NS and SOA records are created by Route 53 and cannot be edited or deleted.
      </Alert>
    );
  }

  return (
    <RecordForm
      zone={zone}
      initial={record}
      title="Edit record"
      submitLabel="Save changes"
      cancelHref={`/hosted-zones/${zone.id}`}
      onSubmit={async (input) => {
        const saved = await recordsApi.update(zone.id, record.id, input);
        addToast(`Successfully updated record ${saved.name}`, 'success');
        router.push(`/hosted-zones/${zone.id}`);
      }}
    />
  );
}
