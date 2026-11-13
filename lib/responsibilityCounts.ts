import { supabase } from '@/lib/supabaseClient'
import { addCalendarDays, isValidCivilDate, civilWeekdayIndex } from './civilDate'
import { parteExigeAjudante, parteTipoNome } from './parteAjudante'
import { supportRoleIdsForDate } from './supportRoles'

export type MidweekCount = { scheduled: number; complete: number }

export type ResponsibilityCounts = {
    midweek: MidweekCount | null
    talks: number | null
    support: number | null
    cleaning: number | null
    field: number | null
}

export type CountSource = 'midweek' | 'talks' | 'support' | 'cleaning' | 'field'

const COUNTED_HREFS: Record<string, CountSource> = {
    '/programacao': 'midweek',
    '/admin/discursos': 'talks',
    '/admin/escalas': 'support',
    '/admin/limpeza': 'cleaning',
    '/admin/campo': 'field',
}

export function countSourceForHref(href: string): CountSource | null {
    return COUNTED_HREFS[href] ?? null
}

export function countSourcesForHrefs(hrefs: string[]): CountSource[] {
    const sources = hrefs
        .map(href => COUNTED_HREFS[href])
        .filter((source): source is CountSource => Boolean(source))
    return [...new Set(sources)]
}

type PageResult<T> = {
    data: T[] | null
    error: unknown
    count: number | null
}

export async function fetchAllPages<T>(
    load: (from: number, to: number) => Promise<PageResult<T>>,
    pageSize = 500,
): Promise<T[] | null> {
    const rows: T[] = []
    let offset = 0
    let previousMarker: string | null = null

    for (;;) {
        let page: PageResult<T>
        try {
            page = await load(offset, offset + pageSize - 1)
        } catch {
            return null
        }
        if (page.error) return null
        if (!Number.isFinite(page.count)) return null

        const total = page.count as number
        const data = Array.isArray(page.data) ? page.data : null
        if (!data) return null
        if (data.length === 0) {
            if (offset < total) return null
            return rows
        }

        const marker = JSON.stringify(data[0])
        if (marker === previousMarker) return null
        previousMarker = marker

        rows.push(...data)
        const nextOffset = offset + data.length
        if (nextOffset <= offset) return null
        offset = nextOffset
        if (offset >= total) return rows
    }
}

type ProgramRow = {
    id: string
    data_reuniao: string
    evento_tipo: string
    presidente_id: string | null
    presidente_status: string | null
    oracao_inicial_id: string | null
    oracao_inicial_status: string | null
    oracao_final_id: string | null
    oracao_final_status: string | null
    partes: unknown
}

type TalkRow = {
    id: string
    data: string
    orador_local_id: string | null
    orador_visitante_id: string | null
}

type SupportRow = {
    id: string
    data: string
    funcao: string
    membro_id: string | null
}

type CleaningRow = {
    id: string
    data_inicio: string
    grupo_id: string | null
}

type FieldRow = {
    id: string
    data: string
    dirigente_id: string | null
}

function filledId(value: unknown): boolean {
    return typeof value === 'string' && value.trim() !== ''
}

function slotCovered(id: unknown, status: unknown): boolean {
    return filledId(id) && status !== 'declined'
}

function programPartsComplete(partes: unknown): boolean {
    if (!Array.isArray(partes) || partes.length === 0) return false
    for (const parte of partes) {
        const campos = parteTipoNome(parte)
        if (!campos) return false
        const registro = parte as { membro_id?: unknown; status?: unknown; ajudante_id?: unknown; ajudante_status?: unknown }
        if (!slotCovered(registro.membro_id, registro.status)) return false
        if (parteExigeAjudante(parte) && !slotCovered(registro.ajudante_id, registro.ajudante_status)) return false
    }
    return true
}

function programComplete(row: ProgramRow): boolean {
    if (row.evento_tipo !== 'normal' && row.evento_tipo !== 'visita spte') return false
    if (!slotCovered(row.presidente_id, row.presidente_status)) return false
    if (!slotCovered(row.oracao_inicial_id, row.oracao_inicial_status)) return false
    if (!slotCovered(row.oracao_final_id, row.oracao_final_status)) return false
    return programPartsComplete(row.partes)
}

export function aggregateMidweek(rows: ProgramRow[]): MidweekCount | null {
    for (const row of rows) {
        if (!isValidCivilDate(row.data_reuniao)) return null
    }
    const byDate = new Map<string, ProgramRow[]>()
    for (const row of rows) {
        const list = byDate.get(row.data_reuniao) ?? []
        list.push(row)
        byDate.set(row.data_reuniao, list)
    }
    let complete = 0
    for (const group of byDate.values()) {
        if (group.every(programComplete)) complete += 1
    }
    return { scheduled: byDate.size, complete }
}

