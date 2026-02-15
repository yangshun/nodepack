'use client';

import dynamic from 'next/dynamic';

const ClientApp = dynamic(
  () => import('@/components/client-app').then((mod) => ({ default: mod.App })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg text-gray-300">
        <p>Loading Nodepack...</p>
      </div>
    ),
  },
);

export default function Page() {
  return <ClientApp />;
}
