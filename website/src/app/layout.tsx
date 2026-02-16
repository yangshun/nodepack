import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nodepack - Node.js in Your Browser',
  description: 'A browser-based Node.js runtime',
};

const poppins = Poppins({
  weight: '600',
  variable: '--font-poppins',
  subsets: ['latin'],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={poppins.variable}>{children}</body>
    </html>
  );
}
