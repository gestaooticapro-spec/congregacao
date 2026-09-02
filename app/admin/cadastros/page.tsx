'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database.types'
import PageHeader from '@/components/PageHeader'

type Tema = Database['public']['Tables']['temas']['Row']
type Visitante = Database['public']['Tables']['oradores_visitantes']['Row']

export default function CadastrosPage() {
    const [activeTab, setActiveTab] = useState<'TEMAS' | 'VISITANTES' | 'COLABORADORES'>('TEMAS')

    useEffect(() => {
        const aba = new URLSearchParams(window.location.search).get('aba')
        if (aba === 'visitantes') setActiveTab('VISITANTES')
        if (aba === 'colaboradores') setActiveTab('COLABORADORES')
        if (aba === 'temas') setActiveTab('TEMAS')
    }, [])

    return (
        <div className="w-full min-w-0">
            <PageHeader
                className="mb-6"
                title="Cadastros"
                backHref="/responsabilidades"
                backLabel="Responsabilidades"
            />

            <div className="w-full min-w-0 grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
                <button
                    type="button"
                    onClick={() => setActiveTab('TEMAS')}
                    className={`px-1.5 sm:px-4 py-2 rounded-lg font-semibold text-[11px] sm:text-sm leading-tight text-center transition-all ${activeTab === 'TEMAS'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    📚 Discursos Públicos
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('VISITANTES')}
                    className={`px-1.5 sm:px-4 py-2 rounded-lg font-semibold text-[11px] sm:text-sm leading-tight text-center transition-all ${activeTab === 'VISITANTES'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    🎤 Oradores de Fora
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('COLABORADORES')}
                    className={`px-1.5 sm:px-4 py-2 rounded-lg font-semibold text-[11px] sm:text-sm leading-tight text-center transition-all ${activeTab === 'COLABORADORES'
                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    🤝 Colaboradores
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 overflow-hidden min-w-0">
                {activeTab === 'TEMAS' && <TemasList />}
                {activeTab === 'VISITANTES' && <VisitantesList />}
                {activeTab === 'COLABORADORES' && <ColaboradoresList />}
            </div>
        </div>
    )
}

function TemasList() {
    const [temas, setTemas] = useState<Tema[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Form
    const [id, setId] = useState('')
    const [numero, setNumero] = useState('')
    const [titulo, setTitulo] = useState('')

    useEffect(() => {
        fetchTemas()
    }, [])

    const fetchTemas = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('temas').select('*').order('numero', { ascending: true })
            if (error) throw error
            setTemas(data || [])
        } catch (error) {
            console.error('Error fetching temas:', error)
            setTemas([])
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (tema: Tema) => {
        setId(tema.id)
        setNumero(tema.numero.toString())
        setTitulo(tema.titulo)
        setShowModal(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este tema?')) return
        try {
            const { error } = await supabase.from('temas').delete().eq('id', id)
            if (error) throw error
            fetchTemas()
        } catch (error) {
            console.error(error)
            alert('Erro ao excluir tema')
        }
    }

    const handleSave = async () => {
        if (!numero || !titulo) {
            alert('Preencha todos os campos')
            return
        }

        setSaving(true)
        try {
            const payload = { numero: parseInt(numero), titulo }

            if (id) {
                const { error } = await supabase.from('temas').update(payload).eq('id', id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('temas').insert(payload)
                if (error) throw error
            }

            setShowModal(false)
            resetForm()
            fetchTemas()
        } catch (error: any) {
            console.error(error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const resetForm = () => {
        setId('')
        setNumero('')
        setTitulo('')
    }

    const filteredTemas = temas.filter(t =>
        t.numero.toString().includes(searchTerm) ||
        t.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Buscar tema..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full min-w-0 p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800"
                />
                <button
                    type="button"
                    onClick={() => { resetForm(); setShowModal(true) }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto shrink-0"
                >
                    + Novo Tema
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{id ? 'Editar Tema' : 'Novo Tema'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Número</label>
                                <input type="number" value={numero} onChange={e => setNumero(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Título</label>
                                <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 -mx-4">
                {filteredTemas.map(t => (
                    <div key={t.id} className="flex items-start justify-between gap-3 p-4">
                        <div className="min-w-0 flex items-start gap-3">
                            <span className="w-10 h-10 shrink-0 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold rounded-lg text-sm">
                                {t.numero}
                            </span>
                            <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug break-words">{t.titulo}</p>
                        </div>
                        <div className="flex items-center shrink-0">
                            <button type="button" onClick={() => handleEdit(t)} className="p-2" title="Editar">✏️</button>
                            <button type="button" onClick={() => handleDelete(t.id)} className="p-2" title="Excluir">🗑️</button>
                        </div>
                    </div>
                ))}
                {filteredTemas.length === 0 && (
                    <div className="p-8 text-center text-slate-500">Nenhum tema encontrado.</div>
                )}
            </div>

            <div className="hidden md:block max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead className="sticky top-0 bg-white dark:bg-slate-900">
                        <tr className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-800">
                            <th className="py-3 px-4 font-bold w-20">Nº</th>
                            <th className="py-3 px-4 font-bold">Título</th>
                            <th className="py-3 px-4 font-bold text-right w-28">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTemas.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-3 px-4 font-bold text-primary">{t.numero}</td>
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300 break-words">{t.titulo}</td>
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                    <button onClick={() => handleEdit(t)} className="text-blue-500 hover:text-blue-700 p-2">✏️</button>
                                    <button onClick={() => handleDelete(t.id)} className="text-red-500 hover:text-red-700 p-2">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function VisitantesList() {
    const [visitantes, setVisitantes] = useState<Visitante[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Form
    const [id, setId] = useState('')
    const [nome, setNome] = useState('')
    const [congregacao, setCongregacao] = useState('')
    const [cidade, setCidade] = useState('')
    const [telefone, setTelefone] = useState('')

    useEffect(() => {
        fetchVisitantes()
    }, [])

    const fetchVisitantes = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('oradores_visitantes').select('*').order('nome', { ascending: true })
            if (error) throw error
            setVisitantes(data || [])
        } catch (error) {
            console.error('Error fetching visitantes:', error)
            setVisitantes([])
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (v: Visitante) => {
        setId(v.id)
        setNome(v.nome)
        setCongregacao(v.congregacao)
        setCidade(v.cidade)
        setTelefone(v.telefone || '')
        setShowModal(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este orador?')) return
        try {
            const { error } = await supabase.from('oradores_visitantes').delete().eq('id', id)
            if (error) throw error
            fetchVisitantes()
        } catch (error) {
            console.error(error)
            alert('Erro ao excluir orador')
        }
    }

    const handleSave = async () => {
        if (!nome || !congregacao || !cidade) {
            alert('Preencha os campos obrigatórios')
            return
        }

        setSaving(true)
        try {
            const payload = { nome, congregacao, cidade, telefone }

            if (id) {
                const { error } = await supabase.from('oradores_visitantes').update(payload).eq('id', id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('oradores_visitantes').insert(payload)
                if (error) throw error
            }

            setShowModal(false)
            resetForm()
            fetchVisitantes()
        } catch (error: any) {
            console.error(error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const resetForm = () => {
        setId('')
        setNome('')
        setCongregacao('')
        setCidade('')
        setTelefone('')
    }

    const filteredVisitantes = visitantes.filter(v =>
        v.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.congregacao.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Buscar orador..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full min-w-0 p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800"
                />
                <button
                    type="button"
                    onClick={() => { resetForm(); setShowModal(true) }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto shrink-0"
                >
                    + Novo Orador
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{id ? 'Editar Orador' : 'Novo Orador'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Nome</label>
                                <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Congregação</label>
                                <input type="text" value={congregacao} onChange={e => setCongregacao(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Cidade</label>
                                <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Telefone</label>
                                <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 -mx-4">
                {filteredVisitantes.map(v => {
                    const incompleto = !v.congregacao?.trim() || v.congregacao === 'A definir'
                    return (
                        <div key={v.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <p className={`font-semibold leading-tight break-words ${incompleto ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>{v.nome}</p>
                                <div className="flex items-center shrink-0">
                                    <button type="button" onClick={() => handleEdit(v)} className="p-2" title="Editar">✏️</button>
                                    <button type="button" onClick={() => handleDelete(v.id)} className="p-2" title="Excluir">🗑️</button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${incompleto ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                                    {v.congregacao || 'Sem congregação'}
                                </span>
                                {v.cidade ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {v.cidade}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    )
                })}
                {filteredVisitantes.length === 0 && (
                    <div className="p-8 text-center text-slate-500">Nenhum orador encontrado.</div>
                )}
            </div>

            <div className="hidden md:block overflow-x-clip">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                        <tr className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-800">
                            <th className="py-3 px-4 font-bold">Nome</th>
                            <th className="py-3 px-4 font-bold">Congregação</th>
                            <th className="py-3 px-4 font-bold">Cidade</th>
                            <th className="py-3 px-4 font-bold text-right w-28">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredVisitantes.map(v => (
                            <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white break-words">{v.nome}</td>
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300 break-words">{v.congregacao}</td>
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300 break-words">{v.cidade}</td>
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                    <button onClick={() => handleEdit(v)} className="text-blue-500 hover:text-blue-700 p-2">✏️</button>
                                    <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:text-red-700 p-2">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function ColaboradoresList() {
    type Colaborador = Database['public']['Tables']['colaboradores_externos']['Row']
    type ColaboradorInsert = Database['public']['Tables']['colaboradores_externos']['Insert']

    const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    // Form
    const [id, setId] = useState('')
    const [nome, setNome] = useState('')
    const [contato, setContato] = useState('')
    const [funcao, setFuncao] = useState('')

    useEffect(() => {
        fetchColaboradores()
    }, [])

    const fetchColaboradores = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('colaboradores_externos').select('*').order('nome')
            if (error) throw error
            setColaboradores(data || [])
        } catch (error) {
            console.error('Error fetching colaboradores:', error)
            setColaboradores([])
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (c: Colaborador) => {
        setId(c.id)
        setNome(c.nome)
        setContato(c.contato || '')
        setFuncao(c.funcao)
        setShowModal(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este colaborador?')) return
        try {
            const { error } = await supabase.from('colaboradores_externos').delete().eq('id', id)
            if (error) throw error
            fetchColaboradores()
        } catch (error) {
            console.error(error)
            alert('Erro ao excluir colaborador')
        }
    }

    const handleSave = async () => {
        if (!nome || !funcao) {
            alert('Nome e Função são obrigatórios')
            return
        }

        setSaving(true)
        try {
            const payload: ColaboradorInsert = { nome, contato, funcao }

            if (id) {
                const { error } = await supabase.from('colaboradores_externos').update(payload).eq('id', id)
                if (error) throw error
            } else {
                const { error } = await supabase.from('colaboradores_externos').insert(payload)
                if (error) throw error
            }

            setShowModal(false)
            resetForm()
            fetchColaboradores()
        } catch (error: any) {
            console.error(error)
            alert('Erro ao salvar: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const resetForm = () => {
        setId('')
        setNome('')
        setContato('')
        setFuncao('')
    }

    const filteredColaboradores = colaboradores.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.funcao.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                    type="text"
                    placeholder="Buscar colaborador..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full min-w-0 p-2.5 border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800"
                />
                <button
                    type="button"
                    onClick={() => { resetForm(); setShowModal(true) }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto shrink-0"
                >
                    + Novo Colaborador
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">{id ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">Nome</label>
                                <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Função</label>
                                <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="Ex: Superintendente de Circuito" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Contato (WhatsApp)</label>
                                <input type="text" value={contato} onChange={e => setContato(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" placeholder="(00) 00000-0000" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50">
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 -mx-4">
                {filteredColaboradores.map(c => (
                    <div key={c.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-slate-900 dark:text-white leading-tight break-words">{c.nome}</p>
                            <div className="flex items-center shrink-0">
                                <button type="button" onClick={() => handleEdit(c)} className="p-2" title="Editar">✏️</button>
                                <button type="button" onClick={() => handleDelete(c.id)} className="p-2" title="Excluir">🗑️</button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {c.funcao ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                                    {c.funcao}
                                </span>
                            ) : null}
                            {c.contato ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {c.contato}
                                </span>
                            ) : null}
                        </div>
                    </div>
                ))}
                {filteredColaboradores.length === 0 && (
                    <div className="p-8 text-center text-slate-500">Nenhum colaborador encontrado.</div>
                )}
            </div>

            <div className="hidden md:block overflow-x-clip">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                        <tr className="text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-800">
                            <th className="py-3 px-4 font-bold">Nome</th>
                            <th className="py-3 px-4 font-bold">Função</th>
                            <th className="py-3 px-4 font-bold">Contato</th>
                            <th className="py-3 px-4 font-bold text-right w-28">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredColaboradores.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white break-words">{c.nome}</td>
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                    <span className="inline-block px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-md uppercase tracking-wider break-words">
                                        {c.funcao}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-slate-700 dark:text-slate-300 break-words">{c.contato}</td>
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                    <button onClick={() => handleEdit(c)} className="text-blue-500 hover:text-blue-700 p-2">✏️</button>
                                    <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 p-2">🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
