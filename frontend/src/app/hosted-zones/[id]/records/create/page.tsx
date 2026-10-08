'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Alert from '@cloudscape-design/components/alert';
import Header from '@cloudscape-design/components/header';
import { useApp } from '@/context/AppContext';
import { useCrumbLabel } from '@/hooks/useCrumbLabel';
import { useResource } from '@/hooks/useResource';
import RecordForm from '@/features/records/RecordForm';
import { hostedZonesApi, recordsApi } from '@/lib/api/resources';

export default function CreateRecordPage() {
  const { id: zoneId } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToast } = useApp();
  const zoneResource = useResource(() => hostedZonesApi.get(zoneId), zoneId);
  const zone = zoneResource.data?.id === zoneId ? zoneResource.data : undefined;
  useCrumbLabel(zone?.name);

  if (!zone) {
    return zoneResource.error ? <Alert type="error">{zoneResource.error}</Alert> : <Header variant="h1">Create record</Header>;
  }

  return (
    <RecordForm
      zone={zone}
      title="Create record"
      submitLabel="Create record"
      cancelHref={`/hosted-zones/${zone.id}`}
      onSubmit={async (input) => {
        const created = await recordsApi.create(zone.id, input);
        addToast(`Successfully created record ${created.name}`, 'success');
        router.push(`/hosted-zones/${zone.id}`);
      }}
    />
  );
}
