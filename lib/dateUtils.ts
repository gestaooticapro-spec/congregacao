/** Fuso usado pelas regras de agenda e datas civis da congregação. */
export const CONGREGATION_TIME_ZONE = 'America/Sao_Paulo'

/**
 * Retorna YYYY-MM-DD no fuso da congregação. Nunca use `toISOString()` para
 * uma data de agenda: ele converte o instante para UTC e pode trocar o dia.
 */
export function getCongregationDate(value: Date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: CONGREGATION_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(value)

    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value
    return `${get('year')}-${get('month')}-${get('day')}`
}
