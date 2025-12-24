'use server'

import { createServerClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

export async function createTerritory(formData: FormData) {
    const supabase = createServerClient()

    const nome = formData.get('nome') as string
    const referencia = formData.get('referencia') as string
    const configuracao = formData.get('configuracao') as string
    const imagem = formData.get('imagem') as File

    if (!nome || !imagem || !configuracao) {
        return { error: 'Dados incompletos' }
    }

    // 1. Upload Image (Server-side)
    const fileExt = imagem.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('mapas-territorios')
        .upload(filePath, imagem, {
            cacheControl: '3600',
            upsert: false,
        })

    if (uploadError) {
        console.error('Error uploading image:', uploadError)
        return { error: 'Erro ao fazer upload da imagem: ' + uploadError.message }
    }

    const { data: { publicUrl } } = supabase.storage
        .from('mapas-territorios')
        .getPublicUrl(filePath)

    // 2. Save Territory
    const { error } = await supabase
        .from('territorios')
        .insert({
            nome,
            referencia,
            imagem_url: publicUrl,
            configuracao: JSON.parse(configuracao),
        })

    if (error) {
        console.error('Error creating territory:', error)
        return { error: 'Erro ao criar território: ' + error.message }
    }

    revalidatePath('/territorios')
    return { success: true }
}

export async function updateTerritory(formData: FormData) {
    const supabase = createServerClient()

    const id = formData.get('id') as string
    const nome = formData.get('nome') as string
    const referencia = formData.get('referencia') as string
    const configuracao = formData.get('configuracao') as string
    const imagem = formData.get('imagem') as File | null
    const imagemUrlOriginal = formData.get('imagem_url_original') as string

    if (!id || !nome || !configuracao) {
        return { error: 'Dados incompletos' }
    }

    let finalImageUrl = imagemUrlOriginal

    // If new image provided, upload it
    if (imagem && imagem.size > 0) {
        const fileExt = imagem.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('mapas-territorios')
            .upload(filePath, imagem, {
                cacheControl: '3600',
                upsert: false,
            })

        if (uploadError) {
            console.error('Error uploading image:', uploadError)
            return { error: 'Erro ao fazer upload da imagem: ' + uploadError.message }
        }

        const { data: { publicUrl } } = supabase.storage
            .from('mapas-territorios')
            .getPublicUrl(filePath)

        finalImageUrl = publicUrl
    }

    const { error } = await supabase
        .from('territorios')
        .update({
            nome,
            referencia,
            imagem_url: finalImageUrl,
            configuracao: JSON.parse(configuracao),
        })
        .eq('id', id)

    if (error) {
        console.error('Error updating territory:', error)
        return { error: 'Erro ao atualizar território: ' + error.message }
    }

    revalidatePath('/territorios')
    revalidatePath(`/territorios/${id}`)
    return { success: true }
}

export async function getTerritory(id: string) {
    const supabase = createServerClient()

    const { data: territorio, error: territorioError } = await supabase
        .from('territorios')
        .select('*')
        .eq('id', id)
        .single()

    if (territorioError || !territorio) {
        console.error('Error fetching territory:', territorioError)
        return { error: 'Território não encontrado' }
    }

    const { data: visitas, error: visitasError } = await supabase
        .from('visitas_ativas')
        .select('quadra_id')
        .eq('territorio_id', id)

    if (visitasError) {
        console.error('Error fetching visits:', visitasError)
        return { error: 'Erro ao buscar visitas' }
    }

    return {
        territorio,
        visitas: visitas.map((v) => v.quadra_id),
    }
}

export async function toggleVisita(territorioId: string, quadraId: number) {
    const supabase = createServerClient()

    // Check if it exists
    const { data: existing } = await supabase
        .from('visitas_ativas')
        .select('id')
        .eq('territorio_id', territorioId)
        .eq('quadra_id', quadraId)
        .single()

    if (existing) {
        // Remove
        const { error } = await supabase
            .from('visitas_ativas')
            .delete()
            .eq('id', existing.id)

        if (error) return { error: 'Erro ao remover visita' }
    } else {
        // Add
        const { error } = await supabase
            .from('visitas_ativas')
            .insert({
                territorio_id: territorioId,
                quadra_id: quadraId,
            })

        if (error) return { error: 'Erro ao adicionar visita' }
    }

    revalidatePath(`/territorios/${territorioId}`)
    return { success: true }
}

export async function assignTerritory(territorioId: string, membroId: string) {
    const supabase = createServerClient()

    const { error } = await supabase
        .from('territorios')
        .update({ responsavel_id: membroId })
        .eq('id', territorioId)

    if (error) {
        console.error('Error assigning territory:', error)
        return { error: 'Erro ao definir responsável' }
    }

    revalidatePath(`/territorios/${territorioId}`)
    return { success: true }
}

export async function closeTerritory(territorioId: string) {
    const supabase = createServerClient()

    // 0. Get current responsible
    const { data: territorio } = await supabase
        .from('territorios')
        .select('responsavel_id')
        .eq('id', territorioId)
        .single()

    // 0.5 Get start date (first visit)
    const { data: firstVisit } = await supabase
        .from('visitas_ativas')
        .select('data_marcacao')
        .eq('territorio_id', territorioId)
        .order('data_marcacao', { ascending: true })
        .limit(1)
        .single()

    const dataInicio = firstVisit?.data_marcacao || new Date().toISOString()

    // 1. Log history
    const { error: historyError } = await supabase
        .from('historico_conclusao')
        .insert({
            territorio_id: territorioId,
            data_inicio: dataInicio,
            data_fim: new Date().toISOString(),
            responsavel_id: territorio?.responsavel_id
        })

    if (historyError) {
        console.error('Error logging history:', historyError)
        return { error: 'Erro ao registrar histórico' }
    }

    // 2. Clear visits AND responsible
    const { error: deleteError } = await supabase
        .from('visitas_ativas')
        .delete()
        .eq('territorio_id', territorioId)

    if (deleteError) {
        console.error('Error clearing visits:', deleteError)
        return { error: 'Erro ao limpar visitas' }
    }

    // Clear responsible
    await supabase
        .from('territorios')
        .update({ responsavel_id: null })
        .eq('id', territorioId)

    revalidatePath(`/territorios/${territorioId}`)
    return { success: true }
}

export async function getTerritoryReport(serviceYear: number) {
    const supabase = createServerClient()

    // Calculate range: Sept 1 of (Year-1) to Aug 31 of Year
    // Example: Service Year 2025 = 2024-09-01 to 2025-08-31
    const startDate = `${serviceYear - 1}-09-01T00:00:00.000Z`
    const endDate = `${serviceYear}-08-31T23:59:59.999Z`

    console.log('Fetching report for Service Year:', serviceYear, `range: ${startDate} to ${endDate}`)

    // 1. Get all territories
    const { data: territories, error: territoriesError } = await supabase
        .from('territorios')
        .select('id, nome, referencia')
        .order('nome')

    if (territoriesError) {
        console.error('Error fetching territories for report:', territoriesError)
        return { error: 'Erro ao buscar territórios' }
    }

    // 2. Get history within range with Responsible Name
    const { data: history, error: historyError } = await supabase
        .from('historico_conclusao')
        .select(`
            territorio_id,
            data_inicio,
            data_fim,
            membros (
                nome_completo
            )
        `)
        .gte('data_fim', startDate)
        .lte('data_fim', endDate)
        .order('data_fim', { ascending: true }) // Oldest first to fill slots chronologically

    if (historyError) {
        console.error('Error fetching history for report:', historyError)
        return { error: 'Erro ao buscar histórico' }
    }

    // 3. Combine data
    const reportData = territories.map(t => {
        const territoryHistory = history
            .filter((h: any) => h.territorio_id === t.id)
            .map((h: any) => {
                const nomeCompleto = h.membros?.nome_completo || 'Desconhecido'
                const parts = nomeCompleto.split(' ')
                const shortName = parts.length > 1
                    ? `${parts[0]} ${parts[1][0]}.`
                    : parts[0]

                return {
                    responsavel: shortName,
                    data_designacao: h.data_inicio ? new Date(h.data_inicio).toLocaleDateString('pt-BR') : '-',
                    data_conclusao: new Date(h.data_fim).toLocaleDateString('pt-BR')
                }
            })

        // Pad with empty slots to ensure 4 slots
        const slots: any[] = [...territoryHistory]
        while (slots.length < 4) {
            slots.push(null)
        }
        // If more than 4, take last 4? Or first 4? Usually first 4 of the year.
        // User didn't specify, but usually you want to see what happened. 
        // If there are more than 4, we might need another row, but for now let's cap at 4 or just return all and let UI handle.
        // The UI has fixed 4 columns. I'll slice to 4.

        return {
            id: t.id,
            nome: t.nome,
            referencia: t.referencia,
            slots: slots.slice(0, 4)
        }
    })

    return { data: reportData }
}
