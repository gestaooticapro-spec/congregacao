import { useState } from 'react'
import { Fingerprint, X } from 'lucide-react'

interface BiometricSetupPromptProps {
    onEnable: () => Promise<void>
    onSkip: () => void
}

export default function BiometricSetupPrompt({ onEnable, onSkip }: BiometricSetupPromptProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleEnable = async () => {
        setLoading(true)
        setError(null)
        try {
            await onEnable()
        } catch (err) {
            setError('Falha ao ativar biometria. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl relative">
                <button
                    onClick={onSkip}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="bg-blue-100 p-4 rounded-full">
                        <Fingerprint size={48} className="text-blue-600" />
                    </div>

                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Ativar Biometria?</h3>
                        <p className="text-gray-500 mt-2 text-sm">
                            Use sua impressão digital ou FaceID para entrar mais rápido na próxima vez.
                        </p>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 p-2 rounded w-full">
                            {error}
                        </div>
                    )}

                    <div className="w-full space-y-3 pt-2">
                        <button
                            onClick={handleEnable}
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Ativando...' : 'Ativar Agora'}
                        </button>

                        <button
                            onClick={onSkip}
                            className="w-full text-gray-500 py-2 font-medium hover:text-gray-700"
                        >
                            Agora não
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
