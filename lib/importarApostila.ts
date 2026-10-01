export type TipoParteApostila = 'TESOUROS' | 'MINISTERIO' | 'VIDA_CRISTA'

export interface ParteApostila {
    tipo: TipoParteApostila
    nome: string
    tempo: number
}

export interface ApostilaExtraida {
    dataReuniao: string
    semanaDescricao: string
    semana: string
    partes: ParteApostila[]
}

const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const secoes: Record<string, TipoParteApostila> = {
    'TESOUROS DA PALAVRA DE DEUS': 'TESOUROS',
    'FAÇA SEU MELHOR NO MINISTÉRIO': 'MINISTERIO',
    'NOSSA VIDA CRISTÃ': 'VIDA_CRISTA',
}

function limparTexto(texto: string): string {
    return texto
        .replace(/\[([^\]]*)\]\(https?:\/\/[^\s)]*\)/g, '$1')
        .replace(/[*_]/g, '')
        .replace(/^\s*#{1,6}\s*/gm, '')
        .replace(/[\u00a0\u202f]/g, ' ')
        .replace(/\r\n?/g, '\n')
}

function dataValida(ano: number, mes: number, dia: number): Date {
    const data = new Date(Date.UTC(ano, mes, dia))
    if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes || data.getUTCDate() !== dia) {
        throw new Error('A semana contém uma data inválida. Confira o texto colado.')
    }
    return data
}

function extrairSemana(linhas: string[], textoOriginal: string, anoInformado?: number) {
    const nomesMeses = meses.join('|')
    const intervalo = new RegExp(`^(\\d{1,2})(?:\\s+(?:de\\s+)?(${nomesMeses}))?\\s*[-–—]\\s*(\\d{1,2})\\s+(?:de\\s+)?(${nomesMeses})(?:\\s+(?:de\\s+)?(20\\d{2}))?$`, 'i')
    const semana = linhas.map(linha => linha.replace(/^[-•]\s*/, '').trim()).find(linha => intervalo.test(linha))
    if (!semana) throw new Error('Não encontrei o intervalo da semana. Cole o conteúdo completo da página da apostila.')
    const match = semana.match(intervalo)!
    const anoPublicacao = linhas.find(linha => /Nossa Vida e Ministério.*20\d{2}/i.test(linha))?.match(/20\d{2}/)?.[0]
        ?? textoOriginal.match(/\bmwb(\d{2})\b/i)?.[1]?.replace(/^(\d{2})$/, '20$1')
    const ano = anoInformado ?? Number(match[5] ?? anoPublicacao)
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2099) {
        throw new Error('Não encontrei o ano da apostila. Informe o ano no campo abaixo do texto.')
    }
    const mesFinal = meses.indexOf(match[4].toLowerCase())
    const mesInicial = match[2] ? meses.indexOf(match[2].toLowerCase()) : mesFinal
    // Uma apostila de janeiro pode conter uma semana que começa em dezembro.
    const cruzaAno = mesFinal < mesInicial
    let inicio = dataValida(ano, mesInicial, Number(match[1]))
    let fim = dataValida(ano + (cruzaAno ? 1 : 0), mesFinal, Number(match[3]))
    if (cruzaAno && anoInformado === undefined && !match[5] && inicio.getUTCDay() !== 1) {
        inicio = dataValida(ano - 1, mesInicial, Number(match[1]))
        fim = dataValida(ano, mesFinal, Number(match[3]))
    }
    if (inicio.getUTCDay() !== 1 || fim.getUTCDay() !== 0 || fim.getTime() - inicio.getTime() !== 6 * 86400000) {
        throw new Error('A semana e o ano informados não correspondem a um período de segunda a domingo. Confira o ano e o intervalo.')
    }
    return { semana, inicio }
}

function primeiraInstrucao(linhas: string[]): string {
    const inicio = linhas.findIndex(linha => /\(\s*\d+\s*min\s*\)/i.test(linha))
    if (inicio < 0) throw new Error('Uma das partes não tem o tempo em minutos. Confira se a página foi copiada por completo.')
    const trechos: string[] = []
    for (let i = inicio; i < linhas.length; i++) {
        const linha = linhas[i].trim()
        // O tempo pode estar em uma linha isolada, separado da instrução.
        if (!linha) {
            if (trechos.length && !/^\(\s*\d+\s*min\s*\)$/i.test(trechos.join(' '))) break
            continue
        }
        if (/^(?:Cântico\b|Comentários finais\b|Sua resposta\b|[-•]\s|Copyright\b)/i.test(linha)) break
        trechos.push(linha)
    }
    return trechos.join(' ').replace(/\s+/g, ' ').trim()
}

