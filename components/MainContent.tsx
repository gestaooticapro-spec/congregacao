'use client';

import { useSidebar } from '@/contexts/SidebarContext';
import WeeklyNotificationBanner from '@/components/WeeklyNotificationBanner';
import ReportNotificationBanner from '@/components/ReportNotificationBanner';
import AbsenceConflictBanner from '@/components/AbsenceConflictBanner';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';

export default function MainContent({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();
    const pathname = usePathname() || '';
    const { user, loading, territoryOnly } = useAuth();

    const hideSidebar = pathname.includes('/acompanhar') || pathname === '/laurinha';
    const restrictedPage = pathname.startsWith('/admin') || pathname === '/anciaos' || pathname === '/responsabilidades' || pathname.startsWith('/administracao');
    const territoryPage = pathname === '/admin/territorios' || pathname.startsWith('/admin/territorios/') || pathname === '/admin/meu-login' || pathname === '/responsabilidades' || pathname === '/administracao';
    const blocked = territoryOnly && restrictedPage && !territoryPage;
    const waiting = !!user && loading && restrictedPage;

    return (
        <main className={`${hideSidebar ? '' : 'pt-16'} md:pt-0 min-h-screen w-full min-w-0 overflow-x-clip transition-all duration-300 print:pl-0 print:overflow-visible ${hideSidebar ? '' : (isCollapsed ? 'md:pl-16' : 'md:pl-64')}`}>
            {!hideSidebar && <WeeklyNotificationBanner />}
            {!hideSidebar && <ReportNotificationBanner />}
            {!hideSidebar && <AbsenceConflictBanner />}
            <div className={`${hideSidebar ? '' : 'mx-auto w-full min-w-0 max-w-7xl p-4 md:p-8 overflow-x-clip print:overflow-visible'}`}>
                {waiting ? <p>Carregando...</p> : blocked ? <p>Esta página não está disponível para este acesso.</p> : children}
            </div>
        </main>
    );
}
