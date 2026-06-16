import { Suspense } from 'react';
export function generateStaticParams() { return [{ playerId: 'dummy', marketId: 'dummy',  }]; }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
