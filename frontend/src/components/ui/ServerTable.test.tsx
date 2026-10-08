import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ServerTable from './ServerTable';

interface Row {
  id: string;
  name: string;
  locked?: boolean;
}

const rows: Row[] = [
  { id: 'a', name: 'alpha' },
  { id: 'b', name: 'bravo', locked: true },
  { id: 'c', name: 'charlie' },
];

type Props = React.ComponentProps<typeof ServerTable<Row>>;

function renderTable(overrides: Partial<Props> = {}) {
  const props: Props = {
    ariaLabel: 'Things',
    title: 'Things',
    items: rows,
    rowId: (row) => row.id,
    columns: [{ id: 'name', header: 'Name', sortingField: 'name', cell: (row) => row.name }],
    loading: false,
    selectedIds: [],
    onSelectionChange: () => {},
    onSortChange: () => {},
    filterText: '',
    onFilterChange: () => {},
    filterPlaceholder: 'Filter things',
    page: 1,
    pageSize: 10,
    total: 3,
    onPageChange: () => {},
    onPageSizeChange: () => {},
    empty: <span>Nothing here</span>,
    noMatch: <span>No matches found</span>,
    ...overrides,
  };
  return render(<ServerTable<Row> {...props} />);
}

describe('ServerTable', () => {
  it('renders the title, counter and rows', () => {
    renderTable();
    expect(screen.getByRole('heading', { name: /Things/ })).toHaveTextContent('(3)');
    expect(screen.getByText('bravo')).toBeInTheDocument();
  });

  it('shows the empty state, or the no-match state while a filter is active', () => {
    const { unmount } = renderTable({ items: [], total: 0 });
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    unmount();
    renderTable({ items: [], total: 0, filterText: 'zzz' });
    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });

  it('single selection reports the clicked row id', async () => {
    const onSelectionChange = vi.fn();
    renderTable({ selectionType: 'single', onSelectionChange });
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    await userEvent.click(screen.getByRole('radio', { name: 'Select c' }));
    expect(onSelectionChange).toHaveBeenCalledWith(['c']);
  });

  it('multi selection renders checkboxes and respects disabled rows', () => {
    renderTable({ selectionType: 'multi', isItemDisabled: (row) => !!row.locked });
    expect(screen.getByRole('checkbox', { name: 'Select b' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Select a' })).toBeEnabled();
  });

  it('requests ascending then descending sort from the column header', async () => {
    const onSortChange = vi.fn();
    const { unmount } = renderTable({ onSortChange });
    await userEvent.click(screen.getByText('Name'));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', dir: 'asc' });
    unmount();

    renderTable({ onSortChange, sort: { key: 'name', dir: 'asc' } });
    await userEvent.click(screen.getByText('Name'));
    expect(onSortChange).toHaveBeenLastCalledWith({ key: 'name', dir: 'desc' });
  });

  it('reports filter text and page changes', async () => {
    const onFilterChange = vi.fn();
    const onPageChange = vi.fn();
    renderTable({ onFilterChange, onPageChange, total: 30, pageSize: 10 });
    await userEvent.type(screen.getByPlaceholderText('Filter things'), 'x');
    expect(onFilterChange).toHaveBeenCalledWith('x');

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