/** Extrai somente a programação para revisão; não acessa nem grava o banco. */
export function importarApostila(texto: string, diaReuniao: number | null, anoInformado?: number): ApostilaExtraida {
    if (diaReuniao === null || !Number.isInteger(diaReuniao) || diaReuniao < 0 || diaReuniao > 6) {
        throw new Error('Cadastre o dia da reunião de meio de semana em Dados da Congregação antes de importar.')
    }
    const linhas = limparTexto(texto).split('\n').map(linha => linha.trim())
    const { semana, inicio } = extrairSemana(linhas, texto, anoInformado)
    const primeiraSecao = linhas.findIndex(linha => linha.toUpperCase() === 'TESOUROS DA PALAVRA DE DEUS')
    if (primeiraSecao < 0) throw new Error('Não encontrei as seções da apostila. Cole o conteúdo completo da página.')
    const semanaDescricao = linhas.slice(0, primeiraSecao).find(linha =>
        /^[\p{L}\s\d]+\s+\d+(?:\s*[-–—]\s*\d+)?$/u.test(linha) && !/Cântico/i.test(linha) && !/de (?:20\d{2})$/i.test(linha)
    )
    if (!semanaDescricao) throw new Error('Não encontrei a leitura bíblica da semana, como “JEREMIAS 49-50”.')

    const blocos: { numero: number; titulo: string; tipo: TipoParteApostila; linhas: string[] }[] = []
    const secoesEncontradas = new Set<TipoParteApostila>()
    let tipo: TipoParteApostila | undefined
    let atual: typeof blocos[number] | undefined
    for (const linha of linhas.slice(primeiraSecao)) {
        const secao = secoes[linha.toUpperCase()]
        if (secao) {
            tipo = secao
            secoesEncontradas.add(secao)
            atual = undefined
            continue
        }
        if (/^(?:Comentários finais|Copyright)\b/i.test(linha)) break
        const cabecalho = linha.match(/^(\d+)\.\s+(.+)$/)
        if (cabecalho && tipo) {
            const titulo = cabecalho[2].split(/\s*(?=\(\s*\d+\s*min)/i)[0].trim()
            atual = { numero: Number(cabecalho[1]), titulo, tipo, linhas: [] }
            const instrucaoNoTitulo = cabecalho[2].slice(titulo.length).trim()
            if (instrucaoNoTitulo) atual.linhas.push(instrucaoNoTitulo)
            blocos.push(atual)
        } else if (atual) {
            atual.linhas.push(linha)
        }
    }
    if (secoesEncontradas.size !== 3 || blocos.length < 5 || blocos.some((bloco, index) => bloco.numero !== index + 1)) {
        throw new Error('A programação parece incompleta ou a numeração das partes está interrompida. Confira o conteúdo colado.')
    }
    if (blocos.filter(bloco => bloco.tipo === 'TESOUROS').length !== 3 || !blocos.some(bloco => bloco.tipo === 'TESOUROS' && /^Leitura da Bíblia$/i.test(bloco.titulo))) {
        throw new Error('Não encontrei as três partes de Tesouros, incluindo a Leitura da Bíblia. Confira o conteúdo colado.')
    }
    const partes = blocos.map(bloco => {
        let instrucao = primeiraInstrucao(bloco.linhas)
        const duracao = instrucao.match(/\(\s*(\d+)\s*min\s*\)/i)!
        const tempo = Number(duracao[1])
        if (tempo <= 0) throw new Error(`O tempo da parte ${bloco.numero} é inválido.`)
        const prefixo = `(${tempo} min)`
        if (bloco.tipo === 'TESOUROS' && !/^Leitura da Bíblia$/i.test(bloco.titulo)) {
            instrucao = prefixo
        } else if (bloco.tipo === 'VIDA_CRISTA' && /^\(\s*\d+\s*min\s*\)\s*Consideração\./i.test(instrucao)) {
            instrucao = `${prefixo} Consideração.`
        } else {
            instrucao = instrucao.replace(duracao[0], prefixo)
            // Nas partes do ministério, a referência de ensino encerra a instrução.
            const referencia = instrucao.match(/\((?:lmd|th)\s+[^)]*\)/i)
            if (referencia) instrucao = instrucao.slice(0, referencia.index! + referencia[0].length)
            if (instrucao === prefixo && (bloco.tipo === 'MINISTERIO' || bloco.tipo === 'TESOUROS' || /Estudo bíblico de congregação/i.test(bloco.titulo))) {
                throw new Error(`A instrução da parte ${bloco.numero} está incompleta. Confira o conteúdo colado.`)
            }
        }
        return { tipo: bloco.tipo, nome: `${bloco.numero}. ${bloco.titulo} ${instrucao}`, tempo }
    })
    if (!partes.some(parte => parte.tipo === 'MINISTERIO') || !partes.some(parte => parte.tipo === 'VIDA_CRISTA')) {
        throw new Error('Não encontrei partes em todas as seções da programação.')
    }
    const data = new Date(inicio.getTime() + ((diaReuniao + 6) % 7) * 86400000)
    return { dataReuniao: data.toISOString().slice(0, 10), semanaDescricao, semana, partes }
}
