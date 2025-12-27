'use client'

import Link from 'next/link'

export default function QuadroDeAnuncios() {
    return (
        <div className="p-8 max-w-7xl mx-auto" suppressHydrationWarning>
            <div className="mb-8" suppressHydrationWarning>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Quadro de Anúncios</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Visualize as escalas e relatórios da congregação.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" suppressHydrationWarning>
                {/* Weekend Meeting Report Card */}
                <Link
                    href="/relatorios/reuniao-fim-semana"
                    className="block p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:border-primary group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                            <span className="text-2xl">🗓️</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                Reunião de Fim de Semana
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Geral
                            </span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Visualize o Presidente, Discurso Público e Leitor de A Sentinela da semana.
                    </p>
                </Link>

                {/* Midweek Meeting Report Card */}
                <Link
                    href="/relatorios/reuniao-meio-semana"
                    className="block p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:border-primary group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                            <span className="text-2xl">📖</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                Reunião de Meio de Semana
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Programação
                            </span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Visualize a programação completa da reunião de meio de semana, com todas as partes e designados.
                    </p>
                </Link>

                {/* Cleaning Report Card */}
                <Link
                    href="/relatorios/limpeza"
                    className="block p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:border-primary group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
                            <span className="text-2xl">🧹</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                Escala de Limpeza
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Manutenção
                            </span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Visualize a escala de limpeza semanal por mês, com navegação fácil entre períodos.
                    </p>
                </Link>

                {/* Field Service Report Card */}
                <Link
                    href="/relatorios/campo"
                    className="block p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:border-primary group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                            <span className="text-2xl">👜</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                Dirigentes de Campo
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Pregação
                            </span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Visualize a escala diária de saída de campo, com dirigentes e horários por mês.
                    </p>
                </Link>

                {/* Mechanical Assignments Report Card */}
                <Link
                    href="/relatorios/mecanicas"
                    className="block p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:border-primary group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                            <span className="text-2xl">📋</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                Designações Mecânicas
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Reunião
                            </span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Visualize a escala de indicadores, som, vídeo e microfones para cada reunião.
                    </p>
                </Link>

                {/* Public Talk Report Card */}
                <Link
                    href="/relatorios/discursos"
                    className="block p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all hover:border-primary group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400 group-hover:scale-110 transition-transform">
                            <span className="text-2xl">🎤</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                Discursos Públicos
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                Oradores
                            </span>
                        </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Visualize os arranjos de discursos públicos locais e fora da congregação.
                    </p>
                </Link>
            </div>
        </div>
    )
}
