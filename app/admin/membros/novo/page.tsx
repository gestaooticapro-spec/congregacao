import FormularioNovoMembro from '@/components/admin/membros/FormularioNovoMembro'

export const dynamic = 'force-dynamic';

export default function NovoMembroPage() {
    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Novo Membro</h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            </div>

            <FormularioNovoMembro />
        </div>
    )
}
