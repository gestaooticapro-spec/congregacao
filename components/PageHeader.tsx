import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

type PageHeaderProps = {
    title: ReactNode
    subtitle?: ReactNode
    backHref?: string
    backLabel?: string
    actions?: React.ReactNode
    className?: string
}

export default function PageHeader({
    title,
    subtitle,
    backHref,
    backLabel = 'Voltar',
    actions,
    className = '',
}: PageHeaderProps) {
    return (
        <div className={`mb-8 print:hidden ${className}`.trim()}>
            {backHref && (
                <Link
                    href={backHref}
                    aria-label={backLabel || 'Voltar'}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    {backLabel ? <span>{backLabel}</span> : null}
                </Link>
            )}
            <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                    {title}
                </h1>
                <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
                {subtitle ? (
                    <p className="mt-4 text-slate-600 dark:text-slate-400">
                        {subtitle}
                    </p>
                ) : null}
            </div>
            {actions ? (
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                    {actions}
                </div>
            ) : null}
        </div>
    )
}
