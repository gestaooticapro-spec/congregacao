'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

export default function RedefinirSenhaPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [checkingLink, setCheckingLink] = useState(true)
    const [validLink, setValidLink] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        let active = true

        const setSessionState = (hasSession: boolean) => {
            if (!active) return
            setValidLink(hasSession)
            setCheckingLink(false)
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY' || session) {
                setSessionState(true)
            }
        })

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSessionState(Boolean(session))
        })

        return () => {
            active = false
            subscription.unsubscribe()
        }
    }, [])

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (password !== confirmPassword) {
            setMessage('As senhas não coincidem.')
            return
        }

        setLoading(true)
        setMessage(null)
        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setMessage('Não foi possível redefinir sua senha. Solicite um novo link e tente novamente.')
            setLoading(false)
            return
        }

        await supabase.auth.signOut()
        router.replace('/login')
    }

    if (checkingLink) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">Validando link...</div>
    }

    if (!validLink) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-900">Link inválido ou expirado</h1>
                    <p className="mt-3 text-sm text-gray-600">Solicite uma nova recuperação de senha na página de login.</p>
                    <button onClick={() => router.replace('/login')} className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                        Voltar ao login
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 rounded-xl bg-white p-8 shadow-sm">
                <div className="text-center">
                    <KeyRound className="mx-auto h-9 w-9 text-blue-600" aria-hidden="true" />
                    <h1 className="mt-3 text-2xl font-bold text-gray-900">Redefinir senha</h1>
                    <p className="mt-2 text-sm text-gray-600">Escolha uma nova senha para sua conta.</p>
                </div>

                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">
                        Nova senha
                        <div className="relative mt-1">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10"
                                minLength={6}
                                autoComplete="new-password"
                                required
                            />
                            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 px-3 text-gray-500" aria-label="Mostrar ou ocultar senha">
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                        Confirmar nova senha
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                            minLength={6}
                            autoComplete="new-password"
                            required
                        />
                    </label>
                </div>

                {message && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p>}

                <button type="submit" disabled={loading} className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-400">
                    {loading ? 'Redefinindo...' : 'Redefinir senha'}
                </button>
            </form>
        </div>
    )
}
