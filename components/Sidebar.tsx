'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useMemo, memo } from 'react'
import { useAuth } from '@/contexts/AuthProvider'
import { useSidebar } from '@/contexts/SidebarContext'
import { PerfilAcesso } from '@/types/database.types'
import {
    Home,
    LayoutDashboard,
    Map,
    Calendar,
    LogOut,
    Settings,
    Users,
    FileText,
    UserCheck,
    ClipboardList,
    Menu,
    ChevronLeft,
    X,
    PlusCircle,
    ShieldCheck,
    BookOpen,
    Mic,
    Eraser,
    Library,
    Users2
} from 'lucide-react'

type MenuItem =
    | { type: 'link'; href: string; label: string; icon: any; restricted?: boolean; allowedRoles?: PerfilAcesso[] }
    | { type: 'separator'; label?: string; restricted?: boolean; allowedRoles?: PerfilAcesso[] }

// Static definition outside component to avoid recreation
const MENU_ITEMS: MenuItem[] = [
    { type: 'link', href: '/', label: 'Home', icon: Home },
    { type: 'link', href: '/quadro-de-anuncios', label: 'Quadro de Anúncios', icon: LayoutDashboard },
    { type: 'link', href: '/territorios', label: 'Territórios', icon: Map },
    { type: 'link', href: '/saidas', label: 'Horário de Campo', icon: Calendar },

    { type: 'separator', label: 'Área Comum', restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT', 'IRMAO'] },
    { type: 'link', href: '/admin/meu-login', label: 'Senha e Acesso', icon: ShieldCheck, restricted: true },
    { type: 'link', href: '/admin/agenda', label: 'Agenda e Lembretes', icon: Calendar, restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT', 'IRMAO'] },
    { type: 'link', href: '/admin/eventos', label: 'Gerenciar Eventos', icon: PlusCircle, restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT', 'IRMAO'] },
    { type: 'link', href: '/admin/pauta-anciaos', label: 'Pauta de Reunião', icon: ClipboardList, restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT', 'IRMAO'] },
    { type: 'link', href: '/admin/relatorios', label: 'Relatórios', icon: FileText, restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT', 'IRMAO'] },

    { type: 'separator', label: 'Administração', restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA', 'RT'] },
    { type: 'link', href: '/programacao', label: 'Reunião de Quarta', icon: BookOpen, restricted: true, allowedRoles: ['ADMIN', 'RESP_QUINTA'] },
    { type: 'link', href: '/admin/discursos', label: 'Discursos', icon: Mic, restricted: true, allowedRoles: ['ADMIN', 'RESP_SABADO'] },
    { type: 'link', href: '/admin/escalas', label: 'Outras Designações', icon: ClipboardList, restricted: true, allowedRoles: ['ADMIN', 'RQA'] },
    { type: 'link', href: '/admin/campo', label: 'Campo', icon: Map, restricted: true, allowedRoles: ['ADMIN', 'RQA'] },
    { type: 'link', href: '/admin/limpeza', label: 'Limpeza', icon: Eraser, restricted: true, allowedRoles: ['ADMIN', 'SUPERINTENDENTE_SERVICO'] },
    { type: 'link', href: '/admin/cadastros', label: 'Cadastros', icon: Library, restricted: true, allowedRoles: ['ADMIN', 'RESP_SABADO'] },
    { type: 'link', href: '/admin/grupos', label: 'Grupos', icon: Users, restricted: true, allowedRoles: ['ADMIN', 'SUPERINTENDENTE_SERVICO'] },
    { type: 'link', href: '/admin/membros', label: 'Membros', icon: Users2, restricted: true, allowedRoles: ['ADMIN', 'SECRETARIO', 'SUPERINTENDENTE_SERVICO', 'RESP_QUINTA', 'RESP_SABADO', 'RQA'] },
    { type: 'link', href: '/admin/territorios', label: 'Gerenciar Territórios', icon: Settings, restricted: true, allowedRoles: ['ADMIN', 'RT'] },
    { type: 'link', href: '/admin/permissoes', label: 'Permissões', icon: UserCheck, restricted: true, allowedRoles: ['ADMIN'] },
]

function Sidebar() {
    const pathname = usePathname()
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const { isCollapsed, toggleCollapsed } = useSidebar()
    const { user, hasRole, loading, signOut } = useAuth()

    const isActive = (path: string) => {
        if (path === '/' && pathname !== '/') return false
        return pathname === path || (path !== '/' && pathname.startsWith(path))
    }

    const visibleItems = useMemo(() => {
        return MENU_ITEMS.filter(item => {
            if (!item.restricted) return true
            if (loading) return false
            if (!user) return false
            if (item.allowedRoles && !hasRole(item.allowedRoles)) return false
            return true
        })
    }, [user, loading, hasRole])

    const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ')

    return (
        <>
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-950 border-b dark:border-slate-800 flex items-center px-4 z-40 shadow-sm print:hidden">
                <button onClick={() => setIsMobileOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                    <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <span className="ml-4 font-bold text-lg text-gray-800 dark:text-white">
                    <span className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">Cong</span>Guaíra
                </span>
            </div>

            {isMobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            <aside
                className={cn(
                    "fixed top-0 left-0 h-full bg-white dark:bg-slate-950 border-r dark:border-slate-800 z-50 transition-all duration-300 ease-in-out",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                    isCollapsed ? "md:w-16" : "md:w-64",
                    "w-64 flex flex-col"
                )}
            >
                <div className={cn(
                    "p-4 border-b dark:border-slate-800 flex items-center shrink-0 h-16",
                    isCollapsed ? "justify-center" : "justify-between"
                )}>
                    {/* Hide Logo when collapsed to prevent layout shift/overflow */}
                    <Link
                        href="/"
                        className={cn("text-xl font-bold transition-opacity", isCollapsed && "hidden")}
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <span className="bg-gradient-to-r from-blue-600 to-cyan-400 bg-clip-text text-transparent">Cong</span>
                        <span className="dark:text-white text-gray-900">Guaíra</span>
                    </Link>

                    <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                        <X className="w-6 h-6" />
                    </button>

                    <button
                        onClick={toggleCollapsed}
                        className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400"
                    >
                        <ChevronLeft className={cn("w-5 h-5 transition-transform", isCollapsed && "rotate-180")} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-2 space-y-1 thin-scrollbar">
                    {visibleItems.map((item, index) => {
                        if (item.type === 'separator') {
                            return (
                                <div key={`sep-${index}`} className="my-2 px-3">
                                    <div className="border-t border-gray-100 dark:border-slate-800" />
                                    {item.label && !isCollapsed && (
                                        <span className="block mt-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                            {item.label}
                                        </span>
                                    )}
                                </div>
                            )
                        }

                        const Icon = item.icon
                        const active = isActive(item.href)

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 font-medium group",
                                    active
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-blue-600 dark:hover:text-blue-400"
                                )}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <Icon className={cn("w-5 h-5 shrink-0", active ? "text-white" : "text-gray-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400")} />
                                <span className={cn("truncate transition-opacity", isCollapsed && "md:hidden")}>
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                    {(!loading && user) ? (
                        <button
                            onClick={() => signOut()}
                            className={cn(
                                "flex items-center gap-3 py-2 px-3 w-full rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all font-medium",
                                isCollapsed && "md:justify-center md:px-0"
                            )}
                            title={isCollapsed ? 'Sair' : undefined}
                        >
                            <LogOut className="w-5 h-5" />
                            <span className={cn(isCollapsed && "md:hidden")}>Sair</span>
                        </button>
                    ) : (
                        <Link
                            href="/login"
                            className={cn(
                                "flex items-center gap-3 py-2 px-3 w-full rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all font-medium",
                                isCollapsed && "md:justify-center md:px-0"
                            )}
                        >
                            <ShieldCheck className="w-5 h-5" />
                            <span className={cn(isCollapsed && "md:hidden")}>Entrar</span>
                        </Link>
                    )}
                </div>
            </aside>
        </>
    )
}

export default memo(Sidebar)
