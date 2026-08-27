'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

type MembroResumo = {
    id: string
    nome_completo: string
    total_temas: number
}

type Tema = { id: string; numero: number; titulo: string; membro_tema_id?: string; is_paused?: boolean }

export default function TemasPreparadosTab() {
    const [selectedMembro, setSelectedMembro] = useState<{ id: string, nome: string } | null>(null)
    const [membros, setMembros] = useState<MembroResumo[]>([])
    const [loading, setLoading] = useState(true)

    // Detalhes do membro (Twin de Meus Temas)
    const [temasPreparados, setTemasPreparados] = useState<Tema[]>([])
    const [temasDisponiveis, setTemasDisponiveis] = useState<Tema[]>([])
    const [temaSelecionadoId, setTemaSelecionadoId] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [showResults, setShowResults] = useState(false)
    const [addingTema, setAddingTema] = useState(false)
    const [loadingTemas, setLoadingTemas] = useState(false)

    // Share
    const [isShareModalOpen, setIsShareModalOpen] = useState(false)
    const [selectedSpeechesIds, setSelectedSpeechesIds] = useState<string[]>([])
    const [contatos, setContatos] = useState<{ id: string; nome: string; telefone: string; tipo: string }[]>([])
    const [selectedContactId, setSelectedContactId] = useState('')
    const [manualPhone, setManualPhone] = useState('')
    const [loadingContacts, setLoadingContacts] = useState(false)

    const filteredTemas = temasDisponiveis.filter(t =>
        t.numero.toString().includes(searchTerm) ||
        t.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    useEffect(() => {
        fetchMembros()
    }, [])

    useEffect(() => {
        if (selectedMembro) {
            fetchTemasPreparados(selectedMembro.id)
            fetchTemasDisponiveis()
        }
    }, [selectedMembro])

    const fetchMembros = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('membros')
                .select(`
                    id, 
                    nome_completo,
                    membros_temas (count)
                `)
                .or('is_anciao.eq.true,is_servo_ministerial.eq.true')
                .order('nome_completo')

            if (error) throw error

            const formatados: MembroResumo[] = data.map((m: any) => ({
                id: m.id,
                nome_completo: m.nome_completo,
                total_temas: m.membros_temas?.[0]?.count || 0
            }))

            setMembros(formatados)
        } catch (error) {
            console.error('Erro ao buscar membros:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchTemasPreparados = async (membroId: string) => {
        setLoadingTemas(true)
        try {
            const { data, error } = await supabase
                .from('membros_temas')
                .select('id, is_paused, tema:temas(id, numero, titulo)')
                .eq('membro_id', membroId)

            if (error) throw error

            const temas = data.map((item: any) => ({
                id: item.tema.id,
                numero: item.tema.numero,
                titulo: item.tema.titulo,
                membro_tema_id: item.id,
                is_paused: item.is_paused
            })).sort((a: any, b: any) => a.numero - b.numero)
            setTemasPreparados(temas)
        } catch (error) {
            console.error('Erro ao buscar temas:', error)
        } finally {
            setLoadingTemas(false)
        }
    }

    const fetchTemasDisponiveis = async () => {
        const { data } = await supabase.from('temas').select('id, numero, titulo').order('numero')
        setTemasDisponiveis(data || [])
    }

    const fetchContacts = async () => {
        setLoadingContacts(true)
        try {
            const [membrosRes, oradoresRes, colaboradoresRes] = await Promise.all([
                supabase.from('membros').select('id, nome_completo, contato').not('contato', 'is', null).eq('ativo', true),
                supabase.from('oradores_visitantes').select('id, nome, telefone, congregacao'),
                supabase.from('colaboradores_externos').select('id, nome, contato, funcao')
            ])

            const list: { id: string; nome: string; telefone: string; tipo: string }[] = []

            membrosRes.data?.forEach(m => {
                list.push({ id: m.id, nome: m.nome_completo, telefone: m.contato!, tipo: 'Membro' })
            })

            oradoresRes.data?.forEach(o => {
                list.push({ id: o.id, nome: `${o.nome} (${o.congregacao})`, telefone: o.telefone!, tipo: 'Visitante' })
            })

            colaboradoresRes.data?.forEach(c => {
                list.push({ id: c.id, nome: `${c.nome} (${c.funcao})`, telefone: c.contato!, tipo: 'Externo' })
            })

            setContatos(list.sort((a, b) => a.nome.localeCompare(b.nome)))
        } catch (error) {
            console.error('Erro ao buscar contatos:', error)
        } finally {
            setLoadingContacts(false)
        }
    }

    const handleAddTema = async () => {
        if (!temaSelecionadoId || !selectedMembro) return
        setAddingTema(true)
        try {
            const { error: linkError } = await supabase
                .from('membros_temas')
                .insert({ membro_id: selectedMembro.id, tema_id: temaSelecionadoId })

            if (linkError) {
                if (linkError.code === '23505') {
                    alert('Este tema já está na lista.')
                } else {
                    throw linkError
                }
            } else {
                setTemaSelecionadoId('')
                setSearchTerm('')
                fetchTemasPreparados(selectedMembro.id)
                // Atualiza contagem na lista principal em background
                fetchMembros()
            }
        } catch (error: any) {
            console.error('Erro ao adicionar tema:', error)
            alert('Erro ao adicionar tema: ' + error.message)
        } finally {
            setAddingTema(false)
        }
    }

    const handleRemoveTema = async (temaId: string) => {
        if (!confirm('Remover este tema da lista do irmão?')) return
        if (!selectedMembro) return

        try {
            const { error } = await supabase
                .from('membros_temas')
                .delete()
                .eq('membro_id', selectedMembro.id)
                .eq('tema_id', temaId)

            if (error) throw error
            fetchTemasPreparados(selectedMembro.id)
            fetchMembros()
        } catch (error) {
            console.error('Erro ao remover tema:', error)
            alert('Erro ao remover tema')
        }
    }



    const handleShare = () => {
        let phone = manualPhone
        if (selectedContactId) {
            const contact = contatos.find(c => c.id === selectedContactId)
            if (contact) phone = contact.telefone
        }

        if (!phone) {
            alert('Por favor, selecione um contato ou digite um número.')
            return
        }

        const selectedSpeeches = temasPreparados.filter(t => selectedSpeechesIds.includes(t.id))
        if (selectedSpeeches.length === 0) {
            alert('Por favor, selecione pelo menos um tema.')
            return
        }

        let message = `Olá! Segue a lista de temas preparados de *${selectedMembro?.nome}*:\n\n`
        selectedSpeeches.forEach(t => {
            message += `*#${t.numero}* - ${t.titulo}\n`
        })

        const encodedMessage = encodeURIComponent(message)
        const cleanPhone = phone.replace(/\D/g, '')
        let finalPhone = cleanPhone
        if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
            finalPhone = '55' + cleanPhone
        }

        window.open(`https://wa.me/${finalPhone}?text=${encodedMessage}`, '_blank')
        setIsShareModalOpen(false)
    }

    // --- VISÃO DE LISTA DE ORADORES ---
    if (!selectedMembro) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Oradores Locais</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Gerencie os temas de cada irmão</p>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-slate-500">Carregando...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {membros.map(membro => (
                            <button
                                key={membro.id}
                                onClick={() => setSelectedMembro({ id: membro.id, nome: membro.nome_completo })}
                                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-all text-left"
                            >
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{membro.nome_completo}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        {membro.total_temas === 0 ? (
                                            <span className="text-orange-500 flex items-center gap-1">⚠️ Nenhum tema</span>
                                        ) : (
                                            <span>{membro.total_temas} {membro.total_temas === 1 ? 'tema' : 'temas'}</span>
                                        )}
                                    </p>
                                </div>
                                <div className="text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // --- VISÃO DE DETALHES DO ORADOR ---
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setSelectedMembro(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
                    title="Voltar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Temas de {selectedMembro.nome}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Adicione, remova ou compartilhe os temas do irmão.</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                {/* Actions Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>🎤</span> {temasPreparados.length} {temasPreparados.length === 1 ? 'tema' : 'temas'}
                    </h3>
                    {temasPreparados.length > 0 && (
                        <button
                            onClick={() => {
                                setSelectedSpeechesIds(temasPreparados.map(t => t.id))
                                fetchContacts()
                                setIsShareModalOpen(true)
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20 text-sm"
                        >
                            <span>📱</span> Compartilhar
                        </button>
                    )}
                </div>

                {/* Add Theme Section */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row gap-4 relative z-20">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setShowResults(true)
                                    setTemaSelecionadoId('')
                                }}
                                onFocus={() => setShowResults(true)}
                                placeholder="Digite o número ou nome do tema..."
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all dark:text-white"
                            />

                            {showResults && (
                                <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                    {filteredTemas.length === 0 ? (
                                        <div className="p-3 text-slate-500 dark:text-slate-400 text-center">
                                            Nenhum tema encontrado
                                        </div>
                                    ) : (
                                        filteredTemas.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    setTemaSelecionadoId(t.id)
                                                    setSearchTerm(`#${t.numero} - ${t.titulo}`)
                                                    setShowResults(false)
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                                            >
                                                <span className="font-bold text-primary">#{t.numero}</span>
                                                <span className="ml-2 text-slate-700 dark:text-slate-300">{t.titulo}</span>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleAddTema}
                            disabled={addingTema || !temaSelecionadoId}
                            className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-all sm:w-auto w-full"
                        >
                            {addingTema ? 'Adicionando...' : 'Adicionar Tema'}
                        </button>
                    </div>

                    {showResults && (
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowResults(false)}
                        ></div>
                    )}
                </div>

                {/* Themes List */}
                <div className="p-4">
                    {loadingTemas ? (
                        <div className="text-center py-8 text-slate-500">Carregando temas...</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2">
                            {temasPreparados.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-slate-500 dark:text-slate-400">Nenhum tema preparado para este orador.</p>
                                </div>
                            ) : (
                                temasPreparados.map((tema) => (
                                    <div key={tema.id} className={`flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors ${tema.is_paused ? 'opacity-60' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <span className={`w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold rounded-lg text-sm ${tema.is_paused ? 'grayscale' : ''}`}>
                                                {tema.numero}
                                            </span>
                                            <span className={`font-medium text-slate-700 dark:text-slate-300 ${tema.is_paused ? 'line-through' : ''}`}>{tema.titulo}</span>
                                            {tema.is_paused && (
                                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">Pausado</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleRemoveTema(tema.id)}
                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                                title="Remover tema"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Share Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="text-green-500">📱</span> Compartilhar Temas
                            </h3>
                            <button
                                onClick={() => setIsShareModalOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* Speech Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Selecione os temas para enviar</label>
                                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                                    {temasPreparados.map(t => (
                                        <label key={t.id} className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl transition-colors ${t.is_paused ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}>
                                            <input
                                                type="checkbox"
                                                disabled={t.is_paused}
                                                checked={!t.is_paused && selectedSpeechesIds.includes(t.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedSpeechesIds(prev => [...prev, t.id])
                                                    } else {
                                                        setSelectedSpeechesIds(prev => prev.filter(id => id !== t.id))
                                                    }
                                                }}
                                                className="w-5 h-5 text-primary rounded border-slate-300"
                                            />
                                            <span className="text-sm font-bold text-primary">#{t.numero}</span>
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{t.titulo}</span>
                                            {t.is_paused && <span className="text-xs text-orange-600 font-bold ml-auto">(Pausado)</span>}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Contact Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Enviar para quem?</label>
                                <div className="space-y-4">
                                    <select
                                        value={selectedContactId}
                                        onChange={(e) => {
                                            setSelectedContactId(e.target.value)
                                            if (e.target.value) setManualPhone('')
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none dark:text-white"
                                    >
                                        <option value="">Selecione um contato da lista...</option>
                                        {loadingContacts ? (
                                            <option disabled>Carregando contatos...</option>
                                        ) : (
                                            contatos.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    [{c.tipo}] {c.nome}
                                                </option>
                                            ))
                                        )}
                                    </select>

                                    <div className="flex items-center gap-4">
                                        <div className="h-px bg-slate-200 dark:border-slate-800 flex-1"></div>
                                        <span className="text-xs font-bold text-slate-400">OU DIGITE O NÚMERO</span>
                                        <div className="h-px bg-slate-200 dark:border-slate-800 flex-1"></div>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="(00) 00000-0000"
                                        value={manualPhone}
                                        onChange={(e) => {
                                            setManualPhone(e.target.value)
                                            if (e.target.value) setSelectedContactId('')
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                            <button
                                onClick={handleShare}
                                className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 flex items-center justify-center gap-2"
                            >
                                <span>📱</span> Abrir no WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
