'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/database.types'

type DadosCongregacao = Database['public']['Tables']['dados_congregacao']['Row']

const EMPTY_DATA: Omit<DadosCongregacao, 'created_at' | 'updated_at'> = {
    id: true,
    nome: '',
    numero: '',
    circuito: '',
    cep: '',
    endereco: '',
    cidade: '',
    estado: '',
}

const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits
}

export default function DadosCongregacaoPage() {
    const [form, setForm] = useState(EMPTY_DATA)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [searchingCep, setSearchingCep] = useState(false)

    useEffect(() => {
        const loadData = async () => {
            const { data, error } = await supabase
                .from('dados_congregacao')
                .select('*')
                .eq('id', true)
                .maybeSingle()

            if (error) {
                console.error('Erro ao buscar dados da congregação:', error)
                alert('Não foi possível carregar os dados da congregação.')
            } else if (data) {
                setForm({
                    id: data.id,
                    nome: data.nome,
                    numero: data.numero,
                    circuito: data.circuito,
                    cep: formatCep(data.cep),
                    endereco: data.endereco,
                    cidade: data.cidade,
                    estado: data.estado,
                })
            }

            setLoading(false)
        }

        void loadData()
    }, [])

    const updateField = (field: keyof typeof EMPTY_DATA, value: string | boolean) => {
        setForm(current => ({ ...current, [field]: value }))
    }

    const searchCep = async (cep: string) => {
        if (cep.length !== 8) {
            return
        }

        setSearchingCep(true)
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
            if (!response.ok) throw new Error('Falha na consulta do CEP.')

            const address = await response.json()
            if (address.erro) {
                alert('CEP não encontrado.')
                return
            }

            setForm(current => ({
                ...current,
                endereco: [address.logradouro, address.bairro].filter(Boolean).join(' - ') || current.endereco,
                cidade: address.localidade || current.cidade,
                estado: address.uf || current.estado,
            }))
        } catch (error) {
            console.error('Erro ao consultar CEP:', error)
            alert('Não foi possível buscar esse CEP. Preencha o endereço manualmente.')
        } finally {
            setSearchingCep(false)
        }
    }

    const handleCepChange = (value: string) => {
        const formattedCep = formatCep(value)
        const cep = formattedCep.replace(/\D/g, '')
        updateField('cep', formattedCep)

        if (cep.length === 8) {
            void searchCep(cep)
        }
    }

    const saveData = async () => {
        if (!form.nome.trim() || !form.numero.trim() || !form.circuito.trim()) {
            alert('Preencha nome, número e circuito da congregação.')
            return
        }

        setSaving(true)
        try {
            const { error } = await supabase
                .from('dados_congregacao')
                .upsert({
                    ...form,
                    cep: form.cep.replace(/\D/g, ''),
                    estado: form.estado.toUpperCase().slice(0, 2),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' })

            if (error) throw error
            alert('Dados da congregação salvos com sucesso.')
        } catch (error: any) {
            console.error('Erro ao salvar dados da congregação:', error)
            alert(`Não foi possível salvar: ${error.message || 'erro desconhecido'}`)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Carregando...</div>
    }

    return (
        <div className="w-full min-w-0 pb-24">
            <PageHeader
                className="mb-12"
                title="Dados da Congregação"
                backHref="/administracao"
                backLabel="Administração"
            />

            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <label className="sm:col-span-2 block">
                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Nome da congregação</span>
                        <input value={form.nome} onChange={event => updateField('nome', event.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="Ex.: Congregação Central" />
                    </label>

                    <label className="block">
                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Número</span>
                        <input value={form.numero} onChange={event => updateField('numero', event.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="Ex.: 12345" />
                    </label>

                    <label className="block">
                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Circuito</span>
                        <input value={form.circuito} onChange={event => updateField('circuito', event.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="Ex.: SP-01" />
                    </label>

                    <div className="sm:col-span-2">
                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">CEP</span>
                        <div className="relative">
                            <input value={form.cep} onChange={event => handleCepChange(event.target.value)} inputMode="numeric" className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 pr-11 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="00000-000" />
                            {searchingCep && <Loader2 className="absolute right-3 top-1/2 w-5 h-5 -translate-y-1/2 animate-spin text-primary" />}
                        </div>
                    </div>

                    <label className="sm:col-span-2 block">
                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Endereço</span>
                        <input value={form.endereco} onChange={event => updateField('endereco', event.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="Rua, avenida e bairro" />
                    </label>

                    <label className="block">
                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Cidade</span>
                        <input value={form.cidade} onChange={event => updateField('cidade', event.target.value)} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary" />
                    </label>

                    <label className="block">
                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Estado</span>
                        <input value={form.estado} onChange={event => updateField('estado', event.target.value.toUpperCase().slice(0, 2))} maxLength={2} className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary uppercase" placeholder="SP" />
                    </label>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button type="button" onClick={saveData} disabled={saving} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-blue-700 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed">
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Salvando...' : 'Salvar dados'}
                    </button>
                </div>
            </div>
        </div>
    )
}
