
'use client';

import { Sidebar } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import Header from '@/components/header';
import { useGames } from '@/context/game-context';
import { Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import React, { useState, useEffect } from 'react';
import { useIsMounted } from '@/hooks/use-is-mounted';

export default function AppLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading: isDataLoading } = useGames();
  const isMobile = useIsMobile();
  const isMounted = useIsMounted();

  if (!isMounted) {
    return null;
  }

  if (isDataLoading) {
    return (
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </main>
    );
  }

  return (
    <>
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        className="bg-sidebar text-sidebar-foreground"
        isMobile={isMobile}
      >
        <AppSidebar />
      </Sidebar>
      <div className="flex flex-1 flex-col lg:pl-[--sidebar-width-icon]">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
        </main>
      </div>
    </>
  );
}
