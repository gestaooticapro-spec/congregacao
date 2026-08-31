'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useMemo, memo, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthProvider'
import { useSidebar } from '@/contexts/SidebarContext'
import { PerfilAcesso } from '@/types/database.types'
import {
    Home,
    LayoutDashboard,
    LucideIcon,
    Map,
    Calendar,
    LogOut,
    Menu,
    ChevronLeft,
    X,
    ShieldCheck,
    UserCircle,
    Clock,
    SlidersHorizontal,
} from 'lucide-react'
import { MENU_GROUPS, PERFIS_ADMINISTRACAO, isMenuLinkVisible, type MenuGroup } from '@/lib/menuConfig'

type MenuItem =
    | { type: 'link'; href: string; label: string; icon: LucideIcon; restricted?: boolean; allowedRoles?: PerfilAcesso[] }
    | { type: 'pin-button'; label: string; icon: LucideIcon; restricted?: boolean; allowedRoles?: PerfilAcesso[] }
    | { type: 'pioneer-button'; label: string; icon: LucideIcon; restricted?: boolean; allowedRoles?: PerfilAcesso[] }

// Static definition outside component to avoid recreation.
// As antigas secoes "Area Comum" e "Administracao" foram substituidas pelos
// grupos definidos em lib/menuConfig.ts (botao na Sidebar + pagina de tiles).
const MENU_ITEMS: MenuItem[] = [
    { type: 'link', href: '/', label: 'Home', icon: Home },
    { type: 'link', href: '/quadro-de-anuncios', label: 'Quadro de Anúncios', icon: LayoutDashboard },
    { type: 'link', href: '/territorios', label: 'Territórios', icon: Map },
    { type: 'link', href: '/saidas', label: 'Horário de Campo', icon: Calendar },
    { type: 'pin-button', label: 'Meu Relatório', icon: UserCircle },
    { type: 'pioneer-button', label: 'Painel do Pioneiro', icon: Clock },
]

