'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { X, Lock, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface PinLoginModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function PinLoginModal({ isOpen, onClose }: PinLoginModalProps) {
    const [pin, setPin] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    if (!isOpen) return null

    const handlePinInput = (digit: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + digit)
        }
    }

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1))
    }

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (pin.length !== 4) return

        setIsLoading(true)
        try {
            const { data, error } = await supabase.rpc('verificar_pin', { p_pin: pin })

            if (error) throw error

            if (!data || data.length === 0) {
                toast.error('PIN inválido')
                setPin('')
                return
            }

            const member = data[0]

            // Save member logic (session via localstorage)
            localStorage.setItem('membro_sessao', JSON.stringify({
                id: member.id,
                nome: member.nome_completo,
                grupo_id: member.grupo_id,
                is_pioneiro: member.is_pioneiro,
                pin: pin,
                timestamp: Date.now()
            }))

            toast.success(`Bem-vindo, ${member.nome_completo.split(' ')[0]}!`)
            onClose()
            router.push('/meu-relatorio')

        } catch (err: any) {
            console.error('Erro ao verificar PIN:', err)
            const errMsg = err?.message || 'Erro desconhecido.'
            toast.error(`Falha no Login: Faça login como admin se for a 1ª vez, ou verifique se as migrações SQL (RPC) rodaram. (${errMsg})`)
            setPin('')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm relative overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Lock className="w-5 h-5" />
                        <h2 className="font-semibold">Acesso Rápido</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-8 border border-blue-100 dark:border-blue-900/20">
                        <p className="text-sm text-blue-800 dark:text-blue-300 text-center leading-relaxed">
                            <span className="font-bold block mb-1 text-base">Acesso via PIN 🔐</span>
                            Digite seus 4 dígitos abaixo. Se ainda não possui ou esqueceu seu PIN,
                            <span className="font-bold block mt-1 underline decoration-blue-500/30">Solicite-o a seu Dirigente de Grupo ou a um Ancião.</span>
                        </p>
                    </div>

                    {/* PIN Display */}
                    <div className="flex justify-center gap-3 mb-8">
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className={`w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-bold border-2 transition-all duration-200 ${pin.length > index
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                    : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-transparent'
                                    }`}
                            >
                                {pin.length > index ? '•' : ''}
                            </div>
                        ))}
                    </div>

                    {/* Keypad */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handlePinInput(num.toString())}
                                disabled={isLoading || pin.length === 4}
                                className="h-14 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 dark:active:bg-slate-600 text-xl font-medium transition-colors disabled:opacity-50"
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={handleDelete}
                            disabled={isLoading || pin.length === 0}
                            className="h-14 rounded-xl bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 active:bg-red-200 dark:active:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium transition-colors flex items-center justify-center disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => handlePinInput('0')}
                            disabled={isLoading || pin.length === 4}
                            className="h-14 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 dark:active:bg-slate-600 text-xl font-medium transition-colors disabled:opacity-50"
                        >
                            0
                        </button>
                        <button
                            onClick={() => handleSubmit()}
                            disabled={isLoading || pin.length !== 4}
                            className="h-14 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:text-gray-400"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
