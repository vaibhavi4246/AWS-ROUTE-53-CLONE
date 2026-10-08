import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmModal from './ConfirmModal';

describe('ConfirmModal', () => {
  it('requires the confirmation word before the action is enabled', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal title="Delete hosted zone" confirmLabel="Delete" requireText="delete" onClose={() => {}} onConfirm={onConfirm}>
        <p>Sure?</p>
      </ConfirmModal>,
    );
    const confirm = screen.getByRole('button', { name: 'Delete' });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText('delete'), 'DELETE');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });

  it('confirms immediately when no word is required', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal title="Delete record" confirmLabel="Delete" onClose={() => {}} onConfirm={onConfirm}>
        <p>Sure?</p>
      </ConfirmModal>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it('is a labelled dialog that closes from the close icon and from Cancel', async () => {
    const onClose = vi.fn();
    render(
      <ConfirmModal title="Delete record" confirmLabel="Delete" onClose={onClose} onConfirm={() => {}}>
        <p>Sure?</p>
      </ConfirmModal>,
    );
    expect(screen.getByRole('dialog', { name: 'Delete record' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
