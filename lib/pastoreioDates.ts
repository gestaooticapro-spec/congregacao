import { addCalendarDays, addCalendarMonths, isValidCivilDate } from './civilDate'

export { addCalendarDays }

const YMD = /^\d{4}-\d{2}-\d{2}$/

export function isYmd(value: string | null | undefined): value is string {
    return typeof value === 'string' && YMD.test(value)
}

/**
 * Visita atrasada: proxima <= hoje - 2 dias, e ultima não cobre essa data.
 * Comparação de string, válida só para yyyy-MM-dd.
 */
export function isVisitaAtrasada(
    proxima: string | null,
    ultima: string | null,
    hoje: string,
): boolean {
    if (!isYmd(proxima) || !isYmd(hoje)) return false
    const limite = addCalendarDays(hoje, -2)
    if (proxima > limite) return false
    if (!isYmd(ultima)) return true
    return ultima < proxima
}

export type SituacaoVisita = 'marcada' | 'recente' | 'seisMeses' | 'umAno'

/**
 * Azul quando há data marcada. Sem ela, verde até 6 meses, amarelo depois disso
 * e vermelho se a última visita tem mais de 1 ano ou não existe.
 * O dia exato do limite permanece na faixa mais recente.
 */
export function situacaoVisita(
    ultima: string | null,
    proxima: string | null,
    hoje: string,
): SituacaoVisita {
    if (isValidCivilDate(proxima)) return 'marcada'
    if (!isValidCivilDate(hoje) || !isValidCivilDate(ultima)) return 'umAno'
    const limiteAno = addCalendarMonths(hoje, -12)
    const limiteSemestre = addCalendarMonths(hoje, -6)
    if (!limiteAno || !limiteSemestre) return 'umAno'
    if (ultima < limiteAno) return 'umAno'
    if (ultima < limiteSemestre) return 'seisMeses'
    return 'recente'
}
