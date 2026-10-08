'use client';

import React, { useState } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Modal from '@cloudscape-design/components/modal';
import SpaceBetween from '@cloudscape-design/components/space-between';

interface ConfirmModalProps {
  title: string;
  confirmLabel: string;
  children: React.ReactNode;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  /** When set, the user must type this word before the action is enabled (Route 53 style). */
  requireText?: string;
}

export default function ConfirmModal({ title, confirmLabel, children, onConfirm, onClose, requireText }: ConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const confirmed = !requireText || typed.trim().toLowerCase() === requireText;

  const submit = async () => {
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible
      onDismiss={onClose}
      closeAriaLabel="Close dialog"
      header={title}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!confirmed} loading={busy} onClick={submit}>
              {confirmLabel}
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {children}
        {requireText && (
          <FormField label={`To confirm deletion, type "${requireText}" in the field.`}>
            <Input
              value={typed}
              placeholder={requireText}
              onChange={({ detail }) => setTyped(detail.value)}
              onKeyDown={({ detail }) => detail.key === 'Enter' && void submit()}
              autoFocus
            />
          </FormField>
        )}
      </SpaceBetween>
    </Modal>
  );
}
