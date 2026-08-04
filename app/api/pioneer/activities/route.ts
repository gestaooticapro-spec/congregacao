/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseServer'

type Payload = Record<string, unknown>

async function pioneerFromPin(pin?: string) {
    if (!pin) return null
    const db = createAdminClient() as any
    const { data } = await db.from('membros').select('id, nome_completo, nome_civil, is_pioneiro').eq('pin', pin).eq('ativo', true).single()
    return data?.is_pioneiro ? data : null
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as Payload
        const member = await pioneerFromPin(body.pin as string | undefined)
        if (!member) return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 })
        const db = createAdminClient() as any
        const action = body.action as string

        if (action === 'list') {
            const { data: activities, error } = await db.from('pioneiro_atividades')
                .select('*').eq('responsavel_id', member.id).order('data_agendada').order('hora_agendada')
            if (error) throw error
            const studyIds = (activities || []).filter((activity: any) => activity.tipo === 'ESTUDO').map((activity: any) => activity.id)
            const { data: studyOccurrences, error: occurrencesError } = studyIds.length
                ? await db.from('pioneiro_ocorrencias_estudo').select('*').in('atividade_id', studyIds)
                : { data: [], error: null }
            if (occurrencesError) throw occurrencesError
            const { data: invites, error: inviteError } = await db.from('pioneiro_transferencias')
                .select('*, atividade:pioneiro_atividades(*)').eq('destinatario_id', member.id).eq('status', 'PENDENTE').order('criado_em', { ascending: false })
            if (inviteError) throw inviteError
            const { data: transferResponses, error: responsesError } = await db.from('pioneiro_transferencias')
                .select('*, destinatario:membros!pioneiro_transferencias_destinatario_id_fkey(nome_completo, nome_civil), atividade:pioneiro_atividades(pessoa_nome, titulo)')
                .eq('remetente_id', member.id).eq('status', 'RECUSADA').is('visto_remetente_em', null).order('respondido_em', { ascending: false })
            if (responsesError) throw responsesError
            return NextResponse.json({ activities: activities || [], invites: invites || [], transferResponses: transferResponses || [], studyOccurrences: studyOccurrences || [] })
        }

        if (action === 'pioneers') {
            const { data, error } = await db.from('membros').select('id, nome_completo, nome_civil').eq('ativo', true).eq('is_pioneiro', true).neq('id', member.id).order('nome_completo')
            if (error) throw error
            return NextResponse.json({ pioneers: data || [] })
        }

        if (action === 'create') {
            const input = body.activity as Payload
            if (!input?.tipo || !input?.data_agendada) return NextResponse.json({ error: 'Tipo e data são obrigatórios' }, { status: 400 })
            const record = { ...input, criado_por_id: member.id, responsavel_id: member.id, status: 'ATIVA', updated_at: new Date().toISOString() }
            const { data, error } = await db.from('pioneiro_atividades').insert(record).select().single()
            if (error) throw error
            await db.from('pioneiro_atividade_historico').insert({ atividade_id: data.id, membro_id: member.id, evento: 'CRIADA' })
            return NextResponse.json({ activity: data })
        }

        if (action === 'respondTransfer') {
            const transferId = body.transferId as string
            const accept = Boolean(body.accept)
            const { data: transfer, error } = await db.from('pioneiro_transferencias').select('*').eq('id', transferId).eq('destinatario_id', member.id).eq('status', 'PENDENTE').single()
            if (error || !transfer) return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 })
            const { error: transferUpdateError } = await db.from('pioneiro_transferencias').update({ status: accept ? 'ACEITA' : 'RECUSADA', respondido_em: new Date().toISOString() }).eq('id', transferId)
            if (transferUpdateError) throw transferUpdateError
            const { error: activityUpdateError } = await db.from('pioneiro_atividades').update({ responsavel_id: accept ? member.id : transfer.remetente_id, status: 'ATIVA', updated_at: new Date().toISOString() }).eq('id', transfer.atividade_id)
            if (activityUpdateError) throw activityUpdateError
            await db.from('pioneiro_atividade_historico').insert({ atividade_id: transfer.atividade_id, membro_id: member.id, evento: accept ? 'TRANSFERENCIA_ACEITA' : 'TRANSFERENCIA_RECUSADA' })
            return NextResponse.json({ ok: true })
        }

        if (action === 'ackTransferResponse') {
            const transferId = body.transferId as string
            const { error } = await db.from('pioneiro_transferencias').update({ visto_remetente_em: new Date().toISOString() })
                .eq('id', transferId).eq('remetente_id', member.id).eq('status', 'RECUSADA')
            if (error) throw error
            return NextResponse.json({ ok: true })
        }

        const activityId = body.activityId as string
        const { data: activity, error: activityError } = await db.from('pioneiro_atividades').select('*').eq('id', activityId).single()
        if (activityError || !activity || activity.responsavel_id !== member.id) return NextResponse.json({ error: 'Atividade não encontrada' }, { status: 404 })

        if (action === 'update') {
            const { data, error } = await db.from('pioneiro_atividades').update({ ...(body.activity as Payload), updated_at: new Date().toISOString() }).eq('id', activityId).select().single()
            if (error) throw error
            return NextResponse.json({ activity: data })
        }
        if (action === 'delete') {
            const { error } = await db.from('pioneiro_atividades').delete().eq('id', activityId)
            if (error) throw error
            return NextResponse.json({ ok: true })
        }
        if (action === 'setStatus') {
            const status = body.status as string
            if (!['ATIVA', 'PAUSADA', 'CANCELADA'].includes(status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
            const { data, error } = await db.from('pioneiro_atividades').update({ status, updated_at: new Date().toISOString() }).eq('id', activityId).select().single()
            if (error) throw error
            await db.from('pioneiro_atividade_historico').insert({ atividade_id: activityId, membro_id: member.id, evento: `STATUS_${status}` })
            return NextResponse.json({ activity: data })
        }
        if (action === 'complete') {
            const { data, error } = await db.from('pioneiro_atividades').update({ status: 'CONCLUIDA', updated_at: new Date().toISOString() }).eq('id', activityId).select().single()
            if (error) throw error
            await db.from('pioneiro_atividade_historico').insert({ atividade_id: activityId, membro_id: member.id, evento: 'CONCLUIDA' })
            return NextResponse.json({ activity: data })
        }
        if (action === 'revisitAgain') {
            const schedule = body.schedule as Payload
            if (!schedule?.data_agendada) return NextResponse.json({ error: 'Escolha uma nova data' }, { status: 400 })
            const clone = { ...activity, id: undefined, created_at: undefined, updated_at: new Date().toISOString(), status: 'ATIVA', data_agendada: schedule.data_agendada, hora_agendada: schedule.hora_agendada || null, tipo_agendamento: schedule.tipo_agendamento || 'PLANEJADO', origem_revisita_id: activity.id }
            const { data, error } = await db.from('pioneiro_atividades').insert(clone).select().single()
            if (error) throw error
            await db.from('pioneiro_atividade_historico').insert({ atividade_id: data.id, membro_id: member.id, evento: 'REVISITA_CRIADA_DA_ANTERIOR', detalhes: { origem: activity.id } })
            return NextResponse.json({ activity: data })
        }
        if (action === 'studyOccurrence') {
            if (activity.tipo !== 'ESTUDO') return NextResponse.json({ error: 'Atividade não é um estudo' }, { status: 400 })
            const occurrence = body.occurrence as Payload
            if (!occurrence?.data_original || !occurrence?.status) return NextResponse.json({ error: 'Dados da ocorrência incompletos' }, { status: 400 })
            const record = {
                atividade_id: activityId,
                data_original: occurrence.data_original,
                data_agendada: occurrence.data_agendada || null,
                status: occurrence.status,
                observacao: occurrence.observacao || null,
                updated_at: new Date().toISOString()
            }
            const { data, error } = await db.from('pioneiro_ocorrencias_estudo').upsert(record, { onConflict: 'atividade_id,data_original' }).select().single()
            if (error) throw error
            await db.from('pioneiro_atividade_historico').insert({ atividade_id: activityId, membro_id: member.id, evento: `ESTUDO_${occurrence.status}`, detalhes: { data_original: occurrence.data_original, data_agendada: occurrence.data_agendada || null } })
            return NextResponse.json({ occurrence: data })
        }
        if (action === 'transfer') {
            const recipientId = body.recipientId as string
            if (!recipientId) return NextResponse.json({ error: 'Escolha um pioneiro' }, { status: 400 })
            const { data: recipient } = await db.from('membros').select('id').eq('id', recipientId).eq('ativo', true).eq('is_pioneiro', true).single()
            if (!recipient) return NextResponse.json({ error: 'Pioneiro destinatário não encontrado' }, { status: 400 })
            const { error } = await db.from('pioneiro_atividades').update({ status: 'AGUARDANDO_TRANSFERENCIA', updated_at: new Date().toISOString() }).eq('id', activityId)
            if (error) throw error
            const { data, error: transferError } = await db.from('pioneiro_transferencias').insert({ atividade_id: activityId, remetente_id: member.id, destinatario_id: recipientId }).select().single()
            if (transferError) throw transferError
            await db.from('pioneiro_atividade_historico').insert({ atividade_id: activityId, membro_id: member.id, evento: 'TRANSFERENCIA_ENVIADA', detalhes: { destinatario_id: recipientId } })
            return NextResponse.json({ transfer: data })
        }
        if (action === 'cancelTransfer') {
            const { data: transfer, error: transferError } = await db.from('pioneiro_transferencias').select('id').eq('atividade_id', activityId).eq('remetente_id', member.id).eq('status', 'PENDENTE').single()
            if (transferError || !transfer) return NextResponse.json({ error: 'Transferência pendente não encontrada' }, { status: 404 })
            const { error: deleteError } = await db.from('pioneiro_transferencias').delete().eq('id', transfer.id)
            if (deleteError) throw deleteError
            const { error: activityError } = await db.from('pioneiro_atividades').update({ status: 'ATIVA', updated_at: new Date().toISOString() }).eq('id', activityId)
            if (activityError) throw activityError
            await db.from('pioneiro_atividade_historico').insert({ atividade_id: activityId, membro_id: member.id, evento: 'TRANSFERENCIA_CANCELADA' })
            return NextResponse.json({ ok: true })
        }
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    } catch (error) {
        console.error('Pioneer activities API error:', error)
        return NextResponse.json({ error: 'Não foi possível concluir a operação' }, { status: 500 })
    }
}
