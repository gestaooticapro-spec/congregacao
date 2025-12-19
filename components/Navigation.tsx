'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
    const pathname = usePathname();

    const isActive = (path: string) => {
        return pathname === path || pathname.startsWith(`${path}/`);
    };
    const links = [
        { href: '/', label: 'Home' },
        { href: '/programacao', label: 'Programação' },
        { href: '/admin/membros', label: 'Membros' },
        { href: '/admin/grupos', label: 'Grupos' },
        { href: '/admin/campo', label: 'Campo' },
        { href: '/admin/limpeza', label: 'Limpeza' },
        { href: '/admin/escalas', label: 'Escalas' },
        { href: '/admin/permissoes', label: 'Permissões' },
    ];

    return (
        <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 p-4 shadow-sm">
            <div className="container mx-auto flex justify-between items-center">
                <Link href="/" className="text-xl font-bold text-primary">
                    Congregation Manager
                </Link>
                <ul className="flex space-x-2">
                    {links.map((link) => (
                        <li key={link.href}>
                            <Link
                                href={link.href}
                                className={`hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(link.href) && link.href !== '/'
                                    ? 'bg-primary text-white hover:bg-blue-700'
                                    : 'text-slate-600 dark:text-slate-300'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
}
