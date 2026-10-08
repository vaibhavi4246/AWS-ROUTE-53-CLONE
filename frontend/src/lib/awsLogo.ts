/** The "aws" wordmark with its smile, inlined as a data URI so it needs no asset request. */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" width="48" height="32">
<text x="2" y="18" fill="#ffffff" font-size="19" font-weight="700" font-family="Arial, Helvetica, sans-serif">aws</text>
<path d="M3 24c10 5 27 5 41-1" stroke="#ff9900" stroke-width="2.6" fill="none" stroke-linecap="round"/>
</svg>`;

export const AWS_LOGO_SRC = `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`;
