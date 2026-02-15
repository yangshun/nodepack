import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nodepack - Node.js in Your Browser',
  description: 'A browser-based Node.js runtime',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
