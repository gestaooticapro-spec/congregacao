'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useBiometricAuth } from '@/hooks/useBiometricAuth'
import BiometricSetupPrompt from '@/components/BiometricSetupPrompt'
import { Fingerprint } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showBiometricPrompt, setShowBiometricPrompt] = useState(false)

    const router = useRouter()
    const { isSupported, isEnrolled, registerBiometric, authenticateBiometric, updateBiometricToken } = useBiometricAuth()

    useEffect(() => {
        // Auto-check for biometric login availability
        if (isEnrolled) {
            handleBiometricLogin()
        }
    }, [isEnrolled])

    const handleBiometricLogin = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await authenticateBiometric()
            if (!result) throw new Error('Falha na autenticação')
            const { refreshToken } = result

            const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

            if (error || !data.session) {
                throw new Error('Sessão expirada')
            }

            // Success! Update token and redirect
            updateBiometricToken(data.session.refresh_token)
            router.push('/')
            router.refresh()
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Erro na autenticação biométrica')
            if (loading) setLoading(false)
        } finally {
            setLoading(false)
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                setError('Credenciais inválidas. Verifique seu e-mail e senha.')
            } else {
                // Login success
                if (data.session?.refresh_token) {
                    updateBiometricToken(data.session.refresh_token)
                }

                // Check if we should offer biometric setup
                if (isSupported && !isEnrolled) {
                    setShowBiometricPrompt(true)
                    // Don't redirect yet
                } else {
                    router.push('/')
                    router.refresh()
                }
            }
        } catch (err) {
            setError('Ocorreu um erro ao tentar fazer login.')
        } finally {
            if (!showBiometricPrompt) setLoading(false)
        }
    }

    const handleEnableBiometric = async () => {
        if (!email) return // Should have email from state if just logged in
        // Wait, if we just logged in, 'email' state variable might be empty if user used autofill? 
        // No, 'email' state is bound to input.
        // But to be safe, let's use the session user email if available.
        const { data: { user } } = await supabase.auth.getUser()
        const userEmail = user?.email || email

        await registerBiometric(userEmail)
        setShowBiometricPrompt(false)
        router.push('/')
        router.refresh()
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            {showBiometricPrompt && (
                <BiometricSetupPrompt
                    onEnable={handleEnableBiometric}
                    onSkip={() => {
                        setShowBiometricPrompt(false)
                        router.push('/')
                        router.refresh()
                    }}
                />
            )}

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
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Endereço de e-mail"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Senha
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>

                        {isEnrolled && !loading && (
                            <button
                                type="button"
                                onClick={handleBiometricLogin}
                                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <Fingerprint size={18} />
                                Entrar com Biometria
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}
