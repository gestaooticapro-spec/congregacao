'use client'

import React from 'react'

interface RadialProgressProps {
    currentMinutes: number
    target: number
    label: string
    sublabel?: string
    colorClass?: string
    abonoMinutes?: number
}

const formatMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`
}

export default function RadialProgress({ currentMinutes, target, label, sublabel, colorClass = "text-blue-500", abonoMinutes = 0 }: RadialProgressProps) {
    const size = 110 // Reduzi um pouco o tamanho para caber melhor em celulares
    const strokeWidth = 8
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    
    const totalMinutes = currentMinutes + abonoMinutes
    const isApproximate = totalMinutes % 60 !== 0
    const displayedHours = Math.round(totalMinutes / 60)
    const safeTarget = target > 0 ? target : 1
    const totalPercent = Math.min(Math.max((totalMinutes / (safeTarget * 60)) * 100, 0), 100)
    const abonoPercent = Math.min(Math.max((abonoMinutes / (safeTarget * 60)) * 100, 0), 100)
    
    const mainOffset = circumference - (totalPercent / 100) * circumference
    const abonoOffset = circumference - (abonoPercent / 100) * circumference

    return (
        <div className="flex flex-col items-center justify-center p-1 w-full min-w-[140px]">
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                {/* Background Ring */}
                <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        className="text-slate-100 dark:text-slate-700"
                    />
                    
                    {/* Abono Ring */}
                    {abonoMinutes > 0 && (
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={abonoOffset}
                            className={`${colorClass} opacity-30 transition-all duration-1000 ease-in-out`}
                        />
                    )}

                    {/* Main Progress Ring */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={mainOffset}
                        strokeLinecap="round"
                        className={`${colorClass} transition-all duration-1000 ease-in-out`}
                    />
                </svg>

                {/* Inner Text */}
                <div className="absolute flex flex-col items-center justify-center text-center px-1">
                    <span className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                        {isApproximate ? '~' : ''}{displayedHours}<span className="text-[10px] font-medium text-slate-400 block -mt-1">/{target}h</span>
                    </span>
                </div>
            </div>
            <div className="mt-3 text-center">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">{label}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{formatMinutes(totalMinutes)}</p>
                {sublabel && <p className="text-[10px] text-slate-400 font-medium">{sublabel}</p>}
            </div>
        </div>
    )
}
