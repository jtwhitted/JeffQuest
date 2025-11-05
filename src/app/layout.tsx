import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import Header from '@/components/header';
import { cn } from '@/lib/utils';
import { GameProvider } from '@/context/game-context';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: 'Tabletop Tracker',
  description: 'Keep track of your board game records.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={cn('font-body antialiased', ptSans.variable)}>
        <GameProvider>
          <SidebarProvider>
            <Sidebar
              collapsible="icon"
              variant="sidebar"
              className="hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col"
            >
              <AppSidebar />
            </Sidebar>
            <div className="flex flex-1 flex-col lg:pl-[--sidebar-width-icon]">
              <Header />
              <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
          </SidebarProvider>
        </GameProvider>
        <Toaster />
      </body>
    </html>
  );
}
