'use client'

import Link from 'next/link'
import { BookOpen, Briefcase, ClipboardList, Eraser, Mic } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

const CARDS: {
    href: string
    title: string
    icon: LucideIcon
    borderClass: string
    iconClass: string
}[] = [
    {
        href: '/relatorios/reuniao-fim-semana',
        title: 'Reunião de Fim de Semana',
        icon: Mic,
        borderClass: 'border-indigo-400/70 dark:border-indigo-500/60 hover:border-indigo-500',
        iconClass: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white',
    },
    {
        href: '/relatorios/reuniao-meio-semana',
        title: 'Reunião de Meio de Semana',
        icon: BookOpen,
        borderClass: 'border-blue-400/70 dark:border-blue-500/60 hover:border-blue-500',
        iconClass: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white',
    },
    {
        href: '/relatorios/limpeza',
        title: 'Escala de Limpeza',
        icon: Eraser,
        borderClass: 'border-green-400/70 dark:border-green-500/60 hover:border-green-500',
        iconClass: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white',
    },
    {
        href: '/relatorios/campo',
        title: 'Dirigentes de Campo',
        icon: Briefcase,
        borderClass: 'border-orange-400/70 dark:border-orange-500/60 hover:border-orange-500',
        iconClass: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white',
    },
    {
        href: '/relatorios/mecanicas',
        title: 'Designações de Apoio',
        icon: ClipboardList,
        borderClass: 'border-purple-400/70 dark:border-purple-500/60 hover:border-purple-500',
        iconClass: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white',
    },
    {
        href: '/relatorios/discursos',
        title: 'Discursos Públicos',
        icon: Mic,
        borderClass: 'border-teal-400/70 dark:border-teal-500/60 hover:border-teal-500',
        iconClass: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white',
    },
]

export default function QuadroDeAnuncios() {
    return (
        <div className="max-w-5xl mx-auto" suppressHydrationWarning>
            <PageHeader title="Quadro de Anúncios" />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" suppressHydrationWarning>
                {CARDS.map(card => {
                    const Icon = card.icon

                    return (
                        <Link
                            key={card.href}
                            href={card.href}
                            className={`group flex flex-col items-center justify-center gap-3 p-5 min-h-[128px] rounded-2xl border bg-white dark:bg-slate-900 text-center transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${card.borderClass}`}
                        >
                            <span className={`p-3 rounded-xl transition-colors ${card.iconClass}`}>
                                <Icon className="w-6 h-6" />
                            </span>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                                {card.title}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
