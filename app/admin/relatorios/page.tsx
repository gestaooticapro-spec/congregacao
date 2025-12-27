'use client'

import Link from 'next/link'

export default function RelatoriosDashboard() {
    return (
        <div className="p-8 max-w-7xl mx-auto" suppressHydrationWarning>
            <div className="mb-8" suppressHydrationWarning>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Relatórios Administrativos</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Relatórios restritos e dados sensíveis da congregação.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" suppressHydrationWarning>
                {/* Member List Report Card */}
                <Link
                    href="/admin/relatorios/membros"
                    className="block p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:border-primary group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <span className="text-2xl">👥</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                Lista de Membros
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Geral
                            </span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Relatório detalhado de membros com filtros por grupo, qualificação e ordenação personalizada.
                    </p>
                </Link>

                {/* Placeholder for future reports */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed flex flex-col items-center justify-center text-center opacity-75">
                    <div className="p-3 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-400 mb-3">
                        <span className="text-2xl">📊</span>
                    </div>
                    <h3 className="font-bold text-slate-500 dark:text-slate-400">Em Breve</h3>
                    <p className="text-xs text-slate-400 mt-1">Mais relatórios administrativos serão adicionados aqui.</p>
                </div>
            </div>
        </div>
    )
}
