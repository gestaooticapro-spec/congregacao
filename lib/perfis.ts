import type { PerfilAcesso } from '@/types/database.types'

export const PERFIL_LABELS: Record<PerfilAcesso, string> = {
    ADMIN: 'Admin',
    COORDENADOR: 'Coordenador',
    SECRETARIO: 'Secretário',
    SUPERINTENDENTE_SERVICO: 'SS',
    RESP_QUINTA: 'Resp. Reunião Meio de Semana',
    RESP_SABADO: 'Resp. Discursos',
    RQA: 'Resp. Quadro de Anúncios',
    RT: 'Resp. Territórios',
    IRMAO: 'Irmão',
}

export function getPerfilLabel(perfil: PerfilAcesso): string {
    return PERFIL_LABELS[perfil]
}
