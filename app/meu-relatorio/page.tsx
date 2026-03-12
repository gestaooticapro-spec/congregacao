'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'react-hot-toast'
import {
    FileText,
    Calendar,
    Clock,
    BookOpen,
    CheckCircle2,
    LogOut,
    User,
    Shield
} from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SessaoMembro {
    id: string
    nome: string
    grupo_id: string
    is_pioneiro: boolean
    pin: string
    timestamp: number
}

// Opções de meses (Atual e anterior)
const getMonthOptions = () => {
    const now = new Date()
    const currentMonth = startOfMonth(now)
    const prevMonth = startOfMonth(subMonths(now, 1))

    return [
        { value: format(currentMonth, 'yyyy-MM-dd'), label: format(currentMonth, 'MMMM yyyy', { locale: ptBR }) },
        { value: format(prevMonth, 'yyyy-MM-dd'), label: format(prevMonth, 'MMMM yyyy', { locale: ptBR }) }
    ]
}

export default function MeuRelatorioPage() {
    const router = useRouter()
    const [sessao, setSessao] = useState<SessaoMembro | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [meses] = useState(getMonthOptions())

    // Formulário
    const [mes, setMes] = useState(meses[0].value)
    const [horas, setHoras] = useState<string>('')
    const [estudos, setEstudos] = useState<string>('')
    const [trabalhou, setTrabalhou] = useState(true)
    const [isPioneiroAuxiliar, setIsPioneiroAuxiliar] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('membro_sessao')
        if (!stored) {
            router.replace('/')
            toast('Por favor, acesse através do PIN.', { icon: '🔒' })
            return
        }

        try {
            const parsed: SessaoMembro = JSON.parse(stored)

            // Se não tiver PIN na sessão, força logout para a pessoa logar de novo e salvar o PIN
            if (!parsed.pin) {
                console.warn('Sessão antiga detectada (sem PIN). Forçando logout.')
                handleLogout()
                return
            }

            setSessao(parsed)

            // Prefill para publicadores
            if (!parsed.is_pioneiro) {
                setTrabalhou(true)
            }
        } catch (e) {
            handleLogout()
        } finally {
            setIsLoading(false)
        }
    }, [router])

    const handleLogout = () => {
        localStorage.removeItem('membro_sessao')
        router.replace('/')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!sessao) return

        setIsSubmitting(true)
        try {
            // Chama a RPC de forma segura com o PIN validado no localStorage
            const { error } = await supabase.rpc('enviar_relatorio_viapin', {
                p_pin: sessao.pin,
                p_mes: mes,
                p_horas: (sessao.is_pioneiro || isPioneiroAuxiliar) ? (parseInt(horas) || 0) : null,
                p_estudos: parseInt(estudos) || 0,
                p_trabalhou: (!sessao.is_pioneiro && !isPioneiroAuxiliar) ? trabalhou : true,
                p_is_pioneiro_auxiliar: isPioneiroAuxiliar
            })

            if (error) {
                console.error('Erro detalhado Supabase:', {
                    message: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint
                })
                throw new Error(error.message || 'Erro de permissão ou salvamento')
            }

            toast.success('Relatório enviado com sucesso!')
            setTimeout(() => {
                router.push('/')
            }, 2000)

        } catch (err: any) {
            console.error('Erro no Catch:', err)
            const mensagem = err?.message || 'Erro desconhecido.'
            toast.error(`Erro ao enviar: ${mensagem}`)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
    if (!sessao) return null

    const mostraHoras = sessao.is_pioneiro || isPioneiroAuxiliar

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-xl mx-auto space-y-6">

                {/* Header Profile */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-bold text-gray-900 dark:text-white text-lg">
                                {sessao.nome}
                            </h2>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                {sessao.is_pioneiro ? (
                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                                        <Shield className="w-4 h-4" />
                                        Pioneiro Regular
                                    </span>
                                ) : (
                                    <span>Publicador</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2"
                        title="Sair"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
                    <div className="flex items-center gap-2 border-b dark:border-slate-800 pb-4">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                            Meu Relatório de Serviço
                        </h3>
                    </div>

                    {/* Mês Option */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Mês de Referência
                        </label>
                        <select
                            value={mes}
                            onChange={e => setMes(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 capitalize"
                        >
                            {meses.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Pioneiro Auxiliar Toggle (Only for Publishers) */}
                    {!sessao.is_pioneiro && (
                        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20">
                            <div>
                                <p className="font-medium text-amber-900 dark:text-amber-500">Pioneiro Auxiliar?</p>
                                <p className="text-xs text-amber-700/70 dark:text-amber-500/70">Marque se você serviu como auxiliar neste mês.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPioneiroAuxiliar}
                                    onChange={e => setIsPioneiroAuxiliar(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 dark:peer-focus:ring-amber-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500"></div>
                            </label>
                        </div>
                    )}

                    {/* Trabalhou Toggle (Only for normal publishers) */}
                    {!mostraHoras && (
                        <div className="space-y-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={trabalhou}
                                    onChange={e => setTrabalhou(e.target.checked)}
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    Participei no ministério neste mês
                                </span>
                            </label>
                        </div>
                    )}

                    {/* Horas (Only for pioneers) */}
                    {mostraHoras && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                Horas Totais
                            </label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={horas}
                                onChange={e => setHoras(e.target.value)}
                                placeholder="0"
                                className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    {/* Estudos Diferentes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            Estudos Bíblicos
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Quantas pessoas diferentes você dirigiu estudos no mês? (Opcional)
                        </p>
                        <input
                            type="number"
                            min="0"
                            value={estudos}
                            onChange={e => setEstudos(e.target.value)}
                            placeholder="0"
                            className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting || (!trabalhou && !mostraHoras)}
                        className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5" />
                                Enviar Relatório
                            </>
                        )}
                    </button>

                </form>
            </div>
        </div>
    )
}
