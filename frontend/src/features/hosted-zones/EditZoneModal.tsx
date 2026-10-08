'use client';

import React, { useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { hostedZonesApi } from '@/lib/api/resources';
import type { HostedZone } from '@/lib/api/types';

const MAX_DESCRIPTION = 256;

interface EditZoneModalProps {
  zone: HostedZone;
  onClose: () => void;
  onSaved: (zone: HostedZone) => void;
}

/** Route 53 only lets you change a hosted zone's comment, so that is all this edits. */
export default function EditZoneModal({ zone, onClose, onSaved }: EditZoneModalProps) {
  const [description, setDescription] = useState(zone.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    setBusy(true);
    setError(undefined);
    try {
      onSaved(await hostedZonesApi.updateDescription(zone.id, description.trim()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save changes');
      setBusy(false);
    }
  };

  return (
    <Modal
      visible
      onDismiss={onClose}
      closeAriaLabel="Close dialog"
      header="Edit hosted zone"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" loading={busy} onClick={submit}>
              Save changes
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {error && <Alert type="error">{error}</Alert>}
        <FormField label="Hosted zone name">
          <Input value={zone.name} disabled readOnly />
        </FormField>
        <FormField
          label={
            <>
              Description <i>- optional</i>
            </>
          }
          constraintText={`${description.length}/${MAX_DESCRIPTION} characters`}
        >
          <Textarea value={description} rows={3} onChange={({ detail }) => setDescription(detail.value.slice(0, MAX_DESCRIPTION))} />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
