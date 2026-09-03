'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/PageHeader'

type Conflito = { data: string; designacao: string }
type Ausencia = { id: string; data_inicio: string; data_fim: string; conflitos?: Conflito[] }
type PinSession = { id: string }

function getSession(): PinSession | null {
    try {
        const session = JSON.parse(localStorage.getItem('membro_sessao') || 'null')
        return session?.id ? session : null
    } catch {
        return null
    }
}

function formatDate(value: string) {
    return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
}

export default function MinhaAusenciaPage() {
    const router = useRouter()
    const [session, setSession] = useState<PinSession | null>(null)
    const [ausencias, setAusencias] = useState<Ausencia[]>([])
    const [inicio, setInicio] = useState('')
    const [fim, setFim] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    const loadAusencias = async (current: PinSession) => {
        const { data, error } = await supabase.rpc('listar_minhas_ausencias', { p_membro_id: current.id })
        if (error) throw error
        const result = await Promise.all(((data || []) as Ausencia[]).map(async ausencia => {
            const { data: conflitos } = await supabase.rpc('obter_conflitos_ausencia', { p_membro_id: current.id, p_data_inicio: ausencia.data_inicio, p_data_fim: ausencia.data_fim })
            return { ...ausencia, conflitos: (conflitos || []) as Conflito[] }
        }))
        setAusencias(result)
    }

    const load = async () => {
        const current = getSession()
        if (!current) {
            router.replace('/')
            return
        }

        setSession(current)
        try { await loadAusencias(current) } catch (error: any) { toast.error(error.message) }
        setLoading(false)
    }

    useEffect(() => {
        const timer = window.setTimeout(() => { void load() }, 0)
        return () => window.clearTimeout(timer)
        // The session is read only once when this page opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const save = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!session || !inicio || !fim || inicio > fim) {
            toast.error('Informe um período válido.')
            return
        }

        setSaving(true)
        const { error } = editingId
            ? await supabase.rpc('atualizar_minhas_ausencias', { p_membro_id: session.id, p_ausencia_id: editingId, p_data_inicio: inicio, p_data_fim: fim })
            : await supabase.rpc('salvar_minhas_ausencias', { p_membro_id: session.id, p_data_inicio: inicio, p_data_fim: fim })
        if (error) toast.error(error.message)
        else {
            await loadAusencias(session)
            setInicio('')
            setFim('')
            setEditingId(null)
            window.dispatchEvent(new Event('ausencias-atualizadas'))
            toast.success('Ausência informada. Novas designações serão bloqueadas nesse período.')
        }
        setSaving(false)
    }

    const remove = async (id: string) => {
        if (!session || !confirm('Remover este período de ausência?')) return
        const { error } = await supabase.rpc('excluir_minhas_ausencias', {
            p_membro_id: session.id,
            p_ausencia_id: id,
        })
        if (error) toast.error(error.message)
        else {
            setAusencias(current => current.filter(item => item.id !== id))
            window.dispatchEvent(new Event('ausencias-atualizadas'))
            toast.success('Ausência removida.')
        }
    }

    const edit = (ausencia: Ausencia) => {
        setEditingId(ausencia.id)
        setInicio(ausencia.data_inicio)
        setFim(ausencia.data_fim)
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <main className="max-w-2xl mx-auto p-6 md:p-8">
            <PageHeader
                title="Informar ausência"
                subtitle="Informe o período em que você estará fora e não poderá fazer partes. O sistema impedirá novas designações para você nesse período."
            />

            <form onSubmit={save} className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm font-medium">SAIO dia<input required type="date" value={inicio} onChange={event => setInicio(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
                    <label className="text-sm font-medium">VOLTO dia<input required type="date" min={inicio || undefined} value={fim} onChange={event => setFim(event.target.value)} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-800" /></label>
                </div>
                <button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Salvando...' : editingId ? 'Salvar alteração' : 'Informar ausência'}</button>
            </form>

            <section className="mt-8">
                <h2 className="font-semibold mb-3">Períodos informados</h2>
                {ausencias.length === 0 ? <p className="text-sm text-gray-500">Nenhum período informado.</p> : (
                    <div className="space-y-3">
                        {ausencias.map(item => <div key={item.id} className="rounded-lg border p-3 dark:border-slate-800"><div className="flex items-center justify-between"><span>{formatDate(item.data_inicio)} a {formatDate(item.data_fim)}</span><div><button onClick={() => edit(item)} className="p-2 text-blue-600" title="Editar"><Pencil className="w-4 h-4" /></button><button onClick={() => void remove(item.id)} className="p-2 text-red-600" title="Excluir"><Trash2 className="w-4 h-4" /></button></div></div>{item.conflitos && item.conflitos.length > 0 && <div className="mt-3 space-y-2"><p className="text-sm font-medium text-amber-700 dark:text-amber-300">Você tem designações para esse período. Escolha um substituto e avise o irmão responsável para ele trocar.</p>{item.conflitos.map((conflito, index) => <div key={`${conflito.data}-${index}`} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">Designação: <strong>{conflito.designacao}</strong> dia {formatDate(conflito.data)}.</div>)}</div>}</div>)}
                    </div>
                )}
            </section>
        </main>
    )
}
