'use client'

import Link from 'next/link'

interface PasswordReminderModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function PasswordReminderModal({ isOpen, onClose }: PasswordReminderModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">🛡️</span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Crie Sua Senha Pessoal
                    </h3>

                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Você está usando a senha compartilhada. Para manter o registro correto das ações, por favor crie seu login individual usando o item <strong>Crie Sua Senha</strong>.
                    </p>

                    <div className="flex flex-col gap-3">
                        <Link
                            href="/admin/meu-login"
                            onClick={onClose}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                        >
                            <span>Ir para Crie Sua Senha</span>
                            <span>→</span>
                        </Link>

                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Lembrar Depois
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
