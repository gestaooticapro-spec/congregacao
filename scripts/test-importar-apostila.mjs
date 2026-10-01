// Execute com: node --test scripts/test-importar-apostila.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const source = fs.readFileSync(new URL('../lib/importarApostila.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 } }).outputText
const exportsParser = {}
vm.runInNewContext(compiled, { exports: exportsParser })
const { importarApostila } = exportsParser

function pagina(semana, leitura, ministerio, vida, ano = 2026) {
    const primeiras = [
        '1. Ajude outros a se beneficiar da misericórdia de Jeová\n\n(10 min)\n\nUm parágrafo que não deve ser importado.',
        '2. Joias espirituais\n\n(10 min)\n\n- Uma pergunta que não deve ser importada.\n\nSua resposta',
        '3. Leitura da Bíblia\n\n(4 min) Jer. 50:24-40 (th lição 11)',
    ]
    return `BIBLIOTECA ON-LINE da Torre de Vigia\n\n${semana}\nNossa Vida e Ministério Cristão — Apostila do Mês — ${ano}\n\n${semana}\n\n${leitura}\nCântico 1 e oração | Comentários iniciais (1 min)\n\nTESOUROS DA PALAVRA DE DEUS\n\n${primeiras.join('\n\n')}\n\nFAÇA SEU MELHOR NO MINISTÉRIO\n\n${ministerio.join('\n\n')}\n\nNOSSA VIDA CRISTÃ\n\nCântico 44\n\n${vida.join('\n\n')}\n\nComentários finais (3 min) | Cântico 33 e oração\nCopyright © ${ano}`
}

const ministerioNovembro = [
    '4. Iniciando conversas\n\n(3 min) DE CASA EM CASA. Fale sobre uma verdade da Bíblia. Talvez você possa usar uma das que estão no apêndice A da brochura Ame as Pessoas. (lmd lição 1 ponto 5)',
    '5. Cultivando o interesse\n\n(4 min) DE CASA EM CASA. Você se preparou para falar de um assunto, mas a pessoa quer falar sobre um assunto diferente. (lmd lição 9 ponto 3)',
    '6. Fazendo discípulos\n\n(5 min) lff lição 20 ponto 4 (lmd lição 11 ponto 4)',
]
const vidaNovembro = [
    '7. Nunca se Esqueça do Que Jeová se Lembra\n\n(15 min) Consideração.\n\nMostre o VÍDEO. Depois, pergunte:\n\n- Que lições você aprendeu?\n\nSua resposta',
    '8. Estudo bíblico de congregação\n\n(30 min) wcg cap. 15',
]
const novembro = pagina('2-8 DE NOVEMBRO', 'JEREMIAS 49-50', ministerioNovembro, vidaNovembro)

test('texto do Ctrl+A: oito partes, instruções completas e exclusão do corpo', () => {
    const resultado = importarApostila(novembro, 3)
    assert.equal(resultado.dataReuniao, '2026-11-04')
    assert.equal(resultado.semanaDescricao, 'JEREMIAS 49-50')
    assert.equal(resultado.partes.length, 8)
    assert.equal(resultado.partes[0].nome, '1. Ajude outros a se beneficiar da misericórdia de Jeová (10 min)')
    assert.equal(resultado.partes[1].nome, '2. Joias espirituais (10 min)')
    assert.equal(resultado.partes[2].nome, '3. Leitura da Bíblia (4 min) Jer. 50:24-40 (th lição 11)')
    assert.equal(resultado.partes[3].nome, '4. Iniciando conversas (3 min) DE CASA EM CASA. Fale sobre uma verdade da Bíblia. Talvez você possa usar uma das que estão no apêndice A da brochura Ame as Pessoas. (lmd lição 1 ponto 5)')
    assert.equal(resultado.partes[5].nome, '6. Fazendo discípulos (5 min) lff lição 20 ponto 4 (lmd lição 11 ponto 4)')
    assert.equal(resultado.partes[6].nome, '7. Nunca se Esqueça do Que Jeová se Lembra (15 min) Consideração.')
    assert.equal(resultado.partes[7].nome, '8. Estudo bíblico de congregação (30 min) wcg cap. 15')
    assert.equal(resultado.partes[6].tipo, 'VIDA_CRISTA')
    assert.equal(resultado.partes[6].tempo, 15)
})

