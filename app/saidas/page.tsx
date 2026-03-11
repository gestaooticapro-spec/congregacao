'use client';

import { useState, useEffect } from 'react';
import { getSaidas, canEditSaidas, Saida } from '@/app/actions/saidas.actions';
import { useRouter } from 'next/navigation';

export default function SaidasPage() {
    const [selectedObs, setSelectedObs] = useState<string | null>(null);
    const [schedule, setSchedule] = useState<Saida[]>([]);
    const [canEdit, setCanEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const load = async () => {
            const [scheduleRes, editRes] = await Promise.all([
                getSaidas(),
                canEditSaidas()
            ]);

            if (!scheduleRes.error && scheduleRes.data) {
                setSchedule(scheduleRes.data);
            }
            setCanEdit(editRes);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) return <div className="p-8 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]"><span className="animate-pulse">Carregando horários...</span></div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Horário de Campo Especial</h1>

                {canEdit && (
                    <button
                        onClick={() => router.push('/admin/saidas')}
                        className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                    >
                        <span>✏️</span> Editar Horários
                    </button>
                )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-sm border-b border-slate-100 dark:border-slate-800">
                                <th className="py-3 px-4 font-bold">Dia</th>
                                <th className="py-3 px-4 font-bold">Hora</th>
                                <th className="py-3 px-4 font-bold">Local</th>
                                <th className="py-3 px-4 font-bold text-center">Obs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {schedule.map((item, index) => (
                                <tr key={item.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">{item.dia}</td>
                                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{item.hora}</td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.local.toLowerCase() === 'zoom'
                                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                            }`}>
                                            {item.local}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {item.obs && item.obs.trim() !== '' && (
                                            <button
                                                onClick={() => setSelectedObs(item.obs)}
                                                className="text-slate-400 hover:text-blue-500 transition-colors"
                                                title="Ver observação"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {schedule.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-500">
                                        Nenhum horário de campo encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal for Obs */}
            {selectedObs && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" onClick={() => setSelectedObs(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg mb-2 dark:text-white">Observação</h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-6">{selectedObs}</p>
                        <button
                            onClick={() => setSelectedObs(null)}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
