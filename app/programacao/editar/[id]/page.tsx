'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useParams, useRouter } from 'next/navigation'
import { Database } from '@/types/database.types'
import ProgramacaoForm from '@/components/programacao/ProgramacaoForm'

type Programacao = Database['public']['Tables']['programacao_semanal']['Row']

export default function EditarProgramacaoPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [programacao, setProgramacao] = useState<Programacao | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            fetchProgramacao()
        }
    }, [id])

    const fetchProgramacao = async () => {
        try {
            const { data, error } = await supabase
                .from('programacao_semanal')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            setProgramacao(data)
        } catch (error) {
            console.error('Erro ao carregar programação:', error)
            alert('Erro ao carregar programação.')
            router.push('/programacao')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>
    if (!programacao) return <div className="p-8">Programação não encontrada.</div>

    return <ProgramacaoForm initialData={programacao} isEditing={true} />
}
