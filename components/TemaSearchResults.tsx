'use client'

import { groupTemas, temaCodigo, type TemaIdentidade } from '@/lib/temaLabel'

export type TemaOption = TemaIdentidade & { id: string; titulo: string }

export default function TemaSearchResults({
    temas,
    onSelect,
}: {
    temas: TemaOption[]
    onSelect: (tema: TemaOption) => void
}) {
    if (temas.length === 0) {
        return (
            <div className="p-3 text-slate-500 dark:text-slate-400 text-center">
                Nenhum tema encontrado
            </div>
        )
    }

    return (
        <>
            {groupTemas(temas).map(group => (
                <div key={group.tipo}>
                    <div className="sticky top-0 z-10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                        {group.label}
                    </div>
                    {group.items.map(t => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onSelect(t)}
                            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-b border-slate-100 dark:border-slate-700 last:border-0 text-slate-900 dark:text-white"
                        >
                            <span className="font-bold text-blue-600 dark:text-blue-400">{temaCodigo(t)}</span>
                            <span className="ml-2">{t.titulo}</span>
                        </button>
                    ))}
                </div>
            ))}
        </>
    )
}
