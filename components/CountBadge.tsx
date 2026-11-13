'use client'

import { useState } from 'react'

/** 0 e 1 em vermelho, 2 e 3 em amarelo. 4 ou mais herda o branco do selo. */
function classeDaFaixa(valor: number): string | null {
    if (valor <= 1) return 'text-red-600 dark:text-red-400'
    if (valor <= 3) return 'text-yellow-600 dark:text-yellow-300'
    return null
}

function NumerosDoSelo({ texto }: { texto: string }) {
    const partes = texto.split(/(\d+)/)
    return partes.map((parte, indice) => {
        if (!/^\d+$/.test(parte)) return <span key={indice}>{parte}</span>
        const classe = classeDaFaixa(Number(parte))
        if (!classe) return <span key={indice}>{parte}</span>
        return (
            <span key={indice} className={classe}>
                {parte}
            </span>
        )
    })
}

export default function CountBadge({
    id,
    status,
    visivel,
    explicacao,
}: {
    id: string
    status: 'loading' | 'ready'
    visivel: string | null
    explicacao: string | null
}) {
    const [hover, setHover] = useState(false)
    const [pinned, setPinned] = useState(false)
    const [focused, setFocused] = useState(false)
    const aberto = hover || pinned || focused

    if (status === 'loading') {
        return (
            <span
                className="pointer-events-none absolute -top-1 -right-2 z-20 h-5 w-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"
                role="status"
                aria-label="Carregando contagem"
            />
        )
    }

    const texto = explicacao ?? 'Contagem indisponível'
    const numero = visivel ?? '—'
    const tooltipId = `contagem-${id}`

    return (
        <span className="pointer-events-none absolute -top-2 -right-3 z-20">
            <button
                type="button"
                className="pointer-events-auto min-h-5 whitespace-nowrap rounded-full border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold leading-none text-slate-900 shadow-sm tabular-nums dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                aria-label={texto}
                aria-describedby={aberto ? tooltipId : undefined}
                aria-expanded={aberto}
                onPointerEnter={(event) => {
                    if (event.pointerType === 'mouse') setHover(true)
                }}
                onPointerLeave={(event) => {
                    if (event.pointerType === 'mouse') setHover(false)
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    setFocused(false)
                    setPinned(false)
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        setPinned(false)
                        setHover(false)
                        event.currentTarget.blur()
                    }
                }}
                onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setPinned(atual => !atual)
                }}
            >
                <NumerosDoSelo texto={numero} />
            </button>
            {aberto && (
                <span
                    id={tooltipId}
                    role="tooltip"
                    className="pointer-events-auto absolute right-0 top-full z-30 mt-1 w-48 rounded-md bg-slate-900 px-2.5 py-2 text-left text-xs font-medium leading-4 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900"
                    onMouseDown={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                    }}
                    onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                    }}
                >
                    {texto}
                </span>
            )}
        </span>
    )
}
