const TIPOS_PARTE = new Set(['TESOUROS', 'MINISTERIO', 'VIDA_CRISTA', 'PRESIDENTE', 'ORACAO'])

export function parteTipoNome(parte: unknown): { tipo: string; nome: string } | null {
    if (!parte || typeof parte !== 'object') return null
    const tipo = (parte as { tipo?: unknown }).tipo
    const nome = (parte as { nome?: unknown }).nome
    if (typeof tipo !== 'string' || typeof nome !== 'string') return null
    if (!TIPOS_PARTE.has(tipo)) return null
    return { tipo, nome }
}

/**
 * Ajudante só existe na demonstração de duas pessoas em Faça Seu Melhor no Ministério.
 * Discurso e consideração feita por um irmão ou uma irmã não têm ajudante.
 * O leitor do estudo bíblico de congregação continua em ajudante_id.
 * O acento de "estudo bíblico" importa. Tipo ou nome inválidos devolvem false.
 */
export function parteExigeAjudante(parte: unknown): boolean {
    const campos = parteTipoNome(parte)
    if (!campos) return false
    if (campos.tipo === 'VIDA_CRISTA') return campos.nome.toLowerCase().includes('estudo bíblico')
    if (campos.tipo !== 'MINISTERIO') return false
    return !parteIndividual(campos.nome)
}

function parteIndividual(nome: string): boolean {
    const titulo = nome.replace(/^\d+\.\s*/, '')
    if (/^discurso\b/i.test(titulo)) return true
    return /\)\s*consideração\b/i.test(nome)
}
