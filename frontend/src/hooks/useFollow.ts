import { useRouter } from 'next/navigation';

interface FollowEvent {
  detail: { href?: string; external?: boolean };
  preventDefault: () => void;
}

/**
 * Cloudscape links and buttons render real <a href> elements. This handler turns a plain click into
 * client-side navigation while leaving ctrl/cmd-click and external links to the browser.
 */
export function useFollow() {
  const router = useRouter();
  return (event: FollowEvent) => {
    const { href, external } = event.detail;
    if (!href || external) return;
    event.preventDefault();
    router.push(href);
  };
}
