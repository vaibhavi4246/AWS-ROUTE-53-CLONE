import React from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import Modal from '@cloudscape-design/components/modal';
import Table from '@cloudscape-design/components/table';

const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: '/  or  Alt + S', action: 'Focus the global search' },
  { keys: 'c', action: 'Create (hosted zone or record, depending on the page)' },
  { keys: 'r', action: 'Refresh the current table' },
  { keys: '?', action: 'Show this list' },
  { keys: 'Esc', action: 'Close a dialog' },
];

export default function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      visible
      onDismiss={onClose}
      closeAriaLabel="Close dialog"
      header="Keyboard shortcuts"
      footer={
        <Box float="right">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </Box>
      }
    >
      <Table
        variant="embedded"
        items={SHORTCUTS}
        trackBy="keys"
        columnDefinitions={[
          { id: 'keys', header: 'Shortcut', width: 180, cell: (item) => <Box variant="code">{item.keys}</Box> },
          { id: 'action', header: 'Action', cell: (item) => item.action },
        ]}
      />
    </Modal>
  );
}
