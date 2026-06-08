'use client';

import { useSidebar } from '@/contexts/SidebarContext';
import WeeklyNotificationBanner from '@/components/WeeklyNotificationBanner';

import { usePathname } from 'next/navigation';

export default function MainContent({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();
    const pathname = usePathname() || '';

    const hideSidebar = pathname.includes('/acompanhar');

    return (
        <main className={`${hideSidebar ? '' : 'pt-16'} md:pt-0 min-h-screen transition-all duration-300 print:pl-0 ${hideSidebar ? '' : (isCollapsed ? 'md:pl-16' : 'md:pl-64')}`}>
            {!hideSidebar && <WeeklyNotificationBanner />}
            <div className={`${hideSidebar ? '' : 'container mx-auto p-4 md:p-8'}`}>
                {children}
            </div>
        </main>
    );
}
