'use client'

import { useEffect, useState } from 'react'
import { MapPin, MessageCircle, Users } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'

const roteiro = [
    { data: '20/09/26', dia: 'Domingo', nome: 'Keila' },
    { data: '21/09/26', dia: 'Segunda-feira', nome: 'Helaine' },
    { data: '22/09/26', dia: 'Terça-feira', nome: 'Adriana Tajiri' },
    { data: '23/09/26', dia: 'Quarta-feira', nome: 'Nadia' },
    { data: '24/09/26', dia: 'Quinta-feira', nome: 'Claudete' },
    { data: '25/09/26', dia: 'Sexta-feira', nome: 'Celoir' },
    { data: '26/09/26', dia: 'Sábado', nome: 'Daiane' },
]

type Membro = { nome_completo: string; contato: string | null; endereco: string | null }

function normalizar(nome: string) {
    return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function whatsappUrl(contato: string | null) {
    const digits = (contato || '').replace(/\D/g, '')
    if (!digits) return null
    const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits
    return `https://wa.me/${phone}`
}

export default function LaurinhaPage() {
    const [membros, setMembros] = useState<Membro[]>([])

    useEffect(() => {
        const carregar = async () => {
            const { data } = await supabase
                .from('membros')
                .select('nome_completo, contato, endereco')
                .eq('ativo', true)
            setMembros(data || [])
        }
        carregar()
    }, [])

    const membroDoRoteiro = (nome: string) => {
        const alvo = normalizar(nome)
        const partes = alvo.split(/\s+/).filter(Boolean)

        return membros
            .map(membro => {
            const cadastrado = normalizar(membro.nome_completo)
            const palavras = cadastrado.split(/\s+/).filter(Boolean)
            let pontuacao = 0

            if (cadastrado === alvo) pontuacao = 100
            else if (partes.every(parte => palavras.includes(parte))) pontuacao = 90
            else if (palavras[0] === partes[0]) pontuacao = 70
            else if (cadastrado.includes(alvo)) pontuacao = 50

            return { membro, pontuacao }
        })
            .filter(resultado => resultado.pontuacao > 0)
            .sort((a, b) => b.pontuacao - a.pontuacao)[0]?.membro
    }

    return (
        <main className="min-h-screen bg-[#f6f8fb] px-4 py-6 text-slate-900 sm:px-6">
            <div className="mx-auto max-w-xl">
                <header className="mb-6 rounded-3xl bg-slate-900 px-5 py-6 text-white shadow-lg">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-900">
                        <Users size={23} strokeWidth={2.5} />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Roteiro pra cuidados</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight">Laurinha</h1>
                    <p className="mt-2 text-sm text-slate-300">20 a 26 de setembro de 2026</p>
                </header>

                <section className="space-y-3" aria-label="Roteiro da Laurinha">
                    {roteiro.map((item, index) => {
                        const membro = membroDoRoteiro(item.nome)
                        const whatsapp = whatsappUrl(membro?.contato || null)
                        const endereco = membro?.endereco?.trim()
                        const maps = endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}` : null

                        return (
                            <article key={item.nome} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-12 min-w-12 flex-col items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                                        <span className="text-[10px] font-bold uppercase">{item.dia.slice(0, 3)}</span>
                                        <span className="text-xl font-black leading-5">{item.data.slice(0, 2)}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.data} · {item.dia}</p>
                                        <h2 className="mt-1 text-lg font-bold text-slate-900">{item.nome}</h2>
                                    </div>
                                    <span className="text-xs font-bold text-slate-300">{String(index + 1).padStart(2, '0')}</span>
                                </div>
                                {endereco ? (
                                    <p className="mt-3 flex items-start gap-1.5 text-sm leading-relaxed text-slate-600">
                                        <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                                        <span className="break-words">{endereco}</span>
                                    </p>
                                ) : (
                                    <p className="mt-3 text-sm text-slate-400">Endereço não cadastrado</p>
                                )}
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                    <a href={whatsapp || undefined} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold ${whatsapp ? 'bg-emerald-50 text-emerald-700' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`} aria-disabled={!whatsapp}>
                                        <MessageCircle size={17} /> WhatsApp
                                    </a>
                                    <a href={maps || undefined} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold ${maps ? 'bg-blue-50 text-blue-700' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`} aria-disabled={!maps}>
                                        <MapPin size={17} /> Endereço
                                    </a>
                                </div>
                                {!membro && <p className="mt-2 text-center text-xs text-amber-600">Membro não localizado no cadastro</p>}
                            </article>
                        )
                    })}
                </section>
                <p className="py-6 text-center text-xs text-slate-400">Toque nos botões para abrir o WhatsApp ou o Google Maps.</p>
            </div>
        </main>
    )
}
