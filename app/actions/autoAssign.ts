'use server'

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { addDays, parseISO, isSameDay } from 'date-fns'

// Initialize Supabase Admin Client for server actions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']
type Membro = Database['public']['Tables']['membros']['Row']
type Historico = Database['public']['Tables']['historico_designacoes']['Row']

interface AssignmentSuggestion {
    // We return the full updated 'partes' array and the top-level roles.
    partes: any[]
    presidente_id: string | null
    oracao_inicial_id: string | null
    oracao_final_id: string | null
}

export async function generateAutoAssignments(programacaoId: string): Promise<{ success: boolean, data?: AssignmentSuggestion, error?: string }> {
    console.log('generateAutoAssignments called for:', programacaoId)

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials')
        return { success: false, error: 'Configuração de servidor inválida (Supabase Key)' }
    }

    try {
        // 1. Fetch Schedule
        console.log('Fetching schedule...')
        const { data: programacao, error: progError } = await supabase
            .from('programacao_semanal')
            .select('*')
            .eq('id', programacaoId)
            .single()

        if (progError) {
            console.error('Error fetching schedule:', progError)
            throw new Error('Erro ao buscar programação: ' + progError.message)
        }
        if (!programacao) throw new Error('Programação não encontrada')


        // 2. Fetch Active Members
        const { data: membros, error: membError } = await supabase
            .from('membros')
            .select('*')
            .eq('ativo', true)

        if (membError || !membros) throw new Error('Erro ao buscar membros')

        // 3. Fetch History (Last 6 months should be enough for "recent" check, but let's get all to be safe for "longest time")
        const { data: historico, error: histError } = await supabase
            .from('historico_designacoes')
            .select('*')
            .order('data_reuniao', { ascending: false })

        if (histError) throw new Error('Erro ao buscar histórico')

        // Helper to get last assignment date for a specific role/part type
        const getLastAssignmentDate = (membroId: string, partType?: string) => {
            const entry = historico?.find(h =>
                h.membro_id === membroId &&
                (!partType || h.parte_descricao.includes(partType)) // This is a loose check, might need refinement
            )
            return entry ? entry.data_reuniao : '1970-01-01' // Very old date if never assigned
        }

        // Helper to get last assignment date (ANY part)
        const getLastAnyAssignmentDate = (membroId: string) => {
            const entry = historico?.find(h => h.membro_id === membroId)
            return entry ? entry.data_reuniao : '1970-01-01'
        }

        // Set of assigned members for THIS meeting to avoid conflicts
        const assignedMembers = new Set<string>()

        // Helper to pick best candidate
        const pickCandidate = (candidates: Membro[]) => {
            // Filter out already assigned in this meeting
            const availableCandidates = candidates.filter(m => !assignedMembers.has(m.id))

            if (availableCandidates.length === 0) return null

            // Sort by last assignment date (ascending -> oldest first)
            availableCandidates.sort((a, b) => {
                const dateA = getLastAnyAssignmentDate(a.id)
                const dateB = getLastAnyAssignmentDate(b.id)
                return dateA.localeCompare(dateB)
            })

            return availableCandidates[0]
        }

        // Initialize assignments with existing ones (if we want to keep them)
        // For now, let's assume we overwrite EMPTY fields, or maybe overwrite all?
        // The user asked for "fill the names", implying filling empty ones. 
        // But to make it "Auto-Suggest", maybe we should try to fill everything that isn't locked?
        // Let's try to fill EVERYTHING for now, user can edit later.

        let presidenteId = programacao.presidente_id
        let oracaoInicialId = programacao.oracao_inicial_id
        let oracaoFinalId = programacao.oracao_final_id
        let partes = (programacao.partes as any[]) || []

        // If we want to respect existing assignments, add them to assignedMembers
        if (presidenteId) assignedMembers.add(presidenteId)
        if (oracaoInicialId) assignedMembers.add(oracaoInicialId)
        if (oracaoFinalId) assignedMembers.add(oracaoFinalId)
        partes.forEach(p => {
            if (p.membro_id) assignedMembers.add(p.membro_id)
            if (p.ajudante_id) assignedMembers.add(p.ajudante_id)
        })

        // --- Assignments ---

        // 1. Presidente
        if (!presidenteId) {
            const candidates = membros.filter(m => m.is_presidente)
            const selected = pickCandidate(candidates)
            if (selected) {
                presidenteId = selected.id
                assignedMembers.add(selected.id)
            }
        }

        // 2. Oração Inicial
        if (!oracaoInicialId) {
            const candidates = membros.filter(m => m.is_anciao || m.is_servo_ministerial)
            const selected = pickCandidate(candidates)
            if (selected) {
                oracaoInicialId = selected.id
                assignedMembers.add(selected.id)
            }
        }

        // 3. Partes
        const newPartes = partes.map(parte => {
            const newParte = { ...parte }

            // Skip if already assigned
            if (newParte.membro_id) return newParte

            let candidates: Membro[] = []

            if (parte.tipo === 'TESOUROS') {
                if (parte.nome.includes('Leitura da Bíblia')) {
                    candidates = membros.filter(m => m.is_leitor_biblia)
                } else {
                    // Talks/Gems
                    candidates = membros.filter(m => (m.is_anciao || m.is_servo_ministerial) && m.is_parte_vida_ministerio)
                }
            } else if (parte.tipo === 'MINISTERIO') {
                if (parte.nome.includes('Discurso')) {
                    // Talk -> Men only
                    candidates = membros.filter(m => m.is_publicador && m.genero === 'M')
                } else {
                    // Other parts -> Women only
                    candidates = membros.filter(m => m.is_publicador && m.genero === 'F')
                }
            } else if (parte.tipo === 'VIDA_CRISTA') {
                if (parte.nome.includes('Estudo Bíblico de Congregação')) {
                    candidates = membros.filter(m => m.is_anciao)
                } else if (parte.nome.includes('Leitura do Estudo')) {
                    candidates = membros.filter(m => m.is_leitor_estudo_biblico)
                } else {
                    candidates = membros.filter(m => (m.is_anciao || m.is_servo_ministerial) && m.is_parte_vida_ministerio)
                }
            }

            const selected = pickCandidate(candidates)
            if (selected) {
                newParte.membro_id = selected.id
                assignedMembers.add(selected.id)
            }

            // Assistant (Ajudante) logic could be added here if needed, 
            // but usually assistants are chosen by the student or manually.
            // For "Leitura do Estudo", it's a specific role, handled above as main assignment if mapped correctly.
            // But wait, "Leitura do Estudo" is often an "Assistant" field in some schemas or a separate part.
            // In this schema, it seems to be a separate part or handled via the 'ajudante_id' of the Study Conductor?
            // Looking at ProgramacaoForm, it seems 'Leitura do Estudo' might be a separate part or the 'ajudante' of the Study.
            // Let's check the previous file content... 
            // In `app/admin/designacoes/[id]/page.tsx`:
            // `if (parte.nome.includes('Estudo Bíblico') ? 'Leitor' : 'Ajudante')`
            // So for Bible Study, the Reader is the `ajudante_id`.

            if (parte.tipo === 'VIDA_CRISTA' && parte.nome.includes('Estudo Bíblico') && !newParte.ajudante_id) {
                const readerCandidates = membros.filter(m => m.is_leitor_estudo_biblico)
                const selectedReader = pickCandidate(readerCandidates)
                if (selectedReader) {
                    newParte.ajudante_id = selectedReader.id
                    assignedMembers.add(selectedReader.id)
                }
            } else if (parte.tipo === 'MINISTERIO' && !newParte.ajudante_id) {
                // Assign assistant for Ministry parts
                // Rule: Assistant gender must match Main Assignee gender
                const mainMember = membros.find(m => m.id === newParte.membro_id)
                if (mainMember && mainMember.genero) {
                    const assistantCandidates = membros.filter(m =>
                        m.is_ajudante &&
                        m.id !== newParte.membro_id &&
                        m.genero === mainMember.genero
                    )
                    const selectedAssistant = pickCandidate(assistantCandidates)
                    if (selectedAssistant) {
                        newParte.ajudante_id = selectedAssistant.id
                        assignedMembers.add(selectedAssistant.id)
                    }
                }
            }

            return newParte
        })

        // 4. Oração Final
        if (!oracaoFinalId) {
            const candidates = membros.filter(m => m.is_anciao || m.is_servo_ministerial)
            const selected = pickCandidate(candidates)
            if (selected) {
                oracaoFinalId = selected.id
                assignedMembers.add(selected.id)
            }
        }

        return {
            success: true,
            data: {
                partes: newPartes,
                presidente_id: presidenteId,
                oracao_inicial_id: oracaoInicialId,
                oracao_final_id: oracaoFinalId
            }
        }

    } catch (error: any) {
        console.error('Error generating assignments:', error)
        return { success: false, error: error.message }
    }
}
