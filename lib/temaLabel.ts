export const TEMA_TIPOS = ['NUMERADO', 'ESPECIAL', 'CAMPANHA'] as const
export type TemaTipo = (typeof TEMA_TIPOS)[number]

export type TemaIdentidade = {
    numero?: number | null
    tipo?: string | null
    titulo?: string | null
    ano?: number | null
}

const TIPO_ORDEM: Record<TemaTipo, number> = {
    NUMERADO: 0,
    ESPECIAL: 1,
    CAMPANHA: 2,
}

export function temaTipo(tema?: TemaIdentidade | null): TemaTipo {
    if (tema?.tipo === 'ESPECIAL' || tema?.tipo === 'CAMPANHA') return tema.tipo
    return 'NUMERADO'
}

export function isTemaEspecial(tema?: TemaIdentidade | null): boolean {
    const tipo = temaTipo(tema)
    return tipo === 'ESPECIAL' || tipo === 'CAMPANHA'
}

export function temaCodigo(tema?: TemaIdentidade | null): string {
    const tipo = temaTipo(tema)
    const ano = tema?.ano != null ? ` ${tema.ano}` : ''
    if (tipo === 'ESPECIAL') return `Especial${ano}`
    if (tipo === 'CAMPANHA') return `Campanha${ano}`
    if (tema?.numero != null) return `#${tema.numero}`
    return ''
}

export function temaLinha(tema?: TemaIdentidade | null): string {
    const codigo = temaCodigo(tema)
    const titulo = tema?.titulo?.trim() || ''
    if (codigo && titulo) return `${codigo} — ${titulo}`
    return codigo || titulo
}

export function temaBadgeTexto(tema?: TemaIdentidade | null): string {
    const tipo = temaTipo(tema)
    const ano = tema?.ano != null ? String(tema.ano) : ''
    if (tipo === 'ESPECIAL') return ano ? `Esp. ${ano}` : 'Esp.'
    if (tipo === 'CAMPANHA') return ano ? `Camp. ${ano}` : 'Camp.'
    if (tema?.numero != null) return String(tema.numero)
    return '—'
}

export function temaCodigoClass(tema?: TemaIdentidade | null): string {
    const tipo = temaTipo(tema)
    if (tipo === 'ESPECIAL') return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300'
    if (tipo === 'CAMPANHA') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
}

export function matchesTemaSearch(tema: TemaIdentidade, term: string): boolean {
    const q = term.toLowerCase().trim()
    if (!q) return true
    if (tema.numero != null && String(tema.numero).includes(q)) return true
    if (tema.ano != null && String(tema.ano).includes(q)) return true
    if (tema.titulo?.toLowerCase().includes(q)) return true
    if (temaCodigo(tema).toLowerCase().includes(q)) return true
    if (temaBadgeTexto(tema).toLowerCase().includes(q)) return true
    return false
}

export function compareTemas(a: TemaIdentidade, b: TemaIdentidade): number {
    const ta = temaTipo(a)
    const tb = temaTipo(b)
    if (ta !== tb) return TIPO_ORDEM[ta] - TIPO_ORDEM[tb]
    if (ta === 'NUMERADO') return (a.numero ?? 0) - (b.numero ?? 0)
    if ((a.ano ?? 0) !== (b.ano ?? 0)) return (b.ano ?? 0) - (a.ano ?? 0)
    return (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR')
}
