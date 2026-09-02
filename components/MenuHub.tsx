'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthProvider'
import { getMenuGroup, getVisibleMenuSections, type MenuGroupId, type MenuLink } from '@/lib/menuConfig'
import PageHeader from '@/components/PageHeader'

/**
 * Quantidade fixa de placeholders no loading.
 * Usar `group.items.length` aqui revelaria quantas ferramentas existem no
 * grupo antes mesmo das permissoes serem resolvidas.
 */
const SKELETON_COUNT = 6

const TILE_COLORS = [
    {
        borderClass: 'border-indigo-400/70 dark:border-indigo-500/60 hover:border-indigo-500',
        iconClass: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white',
    },
    {
        borderClass: 'border-blue-400/70 dark:border-blue-500/60 hover:border-blue-500',
        iconClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white',
    },
    {
        borderClass: 'border-green-400/70 dark:border-green-500/60 hover:border-green-500',
        iconClass: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white',
    },
    {
        borderClass: 'border-orange-400/70 dark:border-orange-500/60 hover:border-orange-500',
        iconClass: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white',
    },
    {
        borderClass: 'border-purple-400/70 dark:border-purple-500/60 hover:border-purple-500',
        iconClass: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white',
    },
    {
        borderClass: 'border-teal-400/70 dark:border-teal-500/60 hover:border-teal-500',
        iconClass: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white',
    },
] as const

/**
 * UI intermediaria de um grupo do menu.
 * Renderiza uma grade de botoes (tiles) que levam exatamente para as
 * mesmas paginas que os itens da antiga Sidebar levavam.
 *
 * Recebe apenas o `groupId` (string serializavel) em vez do objeto do grupo,
 * pois os icones (funcoes) nao podem cruzar a fronteira Server -> Client.
 */
export default function MenuHub({ groupId }: { groupId: MenuGroupId }) {
    const { user, roles, loading, hasRole, canAccessPastoreio } = useAuth()
    const group = getMenuGroup(groupId)

    const visibleSections = useMemo(
        () => getVisibleMenuSections(group, { user, roles, loading, hasRole, canAccessPastoreio }),
        [group, user, roles, loading, hasRole, canAccessPastoreio]
    )
    const visibleCount = visibleSections.reduce((total, section) => total + section.length, 0)

    const tileClass = 'group flex flex-col items-center justify-center gap-3 p-5 min-h-[128px] rounded-2xl border bg-white dark:bg-slate-900 text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5'

    const renderTile = (item: MenuLink) => {
        const ItemIcon = item.icon
        const color = TILE_COLORS[group.items.indexOf(item) % TILE_COLORS.length]

        if (item.placeholder) {
            return (
                <button
                    key={item.href}
                    type="button"
                    onClick={() => toast('Em breve', { icon: '🚧' })}
                    className={`${tileClass} ${color.borderClass}`}
                >
                    <span className={`p-3 rounded-xl transition-colors ${color.iconClass}`}>
                        <ItemIcon className="w-6 h-6" />
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                        {item.label}
                    </span>
                </button>
            )
        }

        return (
            <Link
                key={item.href}
                href={item.href}
                className={`${tileClass} ${color.borderClass}`}
            >
                <span className={`p-3 rounded-xl transition-colors ${color.iconClass}`}>
                    <ItemIcon className="w-6 h-6" />
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                    {item.label}
                </span>
            </Link>
        )
    }

    const isLoading = loading && roles.length === 0

    return (
        <div className="max-w-5xl mx-auto">
            <PageHeader
                title={group.label}
                subtitle={group.description}
            />

            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
                        <div
                            key={index}
                            className="h-32 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
                        />
                    ))}
                </div>
            ) : visibleCount === 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
                    <p className="font-medium text-slate-600 dark:text-slate-300">
                        Nenhuma opção disponível para o seu perfil.
                    </p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Se você acredita que isso é um erro, fale com o secretário ou com um ancião.
                    </p>
                    <Link
                        href="/"
                        className="inline-block mt-6 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors"
                    >
                        Voltar para o início
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {visibleSections.map((section, index) => (
                        <div key={index}>
                            {index > 0 && (
                                <div className="mb-6 border-t border-slate-200 dark:border-slate-700" />
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {section.map(renderTile)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
