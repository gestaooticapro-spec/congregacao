'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabaseClient'
import MapaInterativo from '@/components/territorios/MapaInterativo'
import { getTerritory, updateTerritory } from '@/app/actions/territorios.actions'
import { useRouter } from 'next/navigation'

type Quadra = {
    id: number
    x: number
    y: number
}

export default function EditarTerritorioPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()

    const [nome, setNome] = useState('')
    const [referencia, setReferencia] = useState('')
    const [imagem, setImagem] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [configuracao, setConfiguracao] = useState<Quadra[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadTerritory()
    }, [id])

    const loadTerritory = async () => {
        const res = await getTerritory(id)
        if (res.error) {
            alert(res.error)
            router.push('/admin/territorios')
            return
        }
        const t = res.territorio
        if (!t) {
            alert('Território não encontrado')
            router.push('/admin/territorios')
            return
        }
        setNome(t.nome)
        setReferencia(t.referencia || '')
        setOriginalImageUrl(t.imagem_url)
        setPreviewUrl(t.imagem_url)
        setConfiguracao((t.configuracao as any) || [])
        setLoading(false)
    }

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
        if (!nome || !previewUrl || configuracao.length === 0) {
            alert('Preencha o nome e verifique a configuração.')
            return
        }

        setUploading(true)

        try {
            const formData = new FormData()
            formData.append('id', id)
            formData.append('nome', nome)
            formData.append('referencia', referencia)
            if (imagem) {
                formData.append('imagem', imagem)
            }
            if (originalImageUrl) {
                formData.append('imagem_url_original', originalImageUrl)
            }
            formData.append('configuracao', JSON.stringify(configuracao))

            const result = await updateTerritory(formData)

            if (result.error) {
                alert(result.error)
            } else {
                alert('Território atualizado com sucesso!')
                router.push('/admin/territorios')
            }
        } catch (error: any) {
            console.error('Error:', error)
            alert('Erro ao atualizar: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Carregando...</div>

    return (
        <div className="container mx-auto p-4 max-w-4xl">
            <h1 className="text-2xl font-bold mb-6">Editar Território</h1>

            <div className="space-y-6">
                {/* Nome */}
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
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
                        Alterar Mapa (Opcional)
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
                                    onClick={handleUndo}
                                    disabled={configuracao.length === 0}
                                    className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 disabled:opacity-50"
                                >
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
                <div className="flex justify-end pt-4 space-x-3">
                    <button
                        onClick={() => router.push('/admin/territorios')}
                        className="px-6 py-2 bg-white border border-gray-300 text-gray-900 rounded-md hover:bg-gray-200"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={uploading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                        {uploading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    )
}
