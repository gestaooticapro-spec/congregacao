'use client'

import React, { useState, useEffect } from 'react'
import { getTerritoryReport } from '@/app/actions/territorios.actions'
import Link from 'next/link'

export default function RelatorioTerritoriosPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Default to current service year
    // If today is >= Sept 1, current service year is Next Year.
    // If today is < Sept 1, current service year is Current Year.
    const today = new Date()
    const currentYear = today.getFullYear()
    const initialServiceYear = today.getMonth() >= 8 ? currentYear + 1 : currentYear

    const [serviceYear, setServiceYear] = useState(initialServiceYear)

    useEffect(() => {
        loadReport()
    }, [serviceYear])

    const loadReport = async () => {
        setLoading(true)
        const res = await getTerritoryReport(serviceYear)
        if (res.error) {
            alert(res.error)
        } else {
            setData(res.data || [])
        }
        setLoading(false)
    }

    const handlePrint = () => {
        setTimeout(() => window.print(), 100)
    }

    // Helper to chunk array
    const chunkArray = (arr: any[], size: number) => {
        const chunks = []
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size))
        }
        return chunks
    }

    // Split data into pages of 25 items (reduced from 26 for better margins)
    const pages = chunkArray(data, 25)

    return (
        <div className="container mx-auto p-8 max-w-[1400px] bg-white min-h-screen print:p-0 print:m-0 print:max-w-none">
            {/* Header / Controls - Hidden on Print */}
            <div className="print:hidden mb-8">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/territorios" className="text-gray-600 hover:text-gray-900">
                            ← Voltar
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Registro de Designação de Território</h1>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        🖨️ Imprimir
                    </button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg flex flex-wrap gap-4 items-end border">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ano de Serviço</label>
                        <select
                            value={serviceYear}
                            onChange={(e) => setServiceYear(Number(e.target.value))}
                            className="p-2 border rounded-md text-gray-900 bg-white min-w-[120px]"
                        >
                            {Array.from({ length: 5 }, (_, i) => initialServiceYear - 2 + i).map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={loadReport}
                        className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900"
                    >
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Printable Report Area */}
            <div className="print:w-full text-black font-sans print:text-[10px]">
                <style jsx global>{`
                    @media print {
                        @page {
                            size: A4;
                            margin: 0;
                        }
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                `}</style>

                {loading ? (
                    <div className="text-center py-12 text-gray-600">Carregando dados...</div>
                ) : (
                    <div>
                        {pages.map((pageData, pageIndex) => (
                            <div
                                key={pageIndex}
                                className="relative flex flex-col"
                                style={{
                                    height: '270mm', // Reduced to 270mm to be absolutely safe
                                    padding: '20mm 10mm',
                                    boxSizing: 'border-box',
                                    overflow: 'hidden', // Clip content that overflows
                                    pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto'
                                }}
                            >
                                {/* Header for this page */}
                                <div className="mb-4">
                                    <h1 className="text-lg font-bold text-black uppercase mb-1 text-center">Registro de Designação de Território</h1>
                                    <div className="text-left font-bold text-sm">
                                        Ano de Serviço: <span className="underline decoration-2 underline-offset-4">{serviceYear}</span>
                                    </div>
                                </div>

                                {/* Table for this page */}
                                <div className="flex-grow">
                                    <table className="w-full border-collapse text-center text-[10px]">
                                        <thead>
                                            <tr className="bg-gray-100 print:bg-gray-100">
                                                <th className="border border-black py-1 px-1 w-12" rowSpan={2}>Terr. n.º</th>
                                                <th className="border border-black py-1 px-1 w-40" rowSpan={2}>Última data concluída*</th>
                                                {[1, 2, 3, 4].map(i => (
                                                    <th key={i} className="border border-black py-0.5 px-1" colSpan={2}>Designado para</th>
                                                ))}
                                            </tr>
                                            <tr className="bg-gray-100 print:bg-gray-100">
                                                {[1, 2, 3, 4].map(i => (
                                                    <React.Fragment key={i}>
                                                        <th className="border border-black py-0.5 px-1 w-16 text-[9px]">Data da designação</th>
                                                        <th className="border border-black py-0.5 px-1 w-16 text-[9px]">Data da conclusão</th>
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pageData.map((t) => {
                                                const { number, name } = (() => {
                                                    // Try to split by " - " first (Standard format: "01 - Name")
                                                    const parts = t.nome.split(' - ')
                                                    if (parts.length > 1 && /^\d+$/.test(parts[0])) {
                                                        return {
                                                            number: parts[0],
                                                            name: parts.slice(1).join(' - ')
                                                        }
                                                    }
                                                    // Fallback: Regex for "Number - Name"
                                                    const match = t.nome.match(/^(\d+)\s*[-–]\s*(.*)/)
                                                    if (match) {
                                                        return { number: match[1], name: match[2] }
                                                    }
                                                    // Fallback: Use full name if no pattern matches
                                                    return {
                                                        number: t.nome.replace(/\D/g, ''), // Keep old behavior as last resort but be careful
                                                        name: t.nome
                                                    }
                                                })()

                                                return (
                                                    <React.Fragment key={t.id}>
                                                        <tr className="h-4 border-b border-black">
                                                            {/* Territory Number */}
                                                            <td className="border border-black px-1 font-bold" rowSpan={2}>{number}</td>

                                                            {/* Territory Name */}
                                                            <td className="border border-black px-1 text-left" rowSpan={2}>
                                                                <div className="font-semibold truncate max-w-[150px]">{name}</div>
                                                                {t.referencia && <div className="text-[9px] truncate max-w-[150px]">{t.referencia}</div>}
                                                            </td>

                                                            {/* Slots - Names */}
                                                            {t.slots.map((slot: any, i: number) => (
                                                                <td key={`name-${i}`} className="border border-black px-0.5 font-semibold text-[9px] h-4 align-bottom bg-gray-50 print:bg-transparent" colSpan={2}>
                                                                    {slot ? slot.responsavel : ''}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        <tr className="h-4 border-b border-black">
                                                            {/* Slots - Dates */}
                                                            {t.slots.map((slot: any, i: number) => (
                                                                <React.Fragment key={`dates-${i}`}>
                                                                    <td className="border border-black px-0.5 text-[9px] h-4 align-top w-16">
                                                                        {slot ? slot.data_designacao : ''}
                                                                    </td>
                                                                    <td className="border border-black px-0.5 text-[9px] h-4 align-top w-16">
                                                                        {slot ? slot.data_conclusao : ''}
                                                                    </td>
                                                                </React.Fragment>
                                                            ))}
                                                        </tr>
                                                    </React.Fragment>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Page Number Footer */}
                                <div className="text-right text-[8px] text-gray-500 mt-2">
                                    Página {pageIndex + 1} de {pages.length}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
