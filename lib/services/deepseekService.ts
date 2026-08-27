'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'

// Interface para garantir que o resto do programa entenda os dados
export interface ProgramacaoExtraida {
    data_reuniao: string | null
    semana_descricao: string
    temas_tesouros: string | null
    canticos: {
        inicial: number | null
        meio: number | null
        final: number | null
    }
    partes: {
        nome_parte: string
        tipo: 'TESOUROS' | 'MINISTERIO' | 'VIDA'
        responsavel?: string
    }[]
}

export async function analisarProgramacaoComIA(texto: string): Promise<ProgramacaoExtraida> {
    const apiKey = process.env.GEMINI_API_KEY?.trim()
    console.log('🔑 Debug API Key:', apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)} (Length: ${apiKey.length})` : 'UNDEFINED')

    if (!apiKey) {
        throw new Error('❌ GEMINI_API_KEY não encontrada no .env.local')
    }

    try {
        console.log('🚀 Iniciando GoogleGenerativeAI...')
        const genAI = new GoogleGenerativeAI(apiKey)

        // Tenta o modelo 2.5 Pro (Validado via script de teste)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' })

        const prompt = `
        Você é um assistente JW especializado. Analise a programação abaixo.
        
        Texto:
        "${texto}"

        Retorne APENAS um JSON (sem markdown) com esta estrutura exata:
        {
            "data_reuniao": "YYYY-MM-DD" (data da quarta-feira da semana, ou null),
            "semana_descricao": "Texto da semana (ex: 4-10 Dez)",
            "temas_tesouros": "Tema principal",
            "canticos": { "inicial": 0, "meio": 0, "final": 0 },
            "partes": [
                { "nome_parte": "Titulo da parte", "tipo": "TESOUROS" }
            ]
        }
        `

        const result = await model.generateContent(prompt)
        const response = await result.response
        let text = response.text()

        // Limpeza de segurança para JSON
        text = text.replace(/```json/g, '').replace(/```/g, '').trim()

        console.log('✅ IA Processou com sucesso!')
        return JSON.parse(text)

    } catch (error: any) {
        console.error('🔴 Erro na IA:', error.message)
        throw new Error(`Falha na IA: ${error.message}`)
    }
}