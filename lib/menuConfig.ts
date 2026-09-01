import {
    BookOpen,
    Briefcase,
    Calendar,
    ClipboardList,
    Eraser,
    FileText,
    HeartHandshake,
    LibraryBig,
    Map as MapIcon,
    Mic,
    Settings,
    Shield,
    ShieldCheck,
    SlidersHorizontal,
    UserCheck,
    Users,
    UsersRound,
    Building2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { PerfilAcesso } from '@/types/database.types'

/**
 * Fonte unica de verdade dos agrupamentos do menu.
 *
 * Este arquivo e compartilhado entre:
 * - `components/Sidebar.tsx` (renderiza apenas o botao do grupo)
 * - `components/MenuHub.tsx` (renderiza a grade de tiles do grupo)
 *
 * Os `href` continuam apontando para as mesmas paginas de sempre.
 * Este refactor muda apenas o CAMINHO para chegar ate elas.
 */

export type MenuLink = {
    label: string
    href: string
    icon: LucideIcon
    /** Itens restritos exigem sessao ativa para aparecer. */
    restricted: boolean
    /** Quando informado, o item so aparece para esses perfis. */
    allowedRoles?: PerfilAcesso[]
    /** Card visivel que ainda nao abre uma pagina. */
    placeholder?: boolean
    /** Quando informado, o hub desenha uma linha entre secoes diferentes. */
    section?: number
    /** So aparece para superintendente de grupo ou ajudante. */
    requiresPastoreio?: boolean
}

export type MenuGroupId = 'anciaos' | 'responsabilidades' | 'administracao'

export type MenuGroup = {
    id: MenuGroupId
    label: string
    /** Rota da pagina intermediaria (hub) que lista os itens do grupo. */
    href: string
    icon: LucideIcon
    description: string
    items: MenuLink[]
}

export type MenuVisibilityContext = {
    user: User | null
    roles: PerfilAcesso[]
    loading: boolean
    hasRole: (requiredRoles: PerfilAcesso[]) => boolean
    canAccessPastoreio?: boolean
}

/** Admin do sistema e Coordenador: mesma visao de menu. */
const PERFIS_ADMIN: PerfilAcesso[] = ['ADMIN', 'COORDENADOR']

/** Perfis que enxergam a maior parte dos itens do grupo "Anciaos". */
const PERFIS_ANCIAOS: PerfilAcesso[] = [
    ...PERFIS_ADMIN,
    'SECRETARIO',
    'SUPERINTENDENTE_SERVICO',
    'RESP_QUINTA',
    'RESP_SABADO',
    'RQA',
    'RT',
    'IRMAO',
]

/** Perfis que enxergavam o antigo separador "Administracao" da Sidebar. */
export const PERFIS_ADMINISTRACAO: PerfilAcesso[] = [
    ...PERFIS_ADMIN,
    'SECRETARIO',
    'SUPERINTENDENTE_SERVICO',
    'RESP_QUINTA',
    'RESP_SABADO',
    'RQA',
    'RT',
]

/**
 * Replica exatamente a regra de visibilidade que a Sidebar ja aplicava
 * antes do refactor, para que nenhum item mude de comportamento.
 */
export function isMenuLinkVisible(item: MenuLink, ctx: MenuVisibilityContext): boolean {
    if (!item.restricted) return true
    if (ctx.loading && ctx.roles.length === 0) return false
    if (!ctx.user) return false
    if (item.allowedRoles && !ctx.hasRole(item.allowedRoles)) return false
    if (item.requiresPastoreio && !ctx.canAccessPastoreio) return false
    return true
}

export function getVisibleMenuLinks(group: MenuGroup, ctx: MenuVisibilityContext): MenuLink[] {
    return group.items.filter(item => isMenuLinkVisible(item, ctx))
}

export function getVisibleMenuSections(group: MenuGroup, ctx: MenuVisibilityContext): MenuLink[][] {
    const items = getVisibleMenuLinks(group, ctx)
    if (items.length === 0) return []
    if (items.every(item => item.section == null)) return [items]

    const sections = new Map<number, MenuLink[]>()
    for (const item of items) {
        const key = item.section ?? 0
        const list = sections.get(key) ?? []
        list.push(item)
        sections.set(key, list)
    }

    return [...sections.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, list]) => list)
}

