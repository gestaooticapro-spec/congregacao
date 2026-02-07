'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthProvider';
import { PerfilAcesso } from '@/types/database.types';
import PasswordReminderModal from './admin/PasswordReminderModal';

const logSidebar = (message: string, details?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString();
    if (details) {
        console.log(`[Sidebar][${timestamp}] ${message}`, details);
        return;
    }
    console.log(`[Sidebar][${timestamp}] ${message}`);
};

type MenuItem =
    | { type: 'link'; href: string; label: string; icon: string; restricted?: boolean; allowedRoles?: PerfilAcesso[] }
    | { type: 'separator'; label?: string; restricted?: boolean; allowedRoles?: PerfilAcesso[] };

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const { isCollapsed, toggleCollapsed } = useSidebar();

    const { user, session, loading: authLoading, hasRole } = useAuth();

    const [isSharedAdmin, setIsSharedAdmin] = useState(false);
    const [checkingAdmin, setCheckingAdmin] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [showReminder, setShowReminder] = useState(true);

    const loginManagementLabel = checkingAdmin
        ? 'Meu Login'
        : isSharedAdmin
            ? 'Crie Sua Senha'
            : 'Altere Sua Senha';


    useEffect(() => {
        let active = true;

        const checkAdmin = async () => {
            if (!user?.id) {
                if (active) {
                    setIsSharedAdmin(false);
                    setCheckingAdmin(false);
                }
                return;
            }

            setCheckingAdmin(true);
            const shared = await checkIfSharedAdmin(user.id);

            if (active) {
                setIsSharedAdmin(shared);
                setCheckingAdmin(false);
            }
        };

        if (!authLoading) {
            void checkAdmin();
        }

        return () => {
            active = false;
        };
    }, [user?.id, authLoading]);

    useEffect(() => {
        logSidebar('Auth snapshot', {
            hasSession: !!session,
            userId: user?.id ?? null,
            authLoading,
            checkingAdmin,
            isSharedAdmin,
        });
    }, [session, user?.id, authLoading, checkingAdmin, isSharedAdmin]);

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        logSidebar('Logout requested');

        try {
            const { error: globalError } = await supabase.auth.signOut({ scope: 'global' });

            if (globalError) {
                logSidebar('Global logout failed, trying local signOut', { error: globalError.message });
                const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
                if (localError) {
                    logSidebar('Local logout also failed', { error: localError.message });
                }
            }
        } catch (error) {
            logSidebar('Logout exception', {
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setIsOpen(false);
            router.replace('/login');
            router.refresh();
            setLoggingOut(false);
        }
    };

    const checkIfSharedAdmin = async (userId: string): Promise<boolean> => {
        logSidebar('Checking shared-admin profile', { userId });

        try {
            const { data: membro, error } = await supabase
                .from('membros')
                .select('id, nome_completo')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) throw error;

            if (!membro) {
                logSidebar('User has no membro row, treating as shared admin', { userId });
                return true;
            }

            const shared = membro.nome_completo.toLowerCase().includes('admin');
            logSidebar('Shared-admin check completed', { userId, shared });
            return shared;
        } catch (error) {
            logSidebar('Shared-admin check failed', {
                userId,
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    };

    const isActive = (path: string) => {
        return pathname === path || pathname.startsWith(`${path}/`);
    };

    const menuItems: MenuItem[] = [
        { type: 'link', href: '/', label: 'Home', icon: '🏠' },
        { type: 'link', href: '/quadro-de-anuncios', label: 'Quadro de Anúncios', icon: '📢' },
        { type: 'link', href: '/territorios', label: 'Territórios', icon: '🗺️' },
        { type: 'link', href: '/saidas', label: 'Horário de Campo', icon: '👜' },

        { type: 'separator', label: 'Área Comum', restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT', 'IRMAO'] },
        { type: 'link', href: '/admin/meu-login', label: loginManagementLabel, icon: isSharedAdmin ? '🔑' : '🛡️', restricted: true },
        { type: 'link', href: '/admin/agenda', label: 'Agenda e Lembretes', icon: '📅', restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT', 'IRMAO'] },
        { type: 'link', href: '/admin/eventos', label: 'Gerenciar Eventos', icon: '🗓️', restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT', 'IRMAO'] },
        { type: 'link', href: '/admin/pauta-anciaos', label: 'Pauta de Reunião', icon: '📋', restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT', 'IRMAO'] },
        { type: 'link', href: '/admin/relatorios', label: 'Relatórios', icon: '📊', restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT', 'IRMAO'] },

        { type: 'separator', label: 'Administração', restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT'] },
        { type: 'link', href: '/programacao', label: 'Reunião de Quarta', icon: '📖', restricted: true, allowedRoles: ['ADMIN', 'RESP_QUINTA'] },
        { type: 'link', href: '/admin/discursos', label: 'Discursos', icon: '🎤', restricted: true, allowedRoles: ['ADMIN', 'RESP_SABADO'] },
        { type: 'link', href: '/admin/escalas', label: 'Outras Designações', icon: '📋', restricted: true, allowedRoles: ['ADMIN', 'RQA'] },
        { type: 'link', href: '/admin/campo', label: 'Campo', icon: '👜', restricted: true, allowedRoles: ['ADMIN', 'RQA'] },
        { type: 'link', href: '/admin/limpeza', label: 'Limpeza', icon: '🧹', restricted: true, allowedRoles: ['ADMIN', 'SUPERINTENDENTE_SERVICO'] },
        { type: 'link', href: '/admin/cadastros', label: 'Cadastros', icon: '📚', restricted: true, allowedRoles: ['ADMIN', 'RESP_SABADO'] },
        { type: 'link', href: '/admin/grupos', label: 'Grupos', icon: '🏘️', restricted: true, allowedRoles: ['ADMIN', 'SUPERINTENDENTE_SERVICO'] },
        { type: 'link', href: '/admin/membros', label: 'Membros', icon: '👥', restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA'] },
        { type: 'link', href: '/admin/territorios', label: 'Gerenciar Territórios', icon: '⚙️', restricted: true, allowedRoles: ['ADMIN', 'RT'] },
        { type: 'link', href: '/admin/permissoes', label: 'Permissões', icon: '🔒', restricted: true, allowedRoles: ['ADMIN'] },
    ];

    const toggleMenu = () => setIsOpen(!isOpen);

    const visibleItems = menuItems.filter(item => {
        if (!item.restricted) return true;
        if (authLoading) return false;
        if (!session) return false;
        if (item.allowedRoles && !hasRole(item.allowedRoles)) return false;
        return true;
    });

    return (
        <>
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 z-40 shadow-sm print:hidden">
                <button
                    onClick={toggleMenu}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <span className="ml-4 font-bold text-lg text-slate-800 dark:text-white">
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Cong</span>
                    <span>Guaíra</span>
                </span>
            </div>

            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transition-all duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:translate-x-0 print:hidden flex flex-col ${isCollapsed ? 'md:w-16' : 'md:w-64'} w-64`}
            >
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <Link href="/" className={`text-xl font-bold ${isCollapsed ? 'md:hidden' : ''}`} onClick={() => setIsOpen(false)}>
                        <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Cong</span>
                        <span className="text-slate-700 dark:text-white">Guaíra</span>
                    </Link>
                    <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-500 hover:text-slate-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <button
                        onClick={toggleCollapsed}
                        className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                    >
                        <svg
                            className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>

                <nav className={`space-y-2 overflow-y-auto flex-1 thin-scrollbar ${isCollapsed ? 'md:p-2 p-4' : 'p-4'}`}>
                    {visibleItems.map((item, index) => {
                        if (item.type === 'separator') {
                            return (
                                <div key={`sep-${index}`} className="my-2">
                                    <div className="border-t border-slate-100 dark:border-slate-800" />
                                    {item.label && !isCollapsed && (
                                        <span className="block px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            {item.label}
                                        </span>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                title={isCollapsed ? item.label : undefined}
                                className={`flex items-center gap-3 py-3 rounded-xl transition-all duration-200 font-medium ${isCollapsed ? 'md:justify-center md:px-2 px-4' : 'px-4'} ${isActive(item.href) && item.href !== '/'
                                    ? 'bg-primary text-white shadow-md shadow-blue-500/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-white'
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span className={isCollapsed ? 'md:hidden' : ''}>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={`border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 ${isCollapsed ? 'md:p-2 p-4' : 'p-4'}`}>
                    {session ? (
                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            title={isCollapsed ? 'Sair' : undefined}
                            className={`flex items-center gap-3 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 font-medium disabled:opacity-60 disabled:cursor-not-allowed ${isCollapsed ? 'md:justify-center md:px-2 px-4' : 'px-4'}`}
                        >
                            <span className="text-xl">🚪</span>
                            <span className={isCollapsed ? 'md:hidden' : ''}>{loggingOut ? 'Saindo...' : 'Sair'}</span>
                        </button>
                    ) : !authLoading && (
                        <Link
                            href="/login"
                            onClick={() => setIsOpen(false)}
                            title={isCollapsed ? 'Login' : undefined}
                            className={`flex items-center gap-3 py-3 w-full rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 font-medium ${isCollapsed ? 'md:justify-center md:px-2 px-4' : 'px-4'}`}
                        >
                            <span className="text-xl">🔐</span>
                            <span className={isCollapsed ? 'md:hidden' : ''}>Login</span>
                        </Link>
                    )}

                    <div className={`mt-2 text-xs text-center text-slate-400 ${isCollapsed ? 'md:hidden' : ''}`} suppressHydrationWarning>
                        v0.1.0
                    </div>
                </div>
            </aside>

            <PasswordReminderModal
                isOpen={isSharedAdmin && showReminder && !authLoading && !checkingAdmin}
                onClose={() => setShowReminder(false)}
            />
        </>
    );
}
