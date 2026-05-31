'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Utensils,
    HeartHandshake,
    BookOpen,
    ArrowLeft,
    MapPin,
    Clock,
    User,
    Calendar,
    MessageCircle,
    Copy,
    Check
} from 'lucide-react'

// Types based on the schema
interface Membro {
    id: string
    nome_completo: string
    contato?: string
    endereco?: string
}

type TabType = 'almoco' | 'pastoreio' | 'estudo'

export default function VisitaAcompanharPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [programacao, setProgramacao] = useState<any>(null)
    const [config, setConfig] = useState<any>(null)
    const [membros, setMembros] = useState<Membro[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>('almoco')
    const [copiedId, setCopiedId] = useState<string | null>(null)

    useEffect(() => {
        if (id) fetchData()
    }, [id])

    const fetchData = async () => {
        try {
            // 1. Fetch Programação
            const { data: progData, error: progError } = await supabase
                .from('programacao_semanal')
                .select('*')
                .eq('id', id)
                .single()

            if (progError) throw progError
            setProgramacao(progData)

            // 2. Fetch Config
            const { data: configData, error: configError } = await (supabase as any)
                .from('visita_config')
                .select('*')
                .eq('programacao_id', id)
                .maybeSingle()

            if (configError) throw configError
            setConfig(configData || {})

            // 3. Fetch Membros for resolving details
            const { data: membData, error: membError } = await supabase
                .from('membros')
                .select('id, nome_completo, contato, endereco')

            if (membError) throw membError
            setMembros(membData || [])

        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    const getMembro = (membroId: string): Membro => {
        return membros.find(m => m.id === membroId) || { id: '', nome_completo: 'Irmão não encontrado' }
    }

    // Helper to generate WhatsApp URL for Brazil
    const getWhatsAppUrl = (membro: Membro, contextMessage: string = '') => {
        const rawPhone = membro.contato || ''
        if (!rawPhone) return ''
        
        const cleanPhone = rawPhone.replace(/\D/g, '')
        if (!cleanPhone) return ''

        // Prefix Brazil country code (55) if it's 10 or 11 digits and doesn't start with 55
        const phoneWithCountry = (cleanPhone.length === 11 || cleanPhone.length === 10) && !cleanPhone.startsWith('55')
            ? `55${cleanPhone}`
            : cleanPhone

        return `https://wa.me/${phoneWithCountry}${contextMessage ? `?text=${encodeURIComponent(contextMessage)}` : ''}`
    }

    const handleCopyAddress = (address: string, id: string) => {
        if (!address) return
        navigator.clipboard.writeText(address)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleOpenMaps = (address: string) => {
        if (!address) return
        const hasCity = address.toLowerCase().includes('guaíra') || address.toLowerCase().includes('guaira')
        const fullQuery = hasCity ? address : `${address}, Guaíra - PR`
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery)}`
        window.open(url, '_blank')
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-4 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Carregando roteiro da visita...</p>
            </div>
        )
    }

    if (!programacao) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-4 text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Visita não encontrada</h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm">O link pode estar quebrado ou a programação foi removida.</p>
                <button onClick={() => router.push('/')} className="mt-6 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold shadow-md shadow-emerald-500/10 hover:bg-emerald-700 transition-all">
                    Ir para o Início
                </button>
            </div>
        )
    }

    const formatWeekDateRange = (dateString: string) => {
        const date = parseISO(dateString)
        return `Semana de ${format(date, "dd 'de' MMMM", { locale: ptBR })}`
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-24">
            
            {/* Header Area */}
            <header className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-30 shadow-sm transition-colors">
                <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
                    <button 
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                        aria-label="Voltar"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                            Semana da Visita
                        </span>
                        <h1 className="text-base font-bold text-slate-900 dark:text-white truncate">
                            {formatWeekDateRange(programacao.data_reuniao)}
                        </h1>
                    </div>
                </div>

                {/* Mobile Bottom-Thumb Tab Bar inside header */}
                <div className="max-w-md mx-auto px-4 border-t dark:border-slate-800 flex justify-between bg-white dark:bg-slate-900">
                    <button 
                        onClick={() => setActiveTab('almoco')}
                        className={`flex-1 py-3 text-center border-b-2 font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                            activeTab === 'almoco' 
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <Utensils className="w-5 h-5" />
                        <span>Almoços</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('pastoreio')}
                        className={`flex-1 py-3 text-center border-b-2 font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                            activeTab === 'pastoreio' 
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <HeartHandshake className="w-5 h-5" />
                        <span>Pastoreios</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('estudo')}
                        className={`flex-1 py-3 text-center border-b-2 font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                            activeTab === 'estudo' 
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <BookOpen className="w-5 h-5" />
                        <span>Estudos</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="max-w-md mx-auto px-4 py-6">
                
                {/* 1. Tab Almoço */}
                {activeTab === 'almoco' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl mb-4">
                            <h2 className="text-emerald-800 dark:text-emerald-400 font-bold text-sm mb-1">📅 Arranjo de Almoço</h2>
                            <p className="text-emerald-700/80 dark:text-emerald-400/70 text-xs">Aqui está a escala de refeições com os irmãos anfitriões desta semana da visita.</p>
                        </div>

                        {(config?.almocos || []).length > 0 ? (
                            config.almocos.map((almoco: any) => {
                                const membro = getMembro(almoco.membro_id)
                                const waUrl = getWhatsAppUrl(membro)
                                return (
                                    <div key={almoco.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-center border-b dark:border-slate-800/50 pb-2">
                                            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                                                {almoco.dia}
                                            </span>
                                        </div>

                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1.5 flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                                                    {membro.nome_completo}
                                                </h3>
                                                {membro.endereco && (
                                                    <div className="flex items-start gap-1 text-slate-500 dark:text-slate-400 text-xs">
                                                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                        <span className="leading-relaxed break-words">{membro.endereco}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* WhatsApp Floating Action style */}
                                            {waUrl && (
                                                <a 
                                                    href={waUrl} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="w-10 h-10 shrink-0 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-md shadow-emerald-500/10 transition-colors"
                                                    title="Conversar no WhatsApp"
                                                >
                                                    <MessageCircle className="w-5.5 h-5.5 fill-white stroke-none" />
                                                </a>
                                            )}
                                        </div>

                                        {membro.endereco && (
                                            <div className="flex gap-2 mt-1">
                                                <button
                                                    onClick={() => handleCopyAddress(membro.endereco!, almoco.id)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:active:bg-slate-700/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all border border-slate-200/30 dark:border-transparent"
                                                >
                                                    {copiedId === almoco.id ? (
                                                        <>
                                                            <Check className="w-4 h-4 text-emerald-500" />
                                                            <span className="text-emerald-500 font-bold">Copiado!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-4 h-4" />
                                                            <span>Copiar</span>
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleOpenMaps(membro.endereco!)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold transition-all border border-emerald-200/30 dark:border-transparent"
                                                >
                                                    <MapPin className="w-4 h-4" />
                                                    <span>Google Maps</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        ) : (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                                <p className="text-slate-500 text-sm">Nenhum arranjo de almoço cadastrado.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 2. Tab Pastoreio */}
                {activeTab === 'pastoreio' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl mb-4">
                            <h2 className="text-emerald-800 dark:text-emerald-400 font-bold text-sm mb-1">🏠 Arranjos de Pastoreio</h2>
                            <p className="text-emerald-700/80 dark:text-emerald-400/70 text-xs">Visitas agendadas com os irmãos da congregação durante a semana da visita.</p>
                        </div>

                        {(config?.pastoreios || []).length > 0 ? (
                            config.pastoreios.map((pastoreio: any) => {
                                const membro = getMembro(pastoreio.membro_id)
                                const anciao = getMembro(pastoreio.anciao_id)
                                const parsedDate = pastoreio.data ? format(parseISO(pastoreio.data), 'dd/MM/yyyy') : ''
                                const waMembro = getWhatsAppUrl(membro)
                                const waAnciao = getWhatsAppUrl(anciao)
                                
                                return (
                                    <div key={pastoreio.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-3">
                                        <div className="flex justify-between items-center border-b dark:border-slate-800/50 pb-2">
                                            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                                                <Calendar className="w-3.5 h-3.5" />
                                                <span>{parsedDate}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>{pastoreio.hora}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-start gap-2">
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold tracking-wide text-slate-400">Visitado(a)</span>
                                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                                        {membro.nome_completo}
                                                    </h3>
                                                </div>
                                                {waMembro && (
                                                    <a 
                                                        href={waMembro} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/10 transition-colors"
                                                        title="Conversar com o membro"
                                                    >
                                                        <MessageCircle className="w-4.5 h-4.5 fill-white stroke-none" />
                                                    </a>
                                                )}
                                            </div>

                                            {membro.endereco && (
                                                <div className="flex items-start gap-1 text-slate-500 dark:text-slate-400 text-xs">
                                                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                                    <span className="leading-relaxed break-words">{membro.endereco}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-transparent flex items-center justify-between gap-3 text-xs">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400 shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="block text-[9px] uppercase font-bold text-slate-400">Acompanhante</span>
                                                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate block">
                                                        {anciao.nome_completo}
                                                    </span>
                                                </div>
                                            </div>
                                            {waAnciao && (
                                                <a 
                                                    href={waAnciao} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 flex items-center justify-center transition-colors"
                                                    title="Conversar com o acompanhante"
                                                >
                                                    <MessageCircle className="w-3.5 h-3.5 fill-slate-600 dark:fill-slate-200 stroke-none" />
                                                </a>
                                            )}
                                        </div>

                                        {pastoreio.memo && (
                                            <div className="text-xs text-slate-600 dark:text-slate-400 bg-amber-50/50 dark:bg-amber-950/10 border-l-3 border-amber-400 p-3 rounded-r-xl">
                                                <strong className="block text-amber-800 dark:text-amber-400 mb-0.5 text-[10px] uppercase font-bold">Contexto/Observações</strong>
                                                <span className="italic leading-relaxed">{pastoreio.memo}</span>
                                            </div>
                                        )}

                                        {membro.endereco && (
                                            <div className="flex gap-2 mt-1">
                                                <button
                                                    onClick={() => handleCopyAddress(membro.endereco!, pastoreio.id)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:active:bg-slate-700/80 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 transition-all border border-slate-200/30 dark:border-transparent"
                                                >
                                                    {copiedId === pastoreio.id ? (
                                                        <>
                                                            <Check className="w-4 h-4 text-emerald-500" />
                                                            <span className="text-emerald-500 font-bold">Copiado!</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="w-4 h-4" />
                                                            <span>Copiar</span>
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleOpenMaps(membro.endereco!)}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold transition-all border border-emerald-200/30 dark:border-transparent"
                                                >
                                                    <MapPin className="w-4 h-4" />
                                                    <span>Google Maps</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        ) : (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                                <p className="text-slate-500 text-sm">Nenhuma visita de pastoreio cadastrada.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. Tab Estudos e Revisitas */}
                {activeTab === 'estudo' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl mb-4">
                            <h2 className="text-emerald-800 dark:text-emerald-400 font-bold text-sm mb-1">📖 Estudos e Revisitas</h2>
                            <p className="text-emerald-700/80 dark:text-emerald-400/70 text-xs">Arranjos para acompanhar estudos bíblicos e revisitas de membros locais.</p>
                        </div>

                        {(config?.arranjos_estudo || []).length > 0 ? (
                            config.arranjos_estudo.map((tabela: any) => (
                                <div key={tabela.id} className="space-y-3">
                                    <h3 className="font-bold text-sm text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                                        {tabela.nome_tabela}
                                    </h3>

                                    {tabela.linhas.map((linha: any) => {
                                        const membro = getMembro(linha.membro_id)
                                        const waUrl = getWhatsAppUrl(membro)
                                        
                                        return (
                                            <div key={linha.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm space-y-3">
                                                
                                                <div className="flex justify-between items-center border-b dark:border-slate-800/50 pb-2">
                                                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                                                        {linha.dia}
                                                    </span>
                                                    <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-slate-600 dark:text-slate-400">
                                                        {linha.hora}
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-start gap-2">
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] uppercase font-bold tracking-wide text-slate-400">Publicador(a)</span>
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                            {membro.nome_completo}
                                                        </h4>
                                                    </div>
                                                    {waUrl && (
                                                        <a 
                                                            href={waUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/10 transition-colors"
                                                            title="Conversar com o publicador"
                                                        >
                                                            <MessageCircle className="w-4.5 h-4.5 fill-white stroke-none" />
                                                        </a>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 pt-1 border-t dark:border-slate-800/40">
                                                    <div className="bg-slate-50 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-100 dark:border-transparent">
                                                        <span className="block text-[8px] uppercase font-extrabold text-slate-400">Estudante</span>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 break-words block">{linha.estudante}</span>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-slate-800/30 p-2 rounded-xl border border-slate-100 dark:border-transparent">
                                                        <span className="block text-[8px] uppercase font-extrabold text-slate-400">Publicação</span>
                                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 break-words block">{linha.publicacao || '-'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                                <p className="text-slate-500 text-sm">Nenhum arranjo de estudo cadastrado.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
