import { supabase } from '@/lib/supabaseClient'
import { isValidCivilDate } from './civilDate'
import { situacaoVisita } from './pastoreioDates'
import { fetchAllPages } from './responsibilityCounts'

export type ElderSource = 'agenda' | 'pauta' | 'members' | 'group' | 'shepherding' | 'talks'

export type AgendaCount = { congregation: number; elders: number }

export type ElderCounts = {
    agenda: AgendaCount | null
    pauta: number | null
    members: number | null
    group: number | null
    shepherding: number | null
    talks: number | null
}

const COUNTED_HREFS: Record<string, ElderSource> = {
    '/admin/agenda': 'agenda',
    '/admin/pauta-anciaos': 'pauta',
    '/admin/membros': 'members',
    '/admin/relatorios-grupo': 'group',
    '/admin/pastoreio': 'shepherding',
    '/admin/meus-discursos': 'talks',
}

const PERSONAL: ElderSource[] = ['group', 'shepherding', 'talks']

export function elderSourceForHref(href: string): ElderSource | null {
    return COUNTED_HREFS[href] ?? null
}

export function elderSourcesForHrefs(hrefs: string[]): ElderSource[] {
    const sources = hrefs
        .map(href => COUNTED_HREFS[href])
        .filter((source): source is ElderSource => Boolean(source))
    return [...new Set(sources)]
}

export function elderSourceNeedsUser(source: ElderSource): boolean {
    return PERSONAL.includes(source)
}

function quantidade(valor: number, um: string, varios: string): string {
    return `${valor} ${valor === 1 ? um : varios}`
}

export function textoDoSeloAnciao(
    source: ElderSource,
    counts: ElderCounts,
): { visivel: string; explicacao: string } | null {
    if (source === 'agenda') {
        if (!counts.agenda) return null
        const { congregation, elders } = counts.agenda
        return {
            visivel: `${congregation}/${elders}`,
            explicacao: `${quantidade(congregation, 'evento futuro da congregação', 'eventos futuros da congregação')}; ${quantidade(elders, 'evento futuro dos anciãos', 'eventos futuros dos anciãos')}`,
        }
    }
    const valor = counts[source]
    if (valor === null) return null
    if (source === 'pauta') {
        return { visivel: String(valor), explicacao: quantidade(valor, 'assunto que ainda não entrou na pauta', 'assuntos que ainda não entraram na pauta') }
    }
    if (source === 'members') {
        return { visivel: String(valor), explicacao: quantidade(valor, 'membro ativo', 'membros ativos') }
    }
    if (source === 'group') {
        return { visivel: String(valor), explicacao: quantidade(valor, 'membro ativo no grupo', 'membros ativos no grupo') }
    }
    if (source === 'shepherding') {
        return { visivel: String(valor), explicacao: quantidade(valor, 'irmão que não é ancião, há mais de 1 ano sem visita ou nunca visitado, e sem data marcada', 'irmãos que não são anciãos, há mais de 1 ano sem visita ou nunca visitados, e sem data marcada') }
    }
    return { visivel: String(valor), explicacao: quantidade(valor, 'discurso futuro, na congregação ou fora', 'discursos futuros, na congregação ou fora') }
}

type CountResult = { count: number | null; error: unknown }

async function countExact(query: PromiseLike<CountResult>): Promise<number | null> {
    try {
        const { count, error } = await query
        if (error || !Number.isFinite(count)) return null
        return count as number
    } catch {
        return null
    }
}

export function countShepherdingGap(
    rows: { ultima_visita: string | null; proxima_visita: string | null }[],
    hoje: string,
): number | null {
    if (!isValidCivilDate(hoje)) return null
    return rows.filter(row => situacaoVisita(row.ultima_visita, row.proxima_visita, hoje) === 'umAno').length
}

type LoggedMember = { id: string; grupoId: string | null }

async function loggedMember(userId: string): Promise<LoggedMember | null> {
    const { data, error } = await supabase
        .from('membros')
        .select('id, grupo_id')
        .eq('user_id', userId)
        .maybeSingle()
    if (error || !data) return null
    return { id: data.id, grupoId: data.grupo_id }
}

