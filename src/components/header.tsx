'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import AppSidebar from '@/components/app-sidebar';
import { PanelLeft } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

export default function Header() {
  const { openMobile, setOpenMobile } = useSidebar();
  console.log('Header component rendered. Is mobile menu open?', openMobile);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6 lg:hidden">
      <div className="flex items-center gap-4">
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="lg:hidden" onClick={() => console.log('SheetTrigger clicked!')}>
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Main navigation links for the application.</SheetDescription>
            </SheetHeader>
            <AppSidebar onLinkClick={() => {
              console.log('onLinkClick called from AppSidebar, closing mobile menu.');
              setOpenMobile(false);
            }} />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
