'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function VisitasListPage() {
    const router = useRouter()
    const [visitas, setVisitas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchVisitas()
    }, [])

    const fetchVisitas = async () => {
        try {
            const { data, error } = await supabase
                .from('programacao_semanal')
                .select('*')
                .eq('evento_tipo', 'visita spte')
                .order('data_reuniao', { ascending: false })

            if (error) throw error
            setVisitas(data || [])

        } catch (error) {
            console.error('Erro ao carregar visitas:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Visitas do Superintendente</h1>
                    <p className="text-slate-600 mt-1">Selecione uma visita para gerenciar as atividades e horários.</p>
                </div>
                <button
                    onClick={() => router.push('/programacao')}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                    Nova Programação
                </button>
            </div>

            {visitas.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-slate-500 mb-4">Nenhuma visita encontrada.</p>
                    <p className="text-sm">Para iniciar uma visita, crie uma <strong>Nova Programação (Manual)</strong> e defina o Tipo de Evento como "Visita Supte."</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visitas.map((visita) => (
                        <div
                            key={visita.id}
                            onClick={() => router.push(`/admin/visita/${visita.id}`)}
                            className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-500 cursor-pointer transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-teal-100 text-teal-600 rounded-lg group-hover:scale-110 transition-transform">
                                    <span className="text-2xl">📋</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                        Semana de {format(parseISO(visita.data_reuniao), "dd 'de' MMMM", { locale: ptBR })}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {format(parseISO(visita.data_reuniao), 'yyyy')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
