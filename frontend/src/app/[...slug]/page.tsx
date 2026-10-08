'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import ComingSoon from '@/components/ui/ComingSoon';
import { findNavLeaf } from '@/lib/navigation';

/** Every console section that is not hosted zones or the dashboard renders a placeholder. */
export default function MockedSectionPage() {
  const pathname = usePathname();
  const leaf = findNavLeaf(pathname);
  const last = pathname.split('/').filter(Boolean).pop() ?? 'Page';
  const title = leaf?.label ?? last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
  return <ComingSoon title={title} />;
}