async function pastoreioGroupId(member: LoggedMember): Promise<string | null | undefined> {
    if (member.grupoId) return member.grupoId
    const { data, error } = await supabase
        .from('grupos_servico')
        .select('id')
        .or(`superintendente_id.eq.${member.id},ajudante_id.eq.${member.id}`)
        .maybeSingle()
    if (error) return undefined
    return data?.id ?? null
}

export async function loadElderCounts(
    hoje: string,
    userId: string | null,
    sources: ElderSource[],
): Promise<ElderCounts> {
    const wanted = new Set(sources)
    const empty: ElderCounts = {
        agenda: null,
        pauta: null,
        members: null,
        group: null,
        shepherding: null,
        talks: null,
    }
    if (!isValidCivilDate(hoje)) return empty

    const needsPerson = sources.some(elderSourceNeedsUser)
    const member = needsPerson && userId ? await loggedMember(userId) : null

    const pauta = (supabase as unknown as {
        from: (table: 'pauta_anciaos') => {
            select: (columns: string, options: { count: 'exact'; head: true }) => {
                eq: (column: string, value: boolean) => {
                    eq: (column: string, value: boolean) => PromiseLike<CountResult>
                }
            }
        }
    }).from('pauta_anciaos')

    const [agendaCongregation, agendaElders, pautaCount, members, group, shepherding, localTalks, awayTalks] = await Promise.all([
        wanted.has('agenda') ? countExact(supabase
            .from('eventos')
            .select('id', { count: 'exact', head: true })
            .gte('data_fim', hoje)) : Promise.resolve(null),
        wanted.has('agenda') ? countExact(supabase
            .from('agenda_anciaos')
            .select('id', { count: 'exact', head: true })
            .or(`data_fim.gte.${hoje},and(data_fim.is.null,data_inicio.gte.${hoje})`)) : Promise.resolve(null),
        wanted.has('pauta') ? countExact(pauta
            .select('id', { count: 'exact', head: true })
            .eq('na_pauta', false)
            .eq('arquivado', false)) : Promise.resolve(null),
        wanted.has('members') ? countExact(supabase
            .from('membros')
            .select('id', { count: 'exact', head: true })
            .eq('ativo', true)) : Promise.resolve(null),
        wanted.has('group') && member?.grupoId ? countExact(supabase
            .from('membros')
            .select('id', { count: 'exact', head: true })
            .eq('grupo_id', member.grupoId)
            .eq('ativo', true)) : Promise.resolve(wanted.has('group') && member ? 0 : null),
        wanted.has('shepherding') && member ? pastoreioGroupId(member).then(async grupoId => {
            if (grupoId === undefined) return null
            if (!grupoId) return 0
            const rows = await fetchAllPages<{ id: string; ultima_visita: string | null; proxima_visita: string | null }>((from, to) => Promise.resolve(
                supabase
                    .from('membros')
                    .select('id, ultima_visita, proxima_visita', { count: 'exact' })
                    .eq('grupo_id', grupoId)
                    .eq('ativo', true)
                    .eq('is_anciao', false)
                    .neq('id', member.id)
                    .order('id', { ascending: true })
                    .range(from, to),
            ))
            return rows ? countShepherdingGap(rows, hoje) : null
        }).catch(() => null) : Promise.resolve(null),
        wanted.has('talks') && member ? countExact(supabase
            .from('agenda_discursos_locais')
            .select('id', { count: 'exact', head: true })
            .eq('orador_local_id', member.id)
            .gte('data', hoje)) : Promise.resolve(null),
        wanted.has('talks') && member ? countExact(supabase
            .from('agenda_discursos_fora')
            .select('id', { count: 'exact', head: true })
            .eq('orador_id', member.id)
            .gte('data', hoje)) : Promise.resolve(null),
    ])

    const agenda = wanted.has('agenda') && agendaCongregation !== null && agendaElders !== null
        ? { congregation: agendaCongregation, elders: agendaElders }
        : null
    const talks = wanted.has('talks') && localTalks !== null && awayTalks !== null
        ? localTalks + awayTalks
        : null

    return {
        agenda: wanted.has('agenda') ? agenda : empty.agenda,
        pauta: wanted.has('pauta') ? pautaCount : empty.pauta,
        members: wanted.has('members') ? members : empty.members,
        group: wanted.has('group') ? group : empty.group,
        shepherding: wanted.has('shepherding') ? shepherding : empty.shepherding,
        talks: wanted.has('talks') ? talks : empty.talks,
    }
}
