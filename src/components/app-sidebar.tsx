
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
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
import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/sessions', label: 'Sessions', icon: Swords },
  { href: '/games', label: 'Games', icon: Dices },
  { href: '/players', label: 'Players', icon: Users },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <>
      <SidebarHeader className="p-0">
         <Link href="/" onClick={() => setOpenMobile(false)}>
            <div className="relative flex items-center justify-center w-full h-[180px]" style={{ cursor: 'pointer' }}>
                <Image
                  src="/images/jeff-quest-logo.png"
                  alt="Jeff Quest! Logo"
                  fill
                  className="object-contain"
                />
            </div>
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
                  onClick={() => setOpenMobile(false)}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <div className="p-2">
        <Link href="/sessions/new" legacyBehavior passHref>
            <Button as="a" className="w-full" onClick={() => setOpenMobile(false)}>
                <PlusCircle className="mr-2" />
                New Session
            </Button>
        </Link>
      </div>
    </>
  );
}
