'use client'

import CountBadge from '@/components/CountBadge'
import type { CountSource, ResponsibilityCounts } from '@/lib/responsibilityCounts'

function quantidade(valor: number, um: string, varios: string): string {
    return `${valor} ${valor === 1 ? um : varios}`
}

function textoDoSelo(source: CountSource, counts: ResponsibilityCounts): { visivel: string; explicacao: string } | null {
    if (source === 'midweek') {
        if (!counts.midweek) return null
        const { scheduled, complete } = counts.midweek
        return {
            visivel: `${scheduled}/${complete}`,
            explicacao: `${quantidade(scheduled, 'programação cadastrada', 'programações cadastradas')}; ${quantidade(complete, 'semana já designada', 'semanas já designadas')}`,
        }
    }
    const valor = source === 'talks' ? counts.talks
        : source === 'support' ? counts.support
        : source === 'field' ? counts.field
        : counts.cleaning
    if (valor === null) return null
    if (source === 'talks') {
        return { visivel: String(valor), explicacao: quantidade(valor, 'data com discurso', 'datas com discurso') }
    }
    if (source === 'support') {
        return { visivel: String(valor), explicacao: quantidade(valor, 'reunião de apoio', 'reuniões de apoio') }
    }
    if (source === 'field') {
        return { visivel: String(valor), explicacao: quantidade(valor, 'data com dirigente', 'datas com dirigente') }
    }
    return { visivel: String(valor), explicacao: quantidade(valor, 'semana de limpeza coberta', 'semanas de limpeza cobertas') }
}

export default function CoverageBadge({
    source,
    status,
    counts,
}: {
    source: CountSource
    status: 'loading' | 'ready'
    counts: ResponsibilityCounts | null
}) {
    if (status === 'loading' || !counts) {
        return <CountBadge id={source} status="loading" visivel={null} explicacao={null} />
    }
    const selo = textoDoSelo(source, counts)
    return (
        <CountBadge
            id={source}
            status="ready"
            visivel={selo?.visivel ?? null}
            explicacao={selo?.explicacao ?? null}
        />
    )
}
