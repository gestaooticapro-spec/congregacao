'use client'

import { useState, useEffect } from 'react'
import { getTerritoryReport } from '@/app/actions/territorios.actions'
import Link from 'next/link'

export default function RelatorioTerritoriosPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Default to 3 years ago -> today
    const today = new Date()
    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(today.getFullYear() - 3)

    const [startDate, setStartDate] = useState(threeYearsAgo.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(today.toISOString().split('T')[0])

    useEffect(() => {
        loadReport()
    }, [])

    const loadReport = async () => {
        setLoading(true)
        const res = await getTerritoryReport(startDate, endDate)
        if (res.error) {
            alert(res.error)
        } else {
            setData(res.data || [])
        }
        setLoading(false)
    }

    const handlePrint = () => {
        window.print()
    }

    const [printDate, setPrintDate] = useState('')

    useEffect(() => {
        setPrintDate(new Date().toLocaleString('pt-BR'))
    }, [])

    return (
        <div className="container mx-auto p-8 max-w-5xl bg-white min-h-screen">
            {/* Header / Controls - Hidden on Print */}
            <div className="print:hidden mb-8">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/territorios" className="text-gray-600 hover:text-gray-900">
                            ← Voltar
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Relatório de Conclusão de Territórios</h1>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="p-2 border rounded-md text-gray-900 bg-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="p-2 border rounded-md text-gray-900 bg-white"
                        />
                    </div>
                    <button
                        onClick={loadReport}
                        className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900"
                    >
                        Filtrar
                    </button>
                </div>
            </div>

            {/* Printable Report Area */}
            <div className="print:w-full text-black">
                <div className="hidden print:block mb-6 text-center">
                    <h1 className="text-2xl font-bold text-black">Relatório de Territórios</h1>
                    <p className="text-sm text-gray-600">
                        Período: {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}
                    </p>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-600">Carregando dados...</div>
                ) : (
                    <table className="w-full border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b-2 border-gray-800">
                                <th className="py-2 font-bold w-1/3 text-gray-900">Território</th>
                                <th className="py-2 font-bold text-center text-gray-900">Última Conclusão</th>
                                <th className="py-2 font-bold text-center text-gray-900">Penúltima</th>
                                <th className="py-2 font-bold text-center text-gray-900">Antepenúltima</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((t, index) => (
                                <tr key={t.id} className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50 print:bg-transparent' : ''}`}>
                                    <td className="py-3 pr-4">
                                        <div className="font-semibold text-gray-900">{t.nome}</div>
                                        {t.referencia && (
                                            <div className="text-xs text-gray-500">{t.referencia}</div>
                                        )}
                                    </td>
                                    <td className="py-3 text-center text-gray-900 font-medium">{t.conclusoes[0] || <span className="text-gray-300">________</span>}</td>
                                    <td className="py-3 text-center text-gray-900 font-medium">{t.conclusoes[1] || <span className="text-gray-300">________</span>}</td>
                                    <td className="py-3 text-center text-gray-900 font-medium">{t.conclusoes[2] || <span className="text-gray-300">________</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <div className="hidden print:block mt-8 text-xs text-gray-400 text-center">
                    Impresso em {printDate}
                </div>
            </div>
        </div>
    )
}
