'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setLoading(false);
            if (_event === 'SIGNED_OUT') {
                router.push('/');
            }
        });

        return () => subscription.unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
        setIsOpen(false);
    };

    const isActive = (path: string) => {
        return pathname === path || pathname.startsWith(`${path}/`);
    };

    type MenuItem =
        | { type: 'link'; href: string; label: string; icon: string; restricted?: boolean }
        | { type: 'separator'; restricted?: boolean };

    const menuItems: MenuItem[] = [
        { type: 'link', href: '/', label: 'Home', icon: '🏠' },
        { type: 'link', href: '/territorios', label: 'Territórios', icon: '🗺️' },
        { type: 'separator' },
        // Restricted Items
        { type: 'link', href: '/programacao', label: 'Reunião de Quinta', icon: '📅', restricted: true },
        { type: 'link', href: '/admin/discursos', label: 'Discursos', icon: '🎤', restricted: true },
        { type: 'separator', restricted: true },
        { type: 'link', href: '/admin/escalas', label: 'Outras Designações', icon: '📋', restricted: true },
        { type: 'link', href: '/admin/campo', label: 'Campo', icon: '👜', restricted: true },
        { type: 'link', href: '/admin/limpeza', label: 'Limpeza', icon: '🧹', restricted: true },
        { type: 'separator', restricted: true },
        { type: 'link', href: '/admin/cadastros', label: 'Cadastros', icon: '📚', restricted: true },
        { type: 'link', href: '/admin/grupos', label: 'Grupos', icon: '🏘️', restricted: true },
        { type: 'link', href: '/admin/membros', label: 'Membros', icon: '👥', restricted: true },
        { type: 'link', href: '/admin/territorios', label: 'Gerenciar Territórios', icon: '⚙️', restricted: true },
        { type: 'separator', restricted: true },
        { type: 'link', href: '/admin/permissoes', label: 'Permissões', icon: '🔒', restricted: true },
    ];

    const toggleMenu = () => setIsOpen(!isOpen);

    // Filter items based on auth state
    const visibleItems = menuItems.filter(item => {
        if (loading) return false; // Hide everything while loading (or show skeleton)
        if (item.restricted && !session) return false;
        return true;
    });

    return (
        <>
            {/* Mobile Header */}
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

            {/* Overlay for Mobile */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-50 transition-transform duration-300 ease-in-out transform ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:translate-x-0 print:hidden`}
            >
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <Link href="/" className="text-xl font-bold" onClick={() => setIsOpen(false)}>
                        <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Cong</span>
                        <span className="text-slate-700 dark:text-white">Guaíra</span>
                    </Link>
                    <button onClick={() => setIsOpen(false)} className="md:hidden text-slate-500 hover:text-slate-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-140px)]">
                    {!loading && visibleItems.map((item, index) => {
                        if (item.type === 'separator') {
                            return <div key={`sep-${index}`} className="my-2 border-t border-slate-100 dark:border-slate-800" />
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive(item.href) && item.href !== '/'
                                    ? 'bg-primary text-white shadow-md shadow-blue-500/20'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-white'
                                    }`}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    {!loading && (
                        session ? (
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 font-medium"
                            >
                                <span className="text-xl">🚪</span>
                                <span>Sair</span>
                            </button>
                        ) : (
                            <Link
                                href="/login"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 font-medium"
                            >
                                <span className="text-xl">🔐</span>
                                <span>Login</span>
                            </Link>
                        )
                    )}
                    <div className="mt-2 text-xs text-center text-slate-400">
                        v0.1.0
                    </div>
                </div>
            </aside>
        </>
    );
}
