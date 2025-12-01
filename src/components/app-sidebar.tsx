
'use client';

import { usePathname, useRouter } from 'next/navigation';
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

interface AppSidebarProps {
  onLinkClick?: () => void;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/sessions', label: 'Sessions', icon: Swords },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/games', label: 'Games', icon: Dices },
];

export default function AppSidebar({ onLinkClick }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLinkClick = (href: string) => {
    router.push(href);
    if (onLinkClick) {
      onLinkClick();
    }
  };

  return (
    <>
      <SidebarHeader className="p-0">
        <div className="relative flex items-center justify-center w-full h-[180px]" style={{ cursor: 'pointer' }} onClick={() => handleLinkClick('/')}>
            <Image
            src="/images/jeff-quest-logo.png"
            alt="Jeff Quest! Logo"
            fill
            className="object-contain"
            />
        </div>
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
