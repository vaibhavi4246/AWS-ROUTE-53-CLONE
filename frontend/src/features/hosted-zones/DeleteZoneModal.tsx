'use client';

import React from 'react';
import Box from '@cloudscape-design/components/box';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useApp } from '@/context/AppContext';
import { hostedZonesApi } from '@/lib/api/resources';
import type { HostedZone } from '@/lib/api/types';

interface DeleteZoneModalProps {
  zone: HostedZone;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteZoneModal({ zone, onClose, onDeleted }: DeleteZoneModalProps) {
  const { addToast } = useApp();

  const confirm = async () => {
    try {
      await hostedZonesApi.remove(zone.id);
      addToast(`Successfully deleted hosted zone ${zone.name}`, 'success');
      onDeleted();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to delete hosted zone', 'error');
      onClose();
    }
  };

  return (
    <ConfirmModal title="Delete hosted zone" confirmLabel="Delete" requireText="delete" onClose={onClose} onConfirm={confirm}>
      <Box>
        Are you sure you want to delete the hosted zone <b>{zone.name}</b> and its {zone.record_count} record
        {zone.record_count === 1 ? '' : 's'}? This can&apos;t be undone.
      </Box>
    </ConfirmModal>
  );
}
