'use client'

import { useEffect, useState } from 'react'
import { getCongregationDate } from '@/lib/dateUtils'
import {
    countSourcesForHrefs,
    loadResponsibilityCounts,
    type ResponsibilityCounts,
} from '@/lib/responsibilityCounts'

const MINUTE_MS = 60_000

export function useResponsibilityCounts(hrefs: string[]) {
    const key = hrefs.slice().sort().join('|')
    const [status, setStatus] = useState<'loading' | 'ready'>('loading')
    const [counts, setCounts] = useState<ResponsibilityCounts | null>(null)

    useEffect(() => {
        const sources = countSourcesForHrefs(key ? key.split('|') : [])
        if (sources.length === 0) {
            setCounts(null)
            setStatus('ready')
            return
        }

        let cancelled = false
        let request = 0
        let lastDate = ''

        const run = () => {
            const hoje = getCongregationDate()
            lastDate = hoje
            const id = ++request
            setStatus('loading')
            loadResponsibilityCounts(hoje, sources).then(result => {
                if (cancelled || id !== request) return
                setCounts(result)
                setStatus('ready')
            })
        }

        run()

        const onVisible = () => {
            if (document.visibilityState === 'visible') run()
        }
        document.addEventListener('visibilitychange', onVisible)
        const timer = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return
            if (getCongregationDate() !== lastDate) run()
        }, MINUTE_MS)

        return () => {
            cancelled = true
            document.removeEventListener('visibilitychange', onVisible)
            window.clearInterval(timer)
        }
    }, [key])

    return { status, counts }
}
