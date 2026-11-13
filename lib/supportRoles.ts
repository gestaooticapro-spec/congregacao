import { isCivilWeekend } from './civilDate'

export const SUPPORT_ROLES = [
    { id: 'PRESIDENTE', label: 'Presidente', required: 'is_presidente' },
    { id: 'SOM', label: 'Som', required: 'is_som' },
    { id: 'MICROFONE_1', label: 'Microfone 1', required: 'is_microfone' },
    { id: 'MICROFONE_2', label: 'Microfone 2', required: 'is_microfone' },
    { id: 'INDICADOR_ENTRADA', label: 'Indicador Entrada', required: 'is_indicador' },
    { id: 'INDICADOR_AUDITORIO', label: 'Indicador Auditório', required: 'is_indicador' },
    { id: 'LEITOR_SENTINELA', label: 'Leitor da Sentinela', required: 'is_leitor_sentinela' },
] as const

export type SupportRoleId = (typeof SUPPORT_ROLES)[number]['id']

const WEEKDAY_ROLE_IDS = ['SOM', 'MICROFONE_1', 'MICROFONE_2', 'INDICADOR_ENTRADA', 'INDICADOR_AUDITORIO'] as const

/** Papéis que o editor pede nessa data. Sábado e domingo incluem presidente e leitor. VIDEO não entra. */
export function supportRoleIdsForDate(ymd: string): readonly SupportRoleId[] {
    if (!isCivilWeekend(ymd)) return WEEKDAY_ROLE_IDS
    return SUPPORT_ROLES.map(role => role.id)
}
