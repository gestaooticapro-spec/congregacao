'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { createUserForMember, changePassword } from '@/app/actions/auth.actions'
import { useRouter } from 'next/navigation'

export default function MeuLoginPage() {
    const [loading, setLoading] = useState(true)
    const [isSharedAdmin, setIsSharedAdmin] = useState(false)
    const [membros, setMembros] = useState<any[]>([])
    const [selectedMembro, setSelectedMembro] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const router = useRouter()

    useEffect(() => {
        checkUser()
    }, [])

    const checkUser = async () => {
        setLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const { data: membro, error } = await supabase
                .from('membros')
                .select('id, nome_completo')
                .eq('user_id', session.user.id)
                .single()

            if (error && error.code !== 'PGRST116') throw error

            if (!membro || membro.nome_completo.toLowerCase().includes('admin')) {
                setIsSharedAdmin(true)
                await fetchMembrosSemLogin()
            } else {
                setIsSharedAdmin(false)
            }
        } catch (err) {
            console.error('Erro ao verificar sessao:', err)
            setMessage({ type: 'error', text: 'Erro ao verificar sessao' })
        } finally {
            setLoading(false)
        }
    }

    const fetchMembrosSemLogin = async () => {
        try {
            const { data, error } = await supabase
                .from('membros')
                .select('id, nome_completo')
                .is('user_id', null)
                .or('is_anciao.eq.true,is_servo_ministerial.eq.true')
                .order('nome_completo')

            if (error) throw error
            setMembros(data || [])
        } catch (err) {
            console.error('Erro ao carregar membros sem login:', err)
            setMembros([])
        }
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem' })
            return
        }
        if (!selectedMembro) {
            setMessage({ type: 'error', text: 'Selecione um membro' })
            return
        }

        setMessage(null)
        const res = await createUserForMember(selectedMembro, email, password)

        if (res.success) {
            setMessage({ type: 'success', text: 'Login criado com sucesso! Você já pode usar este email e senha.' })
            setEmail('')
            setPassword('')
            setConfirmPassword('')
            setSelectedMembro('')
            fetchMembrosSemLogin() // Refresh list
        } else {
            setMessage({ type: 'error', text: res.error || 'Erro ao criar login' })
        }
    }

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem' })
            return
        }

        setMessage(null)
        const res = await changePassword(password)

        if (res.success) {
            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' })
            setPassword('')
            setConfirmPassword('')
        } else {
            setMessage({ type: 'error', text: res.error || 'Erro ao alterar senha' })
        }
    }

    if (loading) return <div className="p-8 text-center">Carregando...</div>

    return (
        <div className="max-w-2xl mx-auto p-8">
            <div className="text-center mb-12">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {isSharedAdmin ? 'Crie Sua Senha' : 'Altere Sua Senha'}
                </h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
                <p className="mt-4 text-slate-600 dark:text-slate-400">
                    {isSharedAdmin
                        ? 'Crie um login individual para você e deixe de usar a senha compartilhada.'
                        : 'Mantenha sua conta segura alterando sua senha periodicamente.'}
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                {message && (
                    <div className={`p-4 mb-6 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                {isSharedAdmin ? (
                    <form onSubmit={handleCreateUser} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Quem é você?
                            </label>
                            <select
                                value={selectedMembro}
                                onChange={(e) => setSelectedMembro(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                required
                            >
                                <option value="">Selecione seu nome...</option>
                                {membros.map(m => (
                                    <option key={m.id} value={m.id}>{m.nome_completo}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-2">
                                * Apenas membros sem login aparecem aqui.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Seu Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                placeholder="exemplo@email.com"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Senha
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Confirmar Senha
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
                        >
                            Criar Meu Login
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleChangePassword} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Nova Senha
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    Confirmar Nova Senha
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                                    required
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
                        >
                            Alterar Senha
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
