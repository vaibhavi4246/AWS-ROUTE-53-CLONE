import { redirect } from 'next/navigation';

/** The console has no landing page of its own; AppShell sends signed-out users on to /login. */
export default function IndexPage() {
  redirect('/hosted-zones');
}
