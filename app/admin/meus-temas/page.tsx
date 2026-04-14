'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthProvider'

type Tema = { id: string; numero: number; titulo: string }

export default function MeusTemasPage() {
    const { user, loading: authLoading } = useAuth()

    const [membroId, setMembroId] = useState<string | null>(null)
    const [membroNome, setMembroNome] = useState<string>('')
    const [resolving, setResolving] = useState(true)
    const [notLinked, setNotLinked] = useState(false)
    const [notElder, setNotElder] = useState(false)

    // Themes
    const [temasPreparados, setTemasPreparados] = useState<Tema[]>([])
    const [temasDisponiveis, setTemasDisponiveis] = useState<Tema[]>([])
    const [temaSelecionadoId, setTemaSelecionadoId] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [showResults, setShowResults] = useState(false)
    const [addingTema, setAddingTema] = useState(false)

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

    // Resolve logged-in user → membro
    useEffect(() => {
        if (authLoading) return
        if (!user) {
            setResolving(false)
            return
        }

        const resolve = async () => {
            setResolving(true)
            try {
                const { data: membro, error } = await supabase
                    .from('membros')
                    .select('id, nome_completo, is_anciao, is_servo_ministerial')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (error) throw error

                if (!membro) {
                    setNotLinked(true)
                    setResolving(false)
                    return
                }

                if (!membro.is_anciao && !membro.is_servo_ministerial) {
                    setNotElder(true)
                    setResolving(false)
                    return
                }

                setMembroId(membro.id)
                setMembroNome(membro.nome_completo)
            } catch (err) {
                console.error('Erro ao resolver membro:', err)
                setNotLinked(true)
            } finally {
                setResolving(false)
            }
        }

        resolve()
    }, [user, authLoading])

    // Fetch themes when membroId is resolved
    useEffect(() => {
        if (!membroId) return
        fetchTemasPreparados()
        fetchTemasDisponiveis()
    }, [membroId])

    const fetchTemasPreparados = useCallback(async () => {
        if (!membroId) return
        const { data, error } = await supabase
            .from('membros_temas')
            .select('tema:temas(id, numero, titulo)')
            .eq('membro_id', membroId)

        if (error) {
            console.error('Erro ao buscar temas:', error)
        } else {
            const temas = data.map((item: any) => item.tema).sort((a: any, b: any) => a.numero - b.numero)
            setTemasPreparados(temas)
        }
    }, [membroId])

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
        if (!temaSelecionadoId || !membroId) return
        setAddingTema(true)
        try {
            const { error: linkError } = await supabase
                .from('membros_temas')
                .insert({ membro_id: membroId, tema_id: temaSelecionadoId })

            if (linkError) {
                if (linkError.code === '23505') {
                    alert('Este tema já está na sua lista.')
                } else {
                    throw linkError
                }
            } else {
                setTemaSelecionadoId('')
                setSearchTerm('')
                fetchTemasPreparados()
            }
        } catch (error: any) {
            console.error('Erro ao adicionar tema:', error)
            alert('Erro ao adicionar tema: ' + error.message)
        } finally {
            setAddingTema(false)
        }
    }

    const handleRemoveTema = async (temaId: string) => {
        if (!confirm('Remover este tema da sua lista?')) return
        if (!membroId) return

        try {
            const { error } = await supabase
                .from('membros_temas')
                .delete()
                .eq('membro_id', membroId)
                .eq('tema_id', temaId)

            if (error) throw error
            fetchTemasPreparados()
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

        let message = `Olá! Segue a lista de temas preparados de *${membroNome}*:\n\n`
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

    // --- Loading & Error States ---
    if (authLoading || resolving) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="animate-spin inline-block w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando...</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
                    <span className="text-5xl">🔒</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h2>
                    <p className="text-slate-500 dark:text-slate-400">Você precisa estar logado para acessar esta página.</p>
                </div>
            </div>
        )
    }

    if (notLinked) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
                    <span className="text-5xl">⚠️</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Conta Não Vinculada</h2>
                    <p className="text-slate-500 dark:text-slate-400">Seu login não está vinculado a nenhum membro cadastrado. Peça ao administrador para vincular seu e-mail à sua ficha de membro.</p>
                </div>
            </div>
        )
    }

    if (notElder) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4 p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md">
                    <span className="text-5xl">📋</span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Sem Temas</h2>
                    <p className="text-slate-500 dark:text-slate-400">Esta funcionalidade é exclusiva para oradores (anciãos e servos ministeriais).</p>
                </div>
            </div>
        )
    }

    // --- Page Content ---
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Meus Temas</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full mb-3"></div>
                <p className="text-slate-500 dark:text-slate-400">
                    Temas preparados de <span className="font-semibold text-slate-700 dark:text-slate-300">{membroNome}</span>
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

                {/* Actions Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span>🎤</span> {temasPreparados.length} {temasPreparados.length === 1 ? 'tema preparado' : 'temas preparados'}
                    </h3>
                    {temasPreparados.length > 0 && (
                        <button
                            onClick={() => {
                                setSelectedSpeechesIds(temasPreparados.map(t => t.id))
                                fetchContacts()
                                setIsShareModalOpen(true)
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20"
                        >
                            <span>📱</span> Compartilhar via WA
                        </button>
                    )}
                </div>

                {/* Add Theme Section */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
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
                            {addingTema ? 'Adicionando...' : 'Adicionar'}
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
                <div className="p-6">
                    <div className="grid grid-cols-1 gap-2">
                        {temasPreparados.length === 0 ? (
                            <div className="text-center py-12">
                                <span className="text-5xl block mb-4">📝</span>
                                <p className="text-slate-500 dark:text-slate-400 italic">Nenhum tema cadastrado ainda.</p>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Use o campo acima para adicionar seus temas preparados.</p>
                            </div>
                        ) : (
                            temasPreparados.map((tema) => (
                                <div key={tema.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold rounded-lg text-sm">
                                            {tema.numero}
                                        </span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{tema.titulo}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveTema(tema.id)}
                                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                                        title="Remover tema"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
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
                                        <label key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={selectedSpeechesIds.includes(t.id)}
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
