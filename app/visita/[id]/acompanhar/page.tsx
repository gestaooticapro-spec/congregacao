'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { format, parseISO, addDays, startOfWeek, nextDay, Day } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { calculatePartTimes } from '@/lib/scheduleUtils'
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
    Check,
    MoreHorizontal,
    Briefcase,
    Star
} from 'lucide-react'

// Types based on the schema
interface Membro {
    id: string
    nome_completo: string
    contato?: string | null
    endereco?: string | null
}

interface Parte {
    tipo: 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA' | 'PRESIDENTE' | 'ORACAO'
    nome: string
    tempo: number
    membro_id?: string
    ajudante_id?: string
}

type TabType = 'almoco' | 'pastoreio' | 'estudo' | 'outros'

export default function VisitaAcompanharPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [programacao, setProgramacao] = useState<any>(null)
    const [config, setConfig] = useState<any>(null)
    const [membros, setMembros] = useState<Membro[]>([])
    const [colaboradores, setColaboradores] = useState<any[]>([])
    const [weekendProg, setWeekendProg] = useState<any>(null)
    const [weekendAssignments, setWeekendAssignments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>('almoco')
    const [outrosView, setOutrosView] = useState<'menu' | 'vida_ministerio' | 'publica' | 'campo' | 'especiais'>('menu')
    const [copiedId, setCopiedId] = useState<string | null>(null)

    useEffect(() => {
        if (id) fetchData()
    }, [id])

    useEffect(() => {
        if (activeTab !== 'outros') {
            setOutrosView('menu')
        }
    }, [activeTab])

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

            // 4. Fetch Colaboradores
            const { data: colabData } = await (supabase as any)
                .from('colaboradores_externos')
                .select('id, nome, funcao')
            setColaboradores(colabData || [])

            // 5. Fetch Weekend Data
            const baseDate = parseISO(progData.data_reuniao)
            const weekSat = nextDay(startOfWeek(baseDate, { weekStartsOn: 1 }), 6 as Day)
            const weekSun = addDays(weekSat, 1)
            const dates = [format(weekSat, 'yyyy-MM-dd'), format(weekSun, 'yyyy-MM-dd')]

            const [weekendProgsRes, assignmentsDataRes] = await Promise.all([
                supabase.from('programacao_semanal')
                    .select('id, oracao_inicial_id, oracao_final_id, cantico_meio, cantico_inicial, cantico_final')
                    .in('data_reuniao', dates),
                supabase.from('designacoes_suporte')
                    .select('funcao, membro_id')
                    .in('data', dates)
            ])
            
            setWeekendProg(weekendProgsRes.data && weekendProgsRes.data.length > 0 ? weekendProgsRes.data[0] : null)
            setWeekendAssignments(assignmentsDataRes.data || [])

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

    const getMemberName = (id: string | undefined | null) => {
        if (!id) return ''
        const membro = membros.find(m => m.id === id)
        if (membro) return membro.nome_completo
        const colab = colaboradores.find(c => c.id === id)
        return colab ? colab.nome : ''
    }

    const getWeekendAssignment = (role: string) => {
        const assignment = weekendAssignments.find(a => a.funcao === role)
        return assignment ? getMemberName(assignment.membro_id) : 'Não designado'
    }

    const renderTabelaNome = (nome: string) => {
        if (!nome) return ''
        const parts = nome.split(/ COM /i)
        if (parts.length > 1) {
            return (
                <>
                    {parts[0]} COM <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{parts[1]}</span>
                </>
            )
        }
        return nome
    }

    const getDiscursoStartTime = () => {
        if (!programacao) return ''
        const rawPartes = (programacao.partes as any as Parte[]) || []
        const calculatedPartes = calculatePartTimes(rawPartes, programacao.data_reuniao)
        const allVidaCrista = calculatedPartes.filter(p => p.tipo === 'VIDA_CRISTA')
        const vidaCristaPartes = allVidaCrista.filter(p => !p.nome.toLowerCase().includes('estudo bíblico'))
        
        if (vidaCristaPartes.length === 0) return ''
        const lastPart = vidaCristaPartes[vidaCristaPartes.length - 1]
        
        const [h, m] = (lastPart as any).startTime.split(':').map(Number)
        const totalMin = h * 60 + m + (lastPart.tempo || 0)
        const newH = Math.floor(totalMin / 60)
        const newM = totalMin % 60
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
    }

    const renderBoldTime = (text: string) => {
        if (!text) return text
        const regex = /(\(\d+\s*min\.?\))/gi
        const parts = text.split(regex)
        return (
            <>
                {parts.map((part, i) => {
                    if (part.match(regex)) return <span key={i} className="font-bold">{part}</span>
                    return part
                })}
            </>
        )
    }

    const renderPartSection = (title: string, tipo: string, colorClass: string) => {
        const rawPartes = (programacao?.partes as any as Parte[]) || []
        let sectionParts = rawPartes.filter(p => p.tipo === tipo)

        const calculatedPartes = calculatePartTimes(rawPartes, programacao?.data_reuniao || new Date().toISOString().split('T')[0])

        sectionParts = sectionParts.map(p => {
            const calculated = calculatedPartes.find(c => c.nome === p.nome && c.tipo === p.tipo)
            return { ...p, startTime: calculated?.startTime || '' }
        })

        if (tipo === 'VIDA_CRISTA') {
            sectionParts.sort((a, b) => {
                const aIsStudy = a.nome.toLowerCase().includes('estudo bíblico');
                const bIsStudy = b.nome.toLowerCase().includes('estudo bíblico');
                if (aIsStudy && !bIsStudy) return 1;
                if (!aIsStudy && bIsStudy) return -1;
                return 0;
            });
        }

        if (sectionParts.length === 0) return null

        return (
            <div className="mb-6 break-inside-avoid">
                <h3 className={`text-sm font-extrabold uppercase mb-3 border-b-2 ${colorClass.replace('text-', 'border-')} pb-1 ${colorClass}`}>
                    {title}
                </h3>
                <div className="space-y-4">
                    {sectionParts.map((parte, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start text-sm">
                            <div className="col-span-2 font-bold text-slate-800 dark:text-slate-200">
                                {(parte as any).startTime}
                            </div>
                            <div className="col-span-6 font-medium text-slate-800 dark:text-slate-200">
                                {renderBoldTime(parte.nome)}
                            </div>
                            <div className="col-span-4 text-right">
                                <div className="font-bold text-slate-800 dark:text-slate-200">
                                    {getMemberName(parte.membro_id)}
                                </div>
                                {parte.ajudante_id && (
                                    <div className="text-xs text-slate-500 italic mt-0.5">
                                        {(parte.tipo === 'VIDA_CRISTA' && parte.nome.toLowerCase().includes('estudo bíblico')) ? 'Leitor: ' : 'Ajudante: '}
                                        {getMemberName(parte.ajudante_id)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
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
                            SEMANA DA VISITA - CONGREGAÇÃO GUAÍRA
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
                    <button 
                        onClick={() => setActiveTab('outros')}
                        className={`flex-1 py-3 text-center border-b-2 font-bold text-xs flex flex-col items-center gap-1 transition-all ${
                            activeTab === 'outros' 
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                        <span>Outros</span>
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
                                        {renderTabelaNome(tabela.nome_tabela)}
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

                {/* 4. Tab Outros */}
                {activeTab === 'outros' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {outrosView === 'menu' && (
                            <>
                                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl mb-4">
                                    <h2 className="text-emerald-800 dark:text-emerald-400 font-bold text-sm mb-1">🔗 Outros Links</h2>
                                    <p className="text-emerald-700/80 dark:text-emerald-400/70 text-xs">Acesse programações e arranjos adicionais da visita.</p>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => setOutrosView('vida_ministerio')}
                                        className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-emerald-500" />
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base">Reunião Vida e Ministério</h3>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Ver horários e programa</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setOutrosView('publica')}
                                        className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-emerald-500" />
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base">Reunião Pública</h3>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Ver informações do fim de semana</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setOutrosView('campo')}
                                        className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Briefcase className="w-4 h-4 text-emerald-500" />
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base">Horário de Campo</h3>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Arranjos para o serviço de campo</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setOutrosView('especiais')}
                                        className="w-full bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Star className="w-4 h-4 text-emerald-500" />
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base">Reuniões Especiais</h3>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Agenda das reuniões especiais</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                        </div>
                                    </button>
                                </div>
                            </>
                        )}

                        {outrosView === 'vida_ministerio' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <button onClick={() => setOutrosView('menu')} className="mb-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:text-emerald-700 transition-colors">
                                    <ArrowLeft className="w-4 h-4" /> Voltar para Menu
                                </button>

                                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
                                    <h2 className="text-xl font-black text-center uppercase text-slate-800 dark:text-slate-100 mb-6 leading-tight">
                                        Nossa Vida e<br />Ministério Cristão
                                    </h2>

                                    {/* President and Prayer Card */}
                                    <div className="grid grid-cols-2 gap-4 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 mb-6 bg-slate-50/50 dark:bg-slate-800/30">
                                        <div>
                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Presidente</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{getMemberName(programacao?.presidente_id)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Oração Inicial</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{getMemberName(programacao?.oracao_inicial_id)}</span>
                                        </div>
                                    </div>

                                    {/* Cantico Inicial */}
                                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">
                                        {(programacao?.evento_tipo === 'visita spte' && config?.cantico_inicial_meio_semana)
                                            ? `Cântico ${config.cantico_inicial_meio_semana}`
                                            : programacao?.cantico_inicial 
                                                ? `Cântico ${programacao.cantico_inicial}` 
                                                : 'Cântico Inicial'}
                                    </div>

                                    {/* Sections */}
                                    {renderPartSection('Tesouros da Palavra de Deus', 'TESOUROS', 'text-slate-700 dark:text-slate-300 border-slate-700 dark:border-slate-500')}
                                    
                                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 mt-4">
                                        {(programacao?.evento_tipo === 'visita spte' && config?.cantico_meio_meio_semana)
                                            ? `Cântico ${config.cantico_meio_meio_semana}`
                                            : programacao?.cantico_meio 
                                                ? `Cântico ${programacao.cantico_meio}` 
                                                : 'Cântico Intermediário'}
                                    </div>

                                    {renderPartSection('Faça Seu Melhor no Ministério', 'MINISTERIO', 'text-amber-600 dark:text-amber-500 border-amber-600 dark:border-amber-500')}
                                    
                                    {renderPartSection('Nossa Vida Cristã', 'VIDA_CRISTA', 'text-red-700 dark:text-red-500 border-red-700 dark:border-red-500')}

                                    {/* Discurso do Superintendente if visit week */}
                                    {programacao?.evento_tipo === 'visita spte' && config?.midweek_discurso_tema && (
                                        <div className="mb-6 break-inside-avoid">
                                            <div className="grid grid-cols-12 gap-2 items-start text-sm">
                                                <div className="col-span-2 font-bold text-slate-800 dark:text-slate-200">
                                                    {getDiscursoStartTime()}
                                                </div>
                                                <div className="col-span-6 font-medium text-slate-800 dark:text-slate-200">
                                                    {renderBoldTime("10. Discurso de Serviço (30 min)")}
                                                    <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                                                        "{config.midweek_discurso_tema}"
                                                    </div>
                                                </div>
                                                <div className="col-span-4 text-right">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                                        {colaboradores.find(c => c.funcao?.toLowerCase().includes('superintendente') || c.funcao?.toLowerCase().includes('circuito'))?.nome || 'Superintendente de Circuito'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Oracao Final */}
                                    <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-between items-center">
                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                            {(programacao?.evento_tipo === 'visita spte' && config?.cantico_final_meio_semana) 
                                                ? `Cântico ${config.cantico_final_meio_semana}` 
                                                : programacao?.cantico_final 
                                                    ? `Cântico ${programacao.cantico_final}` 
                                                    : 'Cântico Final'}
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Oração Final</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                                                {getMemberName(
                                                    (programacao?.evento_tipo === 'visita spte' && config?.oracao_final_meio_semana_id)
                                                        ? config.oracao_final_meio_semana_id
                                                        : programacao?.oracao_final_id
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {(!programacao?.partes || programacao.partes.length === 0) && (
                                        <div className="text-center py-12 border-t border-slate-200 dark:border-slate-800 mt-6">
                                            <p className="text-slate-500 text-sm">Nenhuma programação configurada.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {outrosView === 'publica' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <button onClick={() => setOutrosView('menu')} className="mb-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:text-emerald-700 transition-colors">
                                    <ArrowLeft className="w-4 h-4" /> Voltar para Menu
                                </button>

                                <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                    {/* Decorative top border */}
                                    <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600 dark:bg-blue-500"></div>

                                    <div className="text-center mb-8 border-b border-slate-300 dark:border-slate-700 pb-6">
                                        <h2 className="text-2xl font-bold uppercase mb-1 text-slate-900 dark:text-slate-100">Reunião Pública e Estudo de A Sentinela</h2>
                                    </div>

                                    {/* Top Roles */}
                                    <div className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-6 text-center">
                                        <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Presidente</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{getWeekendAssignment('PRESIDENTE')}</span>
                                    </div>

                                    {/* Cantico Inicial */}
                                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-6 border-b border-slate-200 dark:border-slate-700 pb-2">
                                        {(programacao?.evento_tipo === 'visita spte' && config?.cantico_inicial_fim_semana)
                                            ? `Cântico ${config.cantico_inicial_fim_semana}`
                                            : weekendProg?.cantico_inicial 
                                                ? `Cântico ${weekendProg.cantico_inicial}` 
                                                : 'Cântico Inicial'}
                                    </div>

                                    {/* Discurso Público Section */}
                                    <div className="mb-6 break-inside-avoid">
                                        <h3 className="text-sm font-extrabold uppercase mb-3 border-b-2 border-slate-700 dark:border-slate-500 pb-1 text-slate-700 dark:text-slate-300">
                                            Discurso Público
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-12 gap-2 items-start text-sm">
                                                <div className="col-span-8 font-medium text-slate-800 dark:text-slate-200">
                                                    <span className="font-bold">Discurso (30 min)</span>
                                                    <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                                                        "{config?.weekend_discurso_tema || 'Tema não definido'}"
                                                    </div>
                                                </div>
                                                <div className="col-span-4 text-right">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                                        {colaboradores.find(c => c.funcao?.toLowerCase().includes('superintendente') || c.funcao?.toLowerCase().includes('circuito'))?.nome || 'Superintendente de Circuito'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cantico Intermediario */}
                                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-6 border-b border-slate-200 dark:border-slate-700 pb-2 mt-4">
                                        {weekendProg?.cantico_meio 
                                            ? `Cântico ${weekendProg.cantico_meio}` 
                                            : 'Cântico Intermediário'}
                                    </div>

                                    {/* Estudo de A Sentinela Section */}
                                    <div className="mb-6 break-inside-avoid">
                                        <h3 className="text-sm font-extrabold uppercase mb-3 border-b-2 border-red-700 dark:border-red-500 pb-1 text-red-700 dark:text-red-500">
                                            Estudo de A Sentinela
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-12 gap-2 items-start text-sm">
                                                <div className="col-span-8 font-medium text-slate-800 dark:text-slate-200">
                                                    <span className="font-bold">Estudo (30 min)</span>
                                                </div>
                                                <div className="col-span-4 text-right">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                                        Dirigente de A Sentinela
                                                    </div>
                                                    {getWeekendAssignment('LEITOR_SENTINELA') !== 'Não designado' && (
                                                        <div className="text-xs text-slate-500 italic mt-0.5">
                                                            Leitor: {getWeekendAssignment('LEITOR_SENTINELA')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Discurso de Serviço Section */}
                                    {programacao?.evento_tipo === 'visita spte' && config?.weekend_discurso_final_tema && (
                                        <div className="mb-6 break-inside-avoid">
                                            <h3 className="text-sm font-extrabold uppercase mb-3 border-b-2 border-teal-700 dark:border-teal-500 pb-1 text-teal-700 dark:text-teal-500">
                                                Discurso Final
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-12 gap-2 items-start text-sm">
                                                    <div className="col-span-8 font-medium text-slate-800 dark:text-slate-200">
                                                        <span className="font-bold">Discurso de Serviço (30 min)</span>
                                                        <div className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                                                            "{config.weekend_discurso_final_tema}"
                                                        </div>
                                                    </div>
                                                    <div className="col-span-4 text-right">
                                                        <div className="font-bold text-slate-800 dark:text-slate-200">
                                                            {colaboradores.find(c => c.funcao?.toLowerCase().includes('superintendente') || c.funcao?.toLowerCase().includes('circuito'))?.nome || 'Superintendente de Circuito'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Cantico Final */}
                                    <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 text-center">
                                        <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                            {(programacao?.evento_tipo === 'visita spte' && config?.cantico_final_fim_semana) 
                                                ? `Cântico ${config.cantico_final_fim_semana}` 
                                                : weekendProg?.cantico_final 
                                                    ? `Cântico ${weekendProg.cantico_final}` 
                                                    : 'Cântico Final'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {outrosView === 'campo' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <button onClick={() => setOutrosView('menu')} className="mb-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:text-emerald-700 transition-colors">
                                    <ArrowLeft className="w-4 h-4" /> Voltar para Menu
                                </button>
                                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl mb-4">
                                    <h2 className="text-emerald-800 dark:text-emerald-400 font-bold text-sm mb-1">💼 Saídas de Campo</h2>
                                    <p className="text-emerald-700/80 dark:text-emerald-400/70 text-xs">Arranjos para o serviço de campo na semana da visita.</p>
                                </div>

                                <div className="space-y-4">
                                    {(config?.saidas_campo || []).length > 0 ? (
                                        config.saidas_campo.map((saida: any) => (
                                            <div key={saida.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col gap-3">
                                                <div className="flex justify-between items-center border-b dark:border-slate-800/50 pb-2">
                                                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                                                        {saida.dia}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{saida.hora}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                                                    <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                                    <span className="font-medium text-sm">{saida.local}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                                            <p className="text-slate-500 text-sm">Nenhuma saída de campo cadastrada.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {outrosView === 'especiais' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <button onClick={() => setOutrosView('menu')} className="mb-4 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:text-emerald-700 transition-colors">
                                    <ArrowLeft className="w-4 h-4" /> Voltar para Menu
                                </button>
                                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl mb-4">
                                    <h2 className="text-emerald-800 dark:text-emerald-400 font-bold text-sm mb-1">⭐ Reuniões Especiais</h2>
                                    <p className="text-emerald-700/80 dark:text-emerald-400/70 text-xs">Agenda das reuniões especiais desta semana.</p>
                                </div>

                                <div className="space-y-3">
                                    {[
                                        { title: 'Reunião com Grupo LS', data: config?.reuniao_ls },
                                        { title: 'Reunião com Pioneiros', data: config?.reuniao_pioneiros },
                                        { title: 'Reunião Anciãos e SM', data: config?.reuniao_anciaos }
                                    ].map((reuniao, idx) => {
                                        if (!reuniao.data?.data && !reuniao.data?.hora) return null;
                                        
                                        const parsedDate = reuniao.data.data ? format(parseISO(reuniao.data.data), 'dd/MM/yyyy') : '';
                                        
                                        return (
                                            <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col gap-3">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-base border-b dark:border-slate-800/50 pb-2">
                                                    {reuniao.title}
                                                </h3>
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                                                        <Calendar className="w-4 h-4 text-emerald-500" />
                                                        <span className="font-semibold">{parsedDate}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs">
                                                        <Clock className="w-4 h-4 text-emerald-500" />
                                                        <span className="font-semibold">{reuniao.data.hora}</span>
                                                    </div>
                                                </div>

                                                {reuniao.data.local && (
                                                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-transparent">
                                                        <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                                                        <span className="font-medium">{reuniao.data.local}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                    
                                    {(!config?.reuniao_ls?.data && !config?.reuniao_pioneiros?.data && !config?.reuniao_anciaos?.data) && (
                                        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
                                            <p className="text-slate-500 text-sm">Nenhuma reunião especial configurada.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
