import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
    try {
        const { pin } = await request.json() as { pin?: string }
        if (!pin) {
            return NextResponse.json({ error: 'PIN obrigatório' }, { status: 400 })
        }

        const supabase = createAdminClient()
        const { data: member, error: memberError } = await supabase
            .from('membros')
            .select('id, is_pioneiro')
            .eq('pin', pin)
            .eq('ativo', true)
            .single()

        if (memberError || !member?.is_pioneiro) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 })
        }

        const { data: reports, error: reportsError } = await supabase
            .from('relatorios_servico')
            .select('id, membro_id, mes, horas, estudos, trabalhou, is_pioneiro_auxiliar, horas_abono, atualizado_em')
            .eq('membro_id', member.id)
            .order('mes', { ascending: false })

        if (reportsError) throw reportsError

        return NextResponse.json({ reports: reports || [] })
    } catch (error) {
        console.error('Error loading pioneer reports:', error)
        return NextResponse.json({ error: 'Erro ao carregar relatórios' }, { status: 500 })
    }
}
