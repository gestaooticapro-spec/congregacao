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

export async function closeTerritory(territorioId: string) {
    const supabase = createServerClient()

    // 1. Log history
    const { error: historyError } = await supabase
        .from('historico_conclusao')
        .insert({
            territorio_id: territorioId,
            data_fim: new Date().toISOString(),
        })

    if (historyError) {
        console.error('Error logging history:', historyError)
        return { error: 'Erro ao registrar histórico' }
    }

    // 2. Clear visits
    const { error: deleteError } = await supabase
        .from('visitas_ativas')
        .delete()
        .eq('territorio_id', territorioId)

    if (deleteError) {
        console.error('Error clearing visits:', deleteError)
        return { error: 'Erro ao limpar visitas' }
    }

    revalidatePath(`/territorios/${territorioId}`)
    return { success: true }
}

export async function getTerritoryReport(startDate: string, endDate: string) {
    const supabase = createServerClient()

    // 1. Get all territories
    const { data: territories, error: territoriesError } = await supabase
        .from('territorios')
        .select('id, nome, referencia')
        .order('nome')

    if (territoriesError) {
        console.error('Error fetching territories for report:', territoriesError)
        return { error: 'Erro ao buscar territórios' }
    }

    // 2. Get history within range
    // We want the last 3 completions for each territory within the range
    // It's easier to fetch all relevant history and process in JS for this scale

    // Ensure endDate covers the entire day
    const adjustedEndDate = `${endDate}T23:59:59.999Z`

    console.log('Fetching report for range:', startDate, adjustedEndDate)

    const { data: history, error: historyError } = await supabase
        .from('historico_conclusao')
        .select('territorio_id, data_fim')
        .gte('data_fim', startDate)
        .lte('data_fim', adjustedEndDate)
        .order('data_fim', { ascending: false })

    if (historyError) {
        console.error('Error fetching history for report:', historyError)
        return { error: 'Erro ao buscar histórico' }
    }

    // 3. Combine data
    const reportData = territories.map(t => {
        const territoryHistory = history
            .filter(h => h.territorio_id === t.id)
            .map(h => new Date(h.data_fim).toLocaleDateString('pt-BR'))
            .slice(0, 3) // Take top 3 most recent

        return {
            id: t.id,
            nome: t.nome,
            referencia: t.referencia,
            conclusoes: territoryHistory
        }
    })

    return { data: reportData }
}
