'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Eye, EyeOff, KeyRound } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showPasswordRecovery, setShowPasswordRecovery] = useState(false)
    const [recoveryLoading, setRecoveryLoading] = useState(false)
    const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        console.log('[Login] Login attempt started', { email })

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                console.error('[Login] signInWithPassword failed', { message: error.message })
                setError('Credenciais inválidas. Verifique seu e-mail e senha.')
            } else {
                console.log('[Login] Login succeeded', { userId: data.user?.id ?? null })
                router.replace('/')
                router.refresh()
            }
        } catch (err) {
            console.error('[Login] Unexpected login exception', err)
            setError('Ocorreu um erro ao tentar fazer login.')
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordRecovery = async (e: React.FormEvent) => {
        e.preventDefault()
        setRecoveryLoading(true)
        setRecoveryMessage(null)

        const redirectTo = `${window.location.origin}/redefinir-senha`
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

        if (error) {
            console.error('[Login] Password recovery request failed', { message: error.message })
            setRecoveryMessage('Não foi possível enviar o e-mail agora. Tente novamente.')
        } else {
            // Esta mensagem não confirma se o e-mail existe, evitando exposição de contas.
            setRecoveryMessage('Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.')
        }

        setRecoveryLoading(false)
    }

    return (
        // Changed items-center to items-start and added pt-20 to move form to top
        <div className="min-h-screen flex items-start justify-center bg-gray-50 pt-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Acesso Restrito
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Área administrativa da Congregação Guaíra
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Endereço de e-mail
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Endereço de e-mail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="password" className="sr-only">
                                Senha
                            </label>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm pr-10"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center z-20 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                                ) : (
                                    <Eye className="h-5 w-5" aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <button
                        type="button"
                        onClick={() => {
                            setShowPasswordRecovery((value) => !value)
                            setRecoveryMessage(null)
                        }}
                        className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
                    >
                        <KeyRound className="h-4 w-4" aria-hidden="true" />
                        Esqueci minha senha
                    </button>
                </div>

                {showPasswordRecovery && (
                    <form className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-3" onSubmit={handlePasswordRecovery}>
                        <p className="text-sm text-blue-950">
                            Informe seu e-mail para receber o link de redefinição de senha.
                        </p>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="block w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm"
                            placeholder="Endereço de e-mail"
                            required
                        />
                        {recoveryMessage && (
                            <p className="text-sm text-blue-900">{recoveryMessage}</p>
                        )}
                        <button
                            type="submit"
                            disabled={recoveryLoading}
                            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-400"
                        >
                            {recoveryLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