function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const { isCollapsed, toggleCollapsed } = useSidebar()
    const { user, roles, hasRole, loading, signOut } = useAuth()
    const [isPioneiroSession, setIsPioneiroSession] = useState(false)

    useEffect(() => {
        const syncMemberSession = () => {
            const session = localStorage.getItem('membro_sessao')
            if (!session) {
                setIsPioneiroSession(false)
                return
            }

            try {
                setIsPioneiroSession(!!JSON.parse(session).is_pioneiro)
            } catch {
                setIsPioneiroSession(false)
            }
        }

        syncMemberSession()
        window.addEventListener('membro-sessao-atualizada', syncMemberSession)
        window.addEventListener('storage', syncMemberSession)
        return () => {
            window.removeEventListener('membro-sessao-atualizada', syncMemberSession)
            window.removeEventListener('storage', syncMemberSession)
        }
    }, [])

    const isActive = (path: string) => {
        if (path === '/' && pathname !== '/') return false
        return pathname === path || (path !== '/' && pathname.startsWith(path + '/'))
    }

    const visibleItems = useMemo(() => {
        return MENU_ITEMS.filter(item => {
            if (!item.restricted) return true
            if (loading && roles.length === 0) return false
            if (!user) return false
            if (item.allowedRoles && !hasRole(item.allowedRoles)) return false
            return true
        })
    }, [user, roles.length, loading, hasRole])

    // Um grupo so aparece se o usuario tiver acesso a pelo menos um item dele,
    // evitando que o botao leve para uma pagina de tiles vazia.
    const visibleGroups = useMemo(() => {
        return MENU_GROUPS.filter(group =>
            group.items.some(item => isMenuLinkVisible(item, { user, roles, loading, hasRole }))
        )
    }, [user, roles, loading, hasRole])

    // Mantem o botao do grupo em destaque enquanto o usuario navega
    // em qualquer pagina que pertenca a ele.
    const isGroupActive = (group: MenuGroup) => {
        if (pathname === group.href) return true
        return group.items.some(item => isActive(item.href))
    }

    // Mantem a mesma regra do antigo separador "Administracao": o botao nao
    // aparece para perfis que nao tinham acesso a area (ex.: IRMAO).
    const showAdminPlaceholder = !loading && !!user && hasRole(PERFIS_ADMINISTRACAO)

    const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ')

    if (pathname && pathname.includes('/acompanhar')) {
        return null
    }

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
                    "fixed top-0 left-0 h-full bg-white dark:bg-slate-950 border-r dark:border-slate-800 z-50 transition-all duration-300 ease-in-out print:hidden flex flex-col",
                    isCollapsed ? "md:w-16" : "md:w-64",
                    isMobileOpen
                        ? "w-64 translate-x-0"
                        : "max-md:w-0 max-md:overflow-hidden max-md:border-0 md:translate-x-0"
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
                    {visibleItems.map((item) => {
                        if (item.type === 'pin-button') {
                            const Icon = item.icon
                            return (
                                <button
                                    key="pin-button-item"
                                    onClick={() => {
                                        router.push('/meu-relatorio')
                                        setIsMobileOpen(false)
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 font-medium group",
                                        "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-blue-600 dark:hover:text-blue-400"
                                    )}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <Icon className="w-5 h-5 shrink-0 text-gray-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                                    <span className={cn("truncate transition-opacity", isCollapsed && "md:hidden")}>
                                        {item.label}
                                    </span>
                                </button>
                            )
                        }

                        if (item.type === 'pioneer-button') {
                            if (!isPioneiroSession) return null
                            const Icon = item.icon
                            return (
                                <button
                                    key="pioneer-button-item"
                                    onClick={() => {
                                        router.push('/painel-pioneiro')
                                        setIsMobileOpen(false)
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 font-medium group",
                                        "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                                    )}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <Icon className="w-5 h-5 shrink-0" />
                                    <span className={cn("truncate transition-opacity", isCollapsed && "md:hidden")}>
                                        {item.label}
                                    </span>
                                </button>
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

                    {visibleGroups.length > 0 && (
                        <div className="my-2 px-3">
                            <div className="border-t border-gray-100 dark:border-slate-800" />
                        </div>
                    )}

                    {visibleGroups.map(group => {
                        const GroupIcon = group.icon
                        const groupActive = isGroupActive(group)

                        return (
                            <Link
                                key={group.id}
                                href={group.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 font-medium group",
                                    isCollapsed && "md:justify-center md:px-0",
                                    groupActive
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-blue-600 dark:hover:text-blue-400"
                                )}
                                title={isCollapsed ? group.label : undefined}
                            >
                                <GroupIcon className={cn("w-5 h-5 shrink-0", groupActive ? "text-white" : "text-gray-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400")} />
                                <span className={cn("truncate transition-opacity", isCollapsed && "md:hidden")}>
                                    {group.label}
                                </span>
                                <ChevronLeft
                                    className={cn(
                                        "w-4 h-4 ml-auto shrink-0 rotate-180 transition-transform",
                                        groupActive ? "text-white" : "text-gray-400 dark:text-slate-500",
                                        isCollapsed && "md:hidden"
                                    )}
                                />
                            </Link>
                        )
                    })}

                    {showAdminPlaceholder && (
                        <button
                            type="button"
                            onClick={() => {
                                toast('Área de Administração — em breve', { icon: '🚧' })
                                setIsMobileOpen(false)
                            }}
                            aria-label="Administração, em breve"
                            className={cn(
                                "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all duration-200 font-medium group",
                                "text-gray-400 dark:text-slate-500 hover:bg-gray-50 dark:hover:bg-slate-800/50",
                                isCollapsed && "md:justify-center md:px-0"
                            )}
                            title={isCollapsed ? 'Administração' : undefined}
                        >
                            <SlidersHorizontal className="w-5 h-5 shrink-0 text-gray-300 dark:text-slate-600" />
                            <span className={cn("truncate transition-opacity", isCollapsed && "md:hidden")}>
                                Administração
                            </span>
                        </button>
                    )}
                </nav>

                <div className="p-4 border-t dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                    {(!loading && user) ? (
                        <button
                            onClick={() => {
                                signOut()
                                setIsMobileOpen(false)
                            }}
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
                            onClick={() => setIsMobileOpen(false)}
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
