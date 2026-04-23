import { DM_Sans, Syne } from 'next/font/google';
import './globals.css';

const bodyFont = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body'
});

const displayFont = Syne({
  subsets: ['latin'],
  variable: '--font-display'
});

export const metadata = {
  title: 'Aura Design',
  description: 'Dark liquid-glass portfolio and client review platform powered by Next.js and Supabase.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
