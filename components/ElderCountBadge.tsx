'use client'

import CountBadge from '@/components/CountBadge'
import { textoDoSeloAnciao, type ElderCounts, type ElderSource } from '@/lib/elderCounts'

export default function ElderCountBadge({
    source,
    status,
    counts,
}: {
    source: ElderSource
    status: 'loading' | 'ready'
    counts: ElderCounts | null
}) {
    if (status === 'loading' || !counts) {
        return <CountBadge id={source} status="loading" visivel={null} explicacao={null} />
    }
    const selo = textoDoSeloAnciao(source, counts)
    return (
        <CountBadge
            id={source}
            status="ready"
            visivel={selo?.visivel ?? null}
            explicacao={selo?.explicacao ?? null}
        />
    )
}
