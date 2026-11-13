import { parteExigeAjudante } from './parteAjudante'

/** String vazia ou só espaços conta como ID ausente. */
export function assignmentId(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
}

/**
 * Grava o ID novo. Se ele mudou e continua preenchido, o status dessa vaga volta para pending.
 * Remover o ID não mexe no status. O outro campo do objeto permanece como estava.
 */
export function roleStatusPatch(
    nextRaw: unknown,
    previousRaw: unknown,
    idKey: string,
    statusKey: string,
): Record<string, string | null> {
    const next = assignmentId(nextRaw)
    const previous = assignmentId(previousRaw)
    const patch: Record<string, string | null> = { [idKey]: next }
    if (next && next !== previous) patch[statusKey] = 'pending'
    return patch
}

export function preparePartesForSave(edited: unknown[], original: unknown): Record<string, unknown>[] {
    const previousParts = Array.isArray(original) ? original : []
    return edited.map((raw, index) => {
        const part = raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {}
        const before = previousParts[index] && typeof previousParts[index] === 'object'
            ? previousParts[index] as Record<string, unknown>
            : {}

        const nextMembro = assignmentId(part.membro_id)
        const previousMembro = assignmentId(before.membro_id)
        if (nextMembro && nextMembro !== previousMembro) part.status = 'pending'
        part.membro_id = nextMembro

        const nextAjudante = parteExigeAjudante(part) ? assignmentId(part.ajudante_id) : null
        const previousAjudante = assignmentId(before.ajudante_id)
        if (nextAjudante && nextAjudante !== previousAjudante) part.ajudante_status = 'pending'
        part.ajudante_id = nextAjudante
        return part
    })
}
