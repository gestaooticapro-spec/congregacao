const YMD = /^\d{4}-\d{2}-\d{2}$/

/**
 * Soma dias civis. O UTC aqui é só aritmética, sem fuso.
 * Não valida o calendário: uma data impossível continua rolando, como antes.
 */
export function addCalendarDays(ymd: string, days: number): string {
    const [year, month, day] = ymd.split('-').map(Number)
    const utc = new Date(Date.UTC(year, month - 1, day + days))
    const y = utc.getUTCFullYear()
    const m = String(utc.getUTCMonth() + 1).padStart(2, '0')
    const d = String(utc.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

/** Formato YYYY-MM-DD e existência real no calendário. 2026-02-31 falha; 2024-02-29 passa. */
export function isValidCivilDate(value: string | null | undefined): value is string {
    if (typeof value !== 'string' || !YMD.test(value)) return false
    const [year, month, day] = value.split('-').map(Number)
    const utc = new Date(Date.UTC(year, month - 1, day))
    return utc.getUTCFullYear() === year
        && utc.getUTCMonth() === month - 1
        && utc.getUTCDate() === day
}

/**
 * Segunda = 0, sábado = 5, domingo = 6.
 * Não são os números de Date.getDay(). Data inválida devolve null, sem normalizar.
 */
export function civilWeekdayIndex(ymd: string): number | null {
    if (!isValidCivilDate(ymd)) return null
    const [year, month, day] = ymd.split('-').map(Number)
    const utc = new Date(Date.UTC(year, month - 1, day))
    return (utc.getUTCDay() + 6) % 7
}

/** Segunda-feira da semana civil de ymd. Rejeita data inválida. */
export function startOfCivilWeek(ymd: string): string | null {
    const index = civilWeekdayIndex(ymd)
    if (index === null) return null
    return addCalendarDays(ymd, -index)
}

/**
 * Soma meses civis. O dia que não existe no mês de destino vai para o último dia desse mês.
 * Data inválida devolve null, sem normalizar.
 */
export function addCalendarMonths(ymd: string, months: number): string | null {
    if (!isValidCivilDate(ymd) || !Number.isInteger(months)) return null
    const [year, month, day] = ymd.split('-').map(Number)
    const shifted = year * 12 + (month - 1) + months
    const targetYear = Math.floor(shifted / 12)
    const targetMonthIndex = shifted - targetYear * 12
    const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate()
    const targetDay = Math.min(day, lastDay)
    const targetMonth = String(targetMonthIndex + 1).padStart(2, '0')
    const targetDayText = String(targetDay).padStart(2, '0')
    return `${targetYear}-${targetMonth}-${targetDayText}`
}

/** Sábado ou domingo no índice civil (5 ou 6). Data vazia ou inválida não é fim de semana. */
export function isCivilWeekend(ymd: string): boolean {
    const index = civilWeekdayIndex(ymd)
    return index === 5 || index === 6
}
