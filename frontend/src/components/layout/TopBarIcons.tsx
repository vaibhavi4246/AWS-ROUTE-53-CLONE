import React from 'react';

/** The Route 53 service tile: the official purple shield logo, also used as the favicon. */
export function Route53Tile({ size = 28 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/route53-logo.webp" width={size} height={size} alt="Route 53" style={{ display: 'block' }} />;
}

/**
 * The console's "services" control: a bold 3x3 grid of white rounded squares. Drawn at 22px, which is
 * larger than Cloudscape's 16px icon slot allows, so it is its own button rather than a Button icon.
 */
export function AppsGridIcon({ size = 22 }: { size?: number }) {
  const offsets = [0, 8.5, 17]; // 5px squares with a 3.5px gap fill a 22px box
  return (
    <svg viewBox="0 0 22 22" width={size} height={size} focusable="false" aria-hidden="true">
      {offsets.flatMap((y) => offsets.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" rx="1.6" fill="currentColor" />))}
    </svg>
  );
}

/** 16x16 icon for Cloudscape's `iconSvg` button slot. */

export const cloudShellIcon = (
  <svg viewBox="0 0 16 16" focusable="false" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" />
    <path d="M4.5 6l2.2 2-2.2 2M8.5 10.5h3" />
  </svg>
);
