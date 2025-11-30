
'use client';

import { usePathname, useRouter } from 'next/navigation';
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
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = (href: string) => {
    router.push(href);
    setOpenMobile(false);
  };

  return (
    <>
      <SidebarHeader className="p-0">
         <Link href="/" onClick={() => handleLinkClick('/')}>
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
            <SidebarMenuButton
              isActive={pathname === item.href}
              tooltip={{ children: item.label }}
              onClick={() => handleLinkClick(item.href)}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <div className="p-2">
        <Button className="w-full" onClick={() => handleLinkClick('/sessions/new')}>
            <PlusCircle className="mr-2" />
            New Session
        </Button>
      </div>
    </>
  );
}
