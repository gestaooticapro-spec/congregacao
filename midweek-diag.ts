import { createClient } from '@supabase/supabase-js'
import { aggregateMidweek } from './lib/responsibilityCounts'
import { parteExigeAjudante, parteTipoNome } from './lib/parteAjudante'
import { getCongregationDate } from './lib/dateUtils'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
const hoje = getCongregationDate()
console.log('hoje', hoje)

async function main() {
const { data, error, count } = await supabase
    .from('programacao_semanal')
    .select('id, data_reuniao, evento_tipo, presidente_id, presidente_status, oracao_inicial_id, oracao_inicial_status, oracao_final_id, oracao_final_status, partes', { count: 'exact' })
    .gte('data_reuniao', '2026-10-01')
    .lte('data_reuniao', '2027-03-31')
    .order('data_reuniao', { ascending: true })

if (error) {
    console.log('erro', error.message)
    process.exit(1)
}

const todas = await supabase
    .from('programacao_semanal')
    .select('data_reuniao, evento_tipo')
    .order('data_reuniao', { ascending: true })
if (todas.error) {
    console.log('erro_todas', todas.error.message)
} else {
    console.log('total_tabela', todas.data?.length)
    console.log('todas', (todas.data ?? []).map(row => row.data_reuniao).join(' '))
}

const futuras = (data ?? []).filter(row => row.data_reuniao >= hoje)
console.log('linhas_out_mar', count, 'no_intervalo', data?.length, 'futuras', futuras.length)
console.log('datas', (data ?? []).map(row => `${row.data_reuniao} ${row.evento_tipo}`).join(' | '))
console.log('agregado', aggregateMidweek(futuras))

const preenchido = (value: unknown) => typeof value === 'string' && value.trim() !== ''
const coberto = (id: unknown, status: unknown) => preenchido(id) && status !== 'declined'

const grupos = new Map<string, { com: number; sem: number; exemplo: string }>()
for (const row of data ?? []) {
    const partes = Array.isArray(row.partes) ? row.partes : []
    for (const parte of partes) {
        const campos = parteTipoNome(parte)
        if (!campos || campos.tipo !== 'MINISTERIO') continue
        const registro = parte as { membro_id?: unknown; ajudante_id?: unknown }
        if (!preenchido(registro.membro_id)) continue
        const titulo = campos.nome.replace(/^\d+\.\s*/, '').split('(')[0].trim()
        const instrucao = campos.nome.includes(')') ? campos.nome.split(')').slice(1).join(')').trim() : ''
        const chave = `${titulo} | ${/^\s*Consideração/i.test(instrucao) ? 'consideracao' : /^\s*Demonstração/i.test(instrucao) ? 'demonstracao' : 'outra'}`
        const item = grupos.get(chave) ?? { com: 0, sem: 0, exemplo: campos.nome.slice(0, 80) }
        if (preenchido(registro.ajudante_id)) item.com += 1
        else item.sem += 1
        grupos.set(chave, item)
    }
}
for (const [chave, item] of grupos) {
    console.log(`${item.com} com / ${item.sem} sem | ${chave} | ${item.exemplo}`)
}

for (const row of futuras) {
    const partes = Array.isArray(row.partes) ? row.partes : null
    const falhas: string[] = []
    if (row.evento_tipo !== 'normal' && row.evento_tipo !== 'visita spte') falhas.push('evento ' + row.evento_tipo)
    if (!coberto(row.presidente_id, row.presidente_status)) falhas.push('presidente ' + (row.presidente_status || 'vazio'))
    if (!coberto(row.oracao_inicial_id, row.oracao_inicial_status)) falhas.push('oracao_inicial ' + (row.oracao_inicial_status || 'vazio'))
    if (!coberto(row.oracao_final_id, row.oracao_final_status)) falhas.push('oracao_final ' + (row.oracao_final_status || 'vazio'))
    if (!partes || partes.length === 0) falhas.push('partes ' + (partes ? 'vazias' : typeof row.partes))
    else {
        partes.forEach((parte, index) => {
            const campos = parteTipoNome(parte)
            if (!campos) {
                const tipo = parte && typeof parte === 'object' ? (parte as { tipo?: unknown }).tipo : typeof parte
                const nomeTipo = parte && typeof parte === 'object' ? typeof (parte as { nome?: unknown }).nome : 'sem'
                falhas.push(`parte ${index} invalida tipo=${String(tipo)} nome=${nomeTipo}`)
                return
            }
            const registro = parte as { membro_id?: unknown; status?: unknown; ajudante_id?: unknown; ajudante_status?: unknown }
            const nome = campos.nome.slice(0, 70)
            if (!coberto(registro.membro_id, registro.status)) falhas.push(`parte ${index} ${campos.tipo} principal ${registro.status || 'vazio'} ${nome}`)
            if (parteExigeAjudante(parte) && !coberto(registro.ajudante_id, registro.ajudante_status)) {
                falhas.push(`parte ${index} ajudante ${registro.ajudante_status || 'vazio'} ${nome}`)
            }
        })
    }
    console.log(row.data_reuniao, row.evento_tipo, falhas.length ? falhas.join(' | ') : 'COMPLETA')
}
}

main()
