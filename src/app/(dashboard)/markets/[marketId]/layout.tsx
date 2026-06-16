import { Suspense } from 'react';
export function generateStaticParams() { return [{ marketId: 'dummy',  }]; }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
