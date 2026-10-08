'use client';

import React, { useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FileUpload from '@cloudscape-design/components/file-upload';
import FormField from '@cloudscape-design/components/form-field';
import Modal from '@cloudscape-design/components/modal';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import { recordsApi } from '@/lib/api/resources';
import type { HostedZone, ImportResult, TransferFormat } from '@/lib/api/types';

interface ImportZoneModalProps {
  zone: HostedZone;
  onClose: () => void;
  /** Called after a successful import so the table can refresh. */
  onImported: (result: ImportResult) => void;
}

const FORMAT_OPTIONS = [
  { value: 'bind', label: 'BIND zone file' },
  { value: 'json', label: 'JSON (as exported from this console)' },
];

export default function ImportZoneModal({ zone, onClose, onImported }: ImportZoneModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [format, setFormat] = useState<TransferFormat>('bind');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<ImportResult>();

  const submit = async () => {
    if (files.length === 0) return;
    setBusy(true);
    setError(undefined);
    try {
      const imported = await recordsApi.importFile(zone.id, files[0], format);
      setResult(imported);
      onImported(imported);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <Modal
        visible
        size="large"
        onDismiss={onClose}
        header="Import zone file"
        footer={
          <Box float="right">
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type={result.imported_count > 0 ? 'success' : 'warning'}>
            Imported {result.imported_count} record{result.imported_count === 1 ? '' : 's'}
            {result.skipped.length > 0 && `; skipped ${result.skipped.length}`}.
          </Alert>
          {result.skipped.length > 0 && (
            <Table
              variant="embedded"
              items={result.skipped}
              header={<Box variant="h3">Skipped records</Box>}
              columnDefinitions={[
                { id: 'name', header: 'Name', cell: (item) => item.name },
                { id: 'type', header: 'Type', cell: (item) => item.type },
                { id: 'reason', header: 'Reason', cell: (item) => item.reason },
              ]}
            />
          )}
        </SpaceBetween>
      </Modal>
    );
  }

  return (
    <Modal
      visible
      onDismiss={onClose}
      closeAriaLabel="Close dialog"
      header="Import zone file"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" disabled={files.length === 0} loading={busy} onClick={submit}>
              Import
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        <Box color="text-body-secondary">
          Add records to <b>{zone.name}</b> from a file. The apex SOA and NS records are managed by Route 53 and are always skipped.
        </Box>
        {error && <Alert type="error">{error}</Alert>}
        <FormField label="Format">
          <Select
            selectedOption={FORMAT_OPTIONS.find((option) => option.value === format) ?? null}
            options={FORMAT_OPTIONS}
            onChange={({ detail }) => setFormat(detail.selectedOption.value as TransferFormat)}
          />
        </FormField>
        <FormField label="File" constraintText="UTF-8 text up to 1 MB.">
          <FileUpload
            value={files}
            onChange={({ detail }) => setFiles(detail.value)}
            accept=".zone,.txt,.json,.conf"
            showFileLastModified={false}
            showFileSize
            i18nStrings={{
              uploadButtonText: () => 'Choose file',
              dropzoneText: () => 'Drop file to upload',
              removeFileAriaLabel: () => 'Remove file',
              limitShowFewer: 'Show fewer files',
              limitShowMore: 'Show more files',
              errorIconAriaLabel: 'Error',
            }}
          />
        </FormField>
      </SpaceBetween>
    </Modal>
  );
}
