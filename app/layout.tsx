import type {Metadata, Viewport} from 'next';
import {IBM_Plex_Mono, Instrument_Sans} from 'next/font/google';
import './globals.css';

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Evaluaciones · Hotel Zeus',
  description: 'Evaluación mensual del personal de Hotel Zeus, Riobamba.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es" className={`${instrument.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
