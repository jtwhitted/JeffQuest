
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { GameProvider } from '@/context/game-context';
import { getInitialData } from '@/lib/data';
import AppLayoutClient from '@/components/app-layout-client';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: 'Jeff Quest!',
  description: 'Keep track of your board game records.',
  openGraph: {
    title: 'Jeff Quest!',
    description: 'Keep track of your board game records.',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialData = await getInitialData();

  return (
    <html lang="en" className="dark">
      <body className={cn('font-body antialiased', ptSans.variable)}>
        <GameProvider initialData={initialData}>
          <SidebarProvider>
            <AppLayoutClient>{children}</AppLayoutClient>
          </SidebarProvider>
        </GameProvider>
        <Toaster />
      </body>
    </html>
  );
}
