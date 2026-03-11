import { format, addMinutes, parseISO, setHours, setMinutes } from 'date-fns'

interface Parte {
    tipo: 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA' | 'PRESIDENTE' | 'ORACAO'
    nome: string
    tempo: number
    membro_id?: string
    ajudante_id?: string
}

export function calculatePartTimes(partes: Parte[], dateString: string): (Parte & { startTime: string })[] {
    if (!partes || partes.length === 0) return []

    // Ensure we parse the base date to start the meeting time
    let currentTime = setMinutes(setHours(new Date(dateString + 'T00:00:00'), 19), 37) // Start at 19:37

    const result: (Parte & { startTime: string })[] = []

    let previousTipo: string | null = null

    // We process only the main sections
    const mainParts = partes.filter(p => p.tipo === 'TESOUROS' || p.tipo === 'MINISTERIO' || p.tipo === 'VIDA_CRISTA')

    // Sort to ensure correct flow, especially VIDA_CRISTA
    mainParts.sort((a, b) => {
        const order = { TESOUROS: 1, MINISTERIO: 2, VIDA_CRISTA: 3 }
        const aOrder = order[a.tipo as keyof typeof order] || 99
        const bOrder = order[b.tipo as keyof typeof order] || 99

        if (aOrder !== bOrder) {
            return aOrder - bOrder
        }

        // Within VIDA_CRISTA, Bible Study is last
        if (a.tipo === 'VIDA_CRISTA') {
            const aIsStudy = a.nome.toLowerCase().includes('estudo bíblico')
            const bIsStudy = b.nome.toLowerCase().includes('estudo bíblico')
            if (aIsStudy && !bIsStudy) return 1
            if (!aIsStudy && bIsStudy) return -1
        }
        return 0
    })

    mainParts.forEach((parte) => {
        // Apply Gaps based on transition rules
        if (previousTipo === 'TESOUROS' && parte.tipo === 'MINISTERIO') {
            currentTime = addMinutes(currentTime, 1) // 1 minute gap from Treasures to Ministry
        }

        if (parte.tipo === 'MINISTERIO') {
            if (previousTipo === 'MINISTERIO') {
                currentTime = addMinutes(currentTime, 1) // 1 minute gap between ministry parts
            }
        }

        if (previousTipo === 'MINISTERIO' && parte.tipo === 'VIDA_CRISTA') {
            currentTime = addMinutes(currentTime, 6) // 6 min gap for song before Christian Life
        }

        result.push({
            ...parte,
            startTime: format(currentTime, 'HH:mm')
        })

        // Advance time for the next part
        currentTime = addMinutes(currentTime, parte.tempo || 0)
        previousTipo = parte.tipo
    })

    return result
}
