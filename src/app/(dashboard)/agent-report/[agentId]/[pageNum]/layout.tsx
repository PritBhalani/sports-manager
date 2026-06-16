import { Suspense } from 'react';
export function generateStaticParams() { return [{ agentId: 'dummy', pageNum: 'dummy',  }]; }
export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}