test('Markdown, links adjacentes, 9 partes e instrução encerrada na referência', () => {
    const ministerio = [
        '### **4. Iniciando conversas**\n\n(2 min) DE CASA EM CASA. ([*lmd*](https://wol.jw.org/ref)[ lição 2 ponto 3](https://wol.jw.org/ref))',
        '### **5. Iniciando conversas**\n\n(2 min) TESTEMUNHO INFORMAL. (lmd lição 2 ponto 5)',
        '### **6. O que você diria?**\n\n(6 min) Consideração. DE CASA EM CASA. Faça um resumo da lmd lição 1 ponto 4. (lmd lição 1 ponto 4). Mostre a imagem. Depois, pergunte:',
        '### **7. Explicando suas crenças**\n\n(3 min) Demonstração. ijwbq artigo 103 — Tema: Quem é Jeová e por que seu nome é importante? (th lição 17)',
    ]
    const vida = ['### **8. Jeová é o Protetor das viúvas**\n\n(15 min) Consideração.\n\nO rei Davi disse que Jeová é protetor das viúvas.', '### **9. Estudo bíblico de congregação**\n\n(30 min) wcg cap. 11']
    const texto = pagina('5-11 DE OUTUBRO', '## [**JEREMIAS 40-41**](https://wol.jw.org/ref)', ministerio, vida)
    const resultado = importarApostila(texto, 3)
    assert.equal(resultado.dataReuniao, '2026-10-07')
    assert.equal(resultado.partes.length, 9)
    assert.equal(resultado.partes[3].nome, '4. Iniciando conversas (2 min) DE CASA EM CASA. (lmd lição 2 ponto 3)')
    assert.ok(resultado.partes[5].nome.endsWith('(lmd lição 1 ponto 4)'))
    assert.ok(!resultado.partes[5].nome.includes('Mostre a imagem'))
    assert.equal(resultado.partes[6].tipo, 'MINISTERIO')
    assert.equal(resultado.partes[7].tipo, 'VIDA_CRISTA')
})

test('três partes de Vida Cristã e número variável de partes do Ministério', () => {
    const ministerio = [...ministerioNovembro, '7. Fazendo discípulos\n\n(4 min) Converse com um estudante da Bíblia. (th lição 11)']
    const vida = [
        '8. O autodomínio nos ajuda a obedecer\n\n(6 min) Consideração.\n\nPensamentos negativos podem enfraquecer nossa determinação.',
        '9. Realizações da Organização, setembro\n\n(9 min) Consideração.\n\n- Mostre o VÍDEO. Depois, faça as perguntas.',
        '10. Estudo bíblico de congregação\n\n(30 min) wcg cap. 8',
    ]
    const resultado = importarApostila(pagina('14-20 de setembro', 'JEREMIAS 34-35', ministerio, vida), 3)
    assert.equal(resultado.dataReuniao, '2026-09-16')
    assert.equal(resultado.partes.length, 10)
    assert.equal(resultado.partes.filter(parte => parte.tipo === 'VIDA_CRISTA').length, 3)
    assert.equal(resultado.partes[8].nome, '9. Realizações da Organização, setembro (9 min) Consideração.')
    assert.equal(resultado.partes[9].nome, '10. Estudo bíblico de congregação (30 min) wcg cap. 8')
})

test('usa o dia configurado inclusive domingo, sem depender do fuso horário', () => {
    for (const [dia, data] of [[1, '2026-11-02'], [3, '2026-11-04'], [6, '2026-11-07'], [0, '2026-11-08']]) {
        assert.equal(importarApostila(novembro, dia).dataReuniao, data)
    }
    assert.throws(() => importarApostila(novembro, null), /Cadastre o dia/)
    assert.throws(() => importarApostila(novembro, 7), /Cadastre o dia/)
})

test('semana entre meses e virada do ano', () => {
    assert.equal(importarApostila(pagina('28 de setembro–4 de outubro', 'JEREMIAS 38-39', ministerioNovembro, vidaNovembro), 3).dataReuniao, '2026-09-30')
    assert.equal(importarApostila(pagina('28 de dezembro–3 de janeiro', 'JEREMIAS 51', ministerioNovembro, vidaNovembro), 0).dataReuniao, '2027-01-03')
    assert.equal(importarApostila(pagina('28 de dezembro–3 de janeiro', 'JEREMIAS 51', ministerioNovembro, vidaNovembro, 2027), 3).dataReuniao, '2026-12-30')
})

test('ano ausente exige informação explícita; cópia incompleta não gera programação', () => {
    const semAno = novembro.replaceAll('2026', '')
    assert.throws(() => importarApostila(semAno, 3), /ano da apostila/)
    assert.equal(importarApostila(semAno, 3, 2026).dataReuniao, '2026-11-04')
    assert.throws(() => importarApostila(novembro, 3, 2025), /segunda a domingo/)
    assert.throws(() => importarApostila(novembro.replace('5. Cultivando o interesse', '11. Cultivando o interesse'), 3), /numeração/)
    assert.throws(() => importarApostila(novembro.split('NOSSA VIDA CRISTÃ')[0], 3), /incompleta/)
    assert.throws(() => importarApostila(novembro.replace('(5 min)', ''), 3), /tempo em minutos/)
    assert.throws(() => importarApostila(novembro.replace('(5 min) lff lição 20 ponto 4 (lmd lição 11 ponto 4)', '(5 min)'), 3), /instrução.*incompleta/)
})

test('a Vida Cristã segue a seção mesmo quando começa na parte 12', () => {
    const ministerio = Array.from({ length: 8 }, (_, index) => `${index + 4}. Iniciando conversas\n\n(3 min) DE CASA EM CASA. (lmd lição 1 ponto 5)`)
    const vida = vidaNovembro.map((texto, index) => texto.replace(/^\d+\./, `${index + 12}.`))
    const resultado = importarApostila(pagina('2-8 de novembro', 'JEREMIAS 49-50', ministerio, vida), 3)
    assert.equal(resultado.partes.length, 13)
    assert.equal(resultado.partes[10].tipo, 'MINISTERIO')
    assert.equal(resultado.partes[11].tipo, 'VIDA_CRISTA')
    assert.ok(resultado.partes[11].nome.startsWith('12. Nunca'))
})
