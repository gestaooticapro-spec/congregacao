'use client';

import { useSidebar } from '@/contexts/SidebarContext';

export default function MainContent({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();

    return (
        <main className={`pt-16 md:pt-0 min-h-screen transition-all duration-300 print:pl-0 ${isCollapsed ? 'md:pl-16' : 'md:pl-64'}`}>
            <div className="container mx-auto p-4 md:p-8">
                {children}
            </div>
        </main>
    );
}
