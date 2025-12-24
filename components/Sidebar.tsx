'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const isActive = (path: string) => {
        return pathname === path || pathname.startsWith(`${path}/`);
    };

    type MenuItem =
        | { type: 'link'; href: string; label: string; icon: string }
        | { type: 'separator' };

    const menuItems: MenuItem[] = [
        { type: 'link', href: '/', label: 'Home', icon: '🏠' },
        { type: 'link', href: '/territorios', label: 'Territórios', icon: '🗺️' },
        { type: 'separator' },
        { type: 'link', href: '/programacao', label: 'Reunião de Quinta', icon: '📅' },
        { type: 'link', href: '/admin/discursos', label: 'Discursos', icon: '🎤' },
        { type: 'separator' },
        { type: 'link', href: '/admin/escalas', label: 'Outras Designações', icon: '📋' },
        { type: 'link', href: '/admin/campo', label: 'Campo', icon: '👜' },
        { type: 'link', href: '/admin/limpeza', label: 'Limpeza', icon: '🧹' },
        { type: 'separator' },
        { type: 'link', href: '/admin/cadastros', label: 'Cadastros', icon: '📚' },
        { type: 'link', href: '/admin/grupos', label: 'Grupos', icon: '🏘️' },
        { type: 'link', href: '/admin/membros', label: 'Membros', icon: '👥' },
        { type: 'link', href: '/admin/territorios', label: 'Gerenciar Territórios', icon: '⚙️' },
        { type: 'separator' },
        { type: 'link', href: '/admin/permissoes', label: 'Permissões', icon: '🔒' },
    ];

    const toggleMenu = () => setIsOpen(!isOpen);

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

                <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-80px)]">
                    {menuItems.map((item, index) => {
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
                    <div className="text-xs text-center text-slate-400">
                        v0.1.0
                    </div>
                </div>
            </aside>
        </>
    );
}
