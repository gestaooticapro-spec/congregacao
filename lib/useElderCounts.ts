'use client'

import { useEffect, useState } from 'react'
import { getCongregationDate } from '@/lib/dateUtils'
import {
    elderSourceNeedsUser,
    elderSourcesForHrefs,
    loadElderCounts,
    type ElderCounts,
} from '@/lib/elderCounts'

const MINUTE_MS = 60_000

export function useElderCounts(hrefs: string[], userId: string | null) {
    const key = hrefs.slice().sort().join('|')
    const [status, setStatus] = useState<'loading' | 'ready'>('loading')
    const [counts, setCounts] = useState<ElderCounts | null>(null)

    useEffect(() => {
        const sources = elderSourcesForHrefs(key ? key.split('|') : [])
        if (sources.length === 0) {
            setCounts(null)
            setStatus('ready')
            return
        }
        if (sources.some(elderSourceNeedsUser) && !userId) {
            setStatus('loading')
            return
        }

        let cancelled = false
        let request = 0
        let lastDate = ''

        const run = (quiet: boolean) => {
            const hoje = getCongregationDate()
            lastDate = hoje
            const id = ++request
            if (!quiet) setStatus('loading')
            loadElderCounts(hoje, userId, sources).then(result => {
                if (cancelled || id !== request) return
                setCounts(result)
                setStatus('ready')
            })
        }

        run(false)

        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return
            if (getCongregationDate() !== lastDate) run(true)
        }, MINUTE_MS)

        return () => {
            cancelled = true
            window.clearInterval(timer)
        }
    }, [key, userId])

    return { status, counts }
}
