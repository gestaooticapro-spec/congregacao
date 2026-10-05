'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'

type MonthOption = {
    value: string
    label: string
}

export default function MonthSelect({
    value,
    options,
    onChange,
}: {
    value: string
    options: MonthOption[]
    onChange: (value: string) => void
}) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const selected = options.find(option => option.value === value)

    useEffect(() => {
        const onPointerDown = (event: PointerEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [])

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen(current => !current)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900"
            >
                <Calendar className="h-5 w-5 text-gray-500 dark:text-slate-300" />
                <span className="text-sm font-medium capitalize text-slate-900 dark:text-white">
                    {selected?.label}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <ul
                    role="listbox"
                    className="absolute right-0 z-50 mt-2 min-w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
                >
                    {options.map(option => {
                        const isSelected = option.value === value
                        return (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        onChange(option.value)
                                        setOpen(false)
                                    }}
                                    className={`w-full whitespace-nowrap px-4 py-2 text-left text-sm capitalize ${
                                        isSelected
                                            ? 'bg-blue-50 font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-100'
                                            : 'text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
