'use client';

import React from 'react';
import CollectionPreferences from '@cloudscape-design/components/collection-preferences';
import Header from '@cloudscape-design/components/header';
import Link from '@cloudscape-design/components/link';
import Pagination from '@cloudscape-design/components/pagination';
import Table, { type TableProps } from '@cloudscape-design/components/table';
import TextFilter from '@cloudscape-design/components/text-filter';
import type { SortDirection } from '@/lib/api/types';

export const PAGE_SIZES = [10, 20, 50] as const;

export interface SortState {
  key: string;
  dir: SortDirection;
}

interface ServerTableProps<T> {
  /** 'full-page' is the large, sticky-header variant used by the Hosted zones page. */
  variant?: 'container' | 'full-page';
  ariaLabel: string;
  title: string;
  description?: React.ReactNode;
  info?: boolean;
  actions?: React.ReactNode;

  items: T[];
  rowId: (item: T) => string;
  columns: TableProps.ColumnDefinition<T>[];
  loading: boolean;

  selectionType?: 'single' | 'multi';
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  isItemDisabled?: (item: T) => boolean;

  sort?: SortState;
  onSortChange: (sort: SortState) => void;

  filterText: string;
  onFilterChange: (text: string) => void;
  filterPlaceholder: string;
  /** Extra controls rendered beside the text filter (e.g. a type select). */
  filterExtras?: React.ReactNode;

  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  empty: React.ReactNode;
  noMatch: React.ReactNode;
}

/**
 * A Cloudscape table wired for server-side search, sorting and pagination. Both list screens
 * (hosted zones and records) use it, so they stay visually and behaviourally identical.
 */
export default function ServerTable<T>(props: ServerTableProps<T>) {
  const {
    variant = 'container',
    ariaLabel,
    title,
    description,
    info,
    actions,
    items,
    rowId,
    columns,
    loading,
    selectionType,
    selectedIds,
    onSelectionChange,
    isItemDisabled,
    sort,
    onSortChange,
    filterText,
    onFilterChange,
    filterPlaceholder,
    filterExtras,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    empty,
    noMatch,
  } = props;

  const pagesCount = Math.max(1, Math.ceil(total / pageSize));
  const selectedItems = items.filter((item) => selectedIds.includes(rowId(item)));
  const filtering = filterText.trim() !== '';

  return (
    <Table<T>
      variant={variant}
      stickyHeader={variant === 'full-page'}
      items={items}
      trackBy={rowId}
      columnDefinitions={columns}
      loading={loading}
      loadingText="Loading resources"
      selectionType={selectionType === 'single' ? 'single' : selectionType === 'multi' ? 'multi' : undefined}
      selectedItems={selectedItems}
      onSelectionChange={({ detail }) => onSelectionChange(detail.selectedItems.map(rowId))}
      isItemDisabled={isItemDisabled}
      sortingColumn={sort ? { sortingField: sort.key } : undefined}
      sortingDescending={sort?.dir === 'desc'}
      onSortingChange={({ detail }) =>
        onSortChange({ key: detail.sortingColumn.sortingField ?? '', dir: detail.isDescending ? 'desc' : 'asc' })
      }
      ariaLabels={{
        selectionGroupLabel: `${ariaLabel} selection`,
        allItemsSelectionLabel: () => 'Select all',
        itemSelectionLabel: (_, item) => `Select ${rowId(item)}`,
        tableLabel: ariaLabel,
      }}
      header={
        <Header
          variant={variant === 'full-page' ? 'awsui-h1-sticky' : 'h2'}
          counter={`(${total})`}
          description={description}
          info={info ? <Link variant="info">Info</Link> : undefined}
          actions={actions}
        >
          {title}
        </Header>
      }
      filter={
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', maxWidth: 810 }}>
            <TextFilter
              filteringText={filterText}
              filteringPlaceholder={filterPlaceholder}
              filteringAriaLabel={filterPlaceholder}
              countText={`${total} ${total === 1 ? 'match' : 'matches'}`}
              onChange={({ detail }) => onFilterChange(detail.filteringText)}
            />
          </div>
          {filterExtras}
        </div>
      }
      pagination={
        <Pagination
          currentPageIndex={page}
          pagesCount={pagesCount}
          onChange={({ detail }) => onPageChange(detail.currentPageIndex)}
          ariaLabels={{
            nextPageLabel: 'Next page',
            previousPageLabel: 'Previous page',
            pageLabel: (pageNumber) => `Page ${pageNumber} of ${pagesCount}`,
          }}
        />
      }
      preferences={
        <CollectionPreferences
          title="Preferences"
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          preferences={{ pageSize }}
          pageSizePreference={{
            title: 'Page size',
            options: PAGE_SIZES.map((size) => ({ value: size, label: `${size} resources` })),
          }}
          onConfirm={({ detail }) => detail.pageSize && onPageSizeChange(detail.pageSize)}
        />
      }
      empty={filtering ? noMatch : empty}
    />
  );
}