export function aggregateTalks(rows: TalkRow[]): number | null {
    const dates = new Set<string>()
    for (const row of rows) {
        if (!isValidCivilDate(row.data)) return null
        if (filledId(row.orador_local_id) || filledId(row.orador_visitante_id)) dates.add(row.data)
    }
    return dates.size
}

export function aggregateSupport(rows: SupportRow[]): number | null {
    const byDate = new Map<string, SupportRow[]>()
    for (const row of rows) {
        if (!isValidCivilDate(row.data)) return null
        const list = byDate.get(row.data) ?? []
        list.push(row)
        byDate.set(row.data, list)
    }
    let covered = 0
    for (const [data, list] of byDate) {
        const required = supportRoleIdsForDate(data)
        const filled = required.every(role => list.some(row => row.funcao === role && filledId(row.membro_id)))
        if (filled) covered += 1
    }
    return covered
}

export function aggregateField(rows: FieldRow[]): number | null {
    const dates = new Set<string>()
    for (const row of rows) {
        if (!isValidCivilDate(row.data)) return null
        if (filledId(row.dirigente_id)) dates.add(row.data)
    }
    return dates.size
}

export function aggregateCleaning(rows: CleaningRow[], hoje: string): number | null {
    if (!isValidCivilDate(hoje)) return null
    const covered = new Set<string>()
    const warned = new Set<string>()
    for (const row of rows) {
        if (!isValidCivilDate(row.data_inicio)) return null
        if (civilWeekdayIndex(row.data_inicio) !== 0) {
            if (!warned.has(row.data_inicio)) {
                warned.add(row.data_inicio)
                console.warn('[responsibilityCounts] data_inicio fora de segunda:', row.data_inicio)
            }
            continue
        }
        if (!filledId(row.grupo_id)) continue
        const wednesday = addCalendarDays(row.data_inicio, 2)
        const saturday = addCalendarDays(row.data_inicio, 5)
        if (wednesday >= hoje || saturday >= hoje) covered.add(row.data_inicio)
    }
    return covered.size
}

async function loadPaged<T>(
    run: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[] | null> {
    return fetchAllPages((from, to) => Promise.resolve(run(from, to)))
}

export async function loadResponsibilityCounts(hoje: string, sources: CountSource[]): Promise<ResponsibilityCounts> {
    const wanted = new Set(sources)
    const empty: ResponsibilityCounts = { midweek: null, talks: null, support: null, cleaning: null, field: null }

    const [midweek, talks, support, cleaning, field] = await Promise.all([
        wanted.has('midweek') ? loadPaged<ProgramRow>((from, to) => supabase
            .from('programacao_semanal')
            .select('id, data_reuniao, evento_tipo, presidente_id, presidente_status, oracao_inicial_id, oracao_inicial_status, oracao_final_id, oracao_final_status, partes', { count: 'exact' })
            .gte('data_reuniao', hoje)
            .order('data_reuniao', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to))
            .then(rows => rows ? aggregateMidweek(rows) : null)
            .catch(() => null) : Promise.resolve(null),
        wanted.has('talks') ? loadPaged<TalkRow>((from, to) => supabase
            .from('agenda_discursos_locais')
            .select('id, data, orador_local_id, orador_visitante_id', { count: 'exact' })
            .gte('data', hoje)
            .order('data', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to))
            .then(rows => rows ? aggregateTalks(rows) : null)
            .catch(() => null) : Promise.resolve(null),
        wanted.has('support') ? loadPaged<SupportRow>((from, to) => supabase
            .from('designacoes_suporte')
            .select('id, data, funcao, membro_id', { count: 'exact' })
            .gte('data', hoje)
            .order('data', { ascending: true })
            .order('funcao', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to))
            .then(rows => rows ? aggregateSupport(rows) : null)
            .catch(() => null) : Promise.resolve(null),
        wanted.has('cleaning') ? loadPaged<CleaningRow>((from, to) => supabase
            .from('escala_limpeza')
            .select('id, data_inicio, grupo_id', { count: 'exact' })
            .gte('data_inicio', addCalendarDays(hoje, -5))
            .order('data_inicio', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to))
            .then(rows => rows ? aggregateCleaning(rows, hoje) : null)
            .catch(() => null) : Promise.resolve(null),
        wanted.has('field') ? loadPaged<FieldRow>((from, to) => supabase
            .from('escalas_campo')
            .select('id, data, dirigente_id', { count: 'exact' })
            .gte('data', hoje)
            .order('data', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to))
            .then(rows => rows ? aggregateField(rows) : null)
            .catch(() => null) : Promise.resolve(null),
    ])

    return {
        midweek: wanted.has('midweek') ? midweek : empty.midweek,
        talks: wanted.has('talks') ? talks : empty.talks,
        support: wanted.has('support') ? support : empty.support,
        cleaning: wanted.has('cleaning') ? cleaning : empty.cleaning,
        field: wanted.has('field') ? field : empty.field,
    }
}