/** Ex-secacao "Area Comum" da Sidebar. */
export const ANCIAOS_GROUP: MenuGroup = {
    id: 'anciaos',
    label: 'Anciãos',
    href: '/anciaos',
    icon: Shield,
    description: 'Ferramentas do corpo de anciãos da congregação.',
    items: [
        { label: 'Agenda e Lembretes', href: '/admin/agenda', icon: Calendar, restricted: true, allowedRoles: [...PERFIS_ANCIAOS], section: 1 },
        { label: 'Pauta de Reunião', href: '/admin/pauta-anciaos', icon: ClipboardList, restricted: true, allowedRoles: [...PERFIS_ANCIAOS], section: 1 },
        { label: 'Membros', href: '/admin/membros', icon: UsersRound, restricted: true, section: 1 },
        { label: 'Meu Grupo', href: '/admin/relatorios-grupo', icon: Users, restricted: true, allowedRoles: [...PERFIS_ANCIAOS], section: 2 },
        { label: 'Pastoreio', href: '/admin/pastoreio', icon: HeartHandshake, restricted: true, requiresPastoreio: true, section: 2 },
        { label: 'Meus Temas', href: '/admin/meus-temas', icon: Mic, restricted: true, section: 2 },
    ],
}

/** Ex-secacao "Administracao" da Sidebar (inclui os itens que ficavam no final dela). */
export const RESPONSABILIDADES_GROUP: MenuGroup = {
    id: 'responsabilidades',
    label: 'Responsabilidades',
    href: '/responsabilidades',
    icon: Briefcase,
    description: 'Encargos e designações de serviço da congregação.',
    items: [
        { label: 'Visita do Supte.', href: '/admin/visita', icon: ClipboardList, restricted: true, allowedRoles: [...PERFIS_ADMIN, 'SUPERINTENDENTE_SERVICO', 'RQA', 'SECRETARIO', 'RESP_QUINTA'] },
        { label: 'Relatórios', href: '/admin/relatorios-secretaria', icon: FileText, restricted: true, allowedRoles: [...PERFIS_ADMIN, 'SECRETARIO'] },
        { label: 'Reunião de Meio de Semana', href: '/programacao', icon: BookOpen, restricted: true, allowedRoles: [...PERFIS_ADMIN, 'RESP_QUINTA'] },
        { label: 'Discursos', href: '/admin/discursos', icon: Mic, restricted: true, allowedRoles: [...PERFIS_ADMIN, 'RESP_SABADO'] },
        { label: 'Designações de Apoio', href: '/admin/escalas', icon: ClipboardList, restricted: true, allowedRoles: [...PERFIS_ADMIN, 'RQA'] },
        { label: 'Campo', href: '/admin/campo', icon: MapIcon, restricted: true, allowedRoles: [...PERFIS_ADMIN, 'RQA'] },
        { label: 'Limpeza', href: '/admin/limpeza', icon: Eraser, restricted: true, allowedRoles: [...PERFIS_ADMIN, 'SUPERINTENDENTE_SERVICO'] },
        { label: 'Cadastros', href: '/admin/cadastros', icon: LibraryBig, restricted: true, allowedRoles: [...PERFIS_ADMIN, 'RESP_SABADO'] },
        { label: 'Grupos', href: '/admin/grupos', icon: Users, restricted: true, allowedRoles: [...PERFIS_ADMIN, 'SUPERINTENDENTE_SERVICO'] },
        { label: 'Gerenciar Territórios', href: '/admin/territorios', icon: Settings, restricted: true, allowedRoles: [...PERFIS_ADMIN, 'RT'] },
        { label: 'Permissões', href: '/admin/permissoes', icon: UserCheck, restricted: true, allowedRoles: [...PERFIS_ADMIN] },
    ],
}

export const ADMINISTRACAO_GROUP: MenuGroup = {
    id: 'administracao',
    label: 'Administração',
    href: '/administracao',
    icon: SlidersHorizontal,
    description: 'Acesso e dados da congregação.',
    items: [
        { label: 'Senha e Acesso', href: '/admin/meu-login', icon: ShieldCheck, restricted: true },
        { label: 'Dados da congregação', href: '/administracao/dados', icon: Building2, restricted: true, placeholder: true, allowedRoles: [...PERFIS_ADMINISTRACAO] },
    ],
}

export const MENU_GROUPS: MenuGroup[] = [ANCIAOS_GROUP, RESPONSABILIDADES_GROUP, ADMINISTRACAO_GROUP]

/**
 * Resolve um grupo pelo id dentro do proprio componente client.
 * Isso evita passar objetos com `icon` (funcoes) como props vindas de
 * Server Components, o que o React nao consegue serializar.
 */
export function getMenuGroup(id: MenuGroupId): MenuGroup {
    const group = MENU_GROUPS.find(item => item.id === id)
    if (!group) throw new Error(`Grupo de menu desconhecido: ${id}`)
    return group
}
