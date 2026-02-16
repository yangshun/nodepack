'use client';

import dynamic from 'next/dynamic';

const App = dynamic(() => import('@/components/app').then((mod) => ({ default: mod.App })), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg text-gray-300">
      <div className="w-8 h-8 border-4 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
    </div>
  ),
});

export default function Page() {
  return <App />;
}
