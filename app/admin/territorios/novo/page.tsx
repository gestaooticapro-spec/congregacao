'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import MapaInterativo from '@/components/territorios/MapaInterativo'
import { createTerritory } from '@/app/actions/territorios.actions'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import { RotateCcw, Save } from 'lucide-react'

type Quadra = {
    id: number
    x: number
    y: number
}

export default function NovoTerritorioPage() {
    const [nome, setNome] = useState('')
    const [referencia, setReferencia] = useState('')
    const [imagem, setImagem] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [configuracao, setConfiguracao] = useState<Quadra[]>([])
    const router = useRouter()

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return

        const file = e.target.files[0]
        setImagem(file)
        setPreviewUrl(URL.createObjectURL(file))
    }

    const handleMapClick = (x: number, y: number) => {
        const nextId = configuracao.length + 1
        setConfiguracao([...configuracao, { id: nextId, x, y }])
    }

    const handleUndo = () => {
        setConfiguracao(configuracao.slice(0, -1))
    }

    const handleSubmit = async () => {
        if (!nome || !imagem || configuracao.length === 0) {
            alert('Preencha o nome, faça upload da imagem e marque pelo menos uma quadra.')
            return
        }

        setUploading(true)

        try {
            // Send File directly to Server Action
            const formData = new FormData()
            formData.append('nome', nome)
            formData.append('referencia', referencia)
            formData.append('imagem', imagem)
            formData.append('configuracao', JSON.stringify(configuracao))

            const result = await createTerritory(formData)

            if (result.error) {
                alert(result.error)
            } else {
                alert('Território criado com sucesso!')
                router.push('/admin/territorios')
            }
        } catch (error: any) {
            console.error('Error:', error)
            alert('Erro ao salvar território: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="w-full min-w-0 pb-24 print:max-w-none print:p-0">
            <PageHeader
                className="mb-12"
                title="Novo Território"
                backHref="/admin/territorios"
                backLabel="Territórios"
            />

            <div className="space-y-6">
                {/* Nome */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Território
                    </label>
                    <input
                        type="text"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        placeholder="Ex: Território 01 - Centro"
                    />
                </div>

                {/* Referência */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Referência (Opcional)
                    </label>
                    <input
                        type="text"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        placeholder="Ex: Próximo à padaria..."
                    />
                </div>

                {/* Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mapa (Imagem)
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
                    />
                </div>

                {/* Editor */}
                {previewUrl && (
                    <div className="border p-4 rounded-lg bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg">Mapeamento de Quadras</h3>
                            <div className="space-x-2">
                                <span className="text-sm text-gray-500">
                                    Clique no mapa para adicionar a quadra {configuracao.length + 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleUndo}
                                    disabled={configuracao.length === 0}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Desfazer Último
                                </button>
                            </div>
                        </div>

                        <MapaInterativo
                            imageUrl={previewUrl}
                            configuracao={configuracao}
                            mode="admin"
                            onAdminClick={handleMapClick}
                        />

                        <div className="mt-4 p-2 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
                            {JSON.stringify(configuracao, null, 2)}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={uploading}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-blue-700 transition-all shadow-md font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {uploading ? 'Salvando...' : 'Salvar Território'}
                    </button>
                </div>
            </div>
        </div>
    )
}
