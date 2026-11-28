import { redirect } from 'next/navigation';

/** The console has no public home page; the session gate handles signed-out visitors. */
export default function RootPage() {
  redirect('/dashboard');
}
