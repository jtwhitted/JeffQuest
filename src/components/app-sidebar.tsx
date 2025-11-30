'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutGrid,
  Swords,
  Users,
  Dices,
  PlusCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import Image from 'next/image';
import { useSidebar } from './ui/sidebar';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/sessions', label: 'Sessions', icon: Swords },
  { href: '/games', label: 'Games', icon: Dices },
  { href: '/players', label: 'Players', icon: Users },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <>
      <SidebarHeader className="p-0">
         <Link href="/" className="relative flex items-center justify-center w-full h-[180px]">
            <Image
              src="/images/jeff-quest-logo.png"
              alt="Jeff Quest! Logo"
              fill
              className="object-contain"
            />
          </Link>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                as="a"
                isActive={pathname === item.href}
                tooltip={{ children: item.label }}
                onClick={handleLinkClick}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <div className="p-2">
        <Button asChild className="w-full">
            <Link href="/sessions/new" onClick={handleLinkClick}>
                <PlusCircle className="mr-2" />
                New Session
            </Link>
        </Button>
      </div>
    </>
  );
}
