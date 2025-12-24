'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

type Quadra = {
    id: number
    x: number
    y: number
}

type Props = {
    imageUrl: string
    configuracao: Quadra[]
    mode: 'admin' | 'user'
    visitas?: number[] // Array of quadra IDs that are visited
    onQuadraClick?: (quadraId: number) => void
    onAdminClick?: (x: number, y: number) => void
}

export default function MapaInterativo({
    imageUrl,
    configuracao,
    mode,
    visitas = [],
    onQuadraClick,
    onAdminClick,
}: Props) {
    const imageRef = useRef<HTMLDivElement>(null)
    const [loaded, setLoaded] = useState(false)

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (mode !== 'admin' || !onAdminClick || !imageRef.current) return

        const rect = imageRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100

        onAdminClick(x, y)
    }

    return (
        <div className="relative w-full overflow-hidden rounded-lg shadow-md bg-gray-100">
            <div
                ref={imageRef}
                className="relative w-full"
                onClick={handleImageClick}
                style={{ cursor: mode === 'admin' ? 'crosshair' : 'default' }}
            >
                {/* Image Container */}
                <div className="relative w-full h-0 pb-[100%] md:pb-[75%] lg:pb-[56.25%]">
                    <img
                        src={imageUrl}
                        alt="Mapa do Território"
                        className="absolute top-0 left-0 w-full h-full object-contain"
                        onLoad={() => setLoaded(true)}
                    />
                </div>

                {/* Quadras / Pins */}
                {loaded &&
                    configuracao.map((quadra) => {
                        const isVisited = visitas.includes(quadra.id)

                        return (
                            <div
                                key={quadra.id}
                                className="absolute flex items-center justify-center z-10"
                                style={{
                                    top: `${quadra.y}%`,
                                    left: `${quadra.x}%`,
                                    width: '32px',
                                    height: '32px',
                                    // For user mode:
                                    // - If Visited (Pin): Shift so the "tip" is at the coordinate (translate -10%, -90%)
                                    // - If Unvisited (Target): Center it so the user clicks the point (translate -50%, -50%)
                                    // For admin mode: Center it.
                                    transform: mode === 'user'
                                        ? (isVisited ? 'translate(-10%, -90%)' : 'translate(-50%, -50%)')
                                        : 'translate(-50%, -50%)'
                                }}
                            >
                                {mode === 'user' ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onQuadraClick?.(quadra.id)
                                        }}
                                        className={`w-full h-full rounded-full flex items-center justify-center transition-all duration-200 ${isVisited
                                            ? 'bg-transparent' // Pin is visible, button background transparent
                                            : 'bg-white/50 hover:bg-white/70 border-2 border-dashed border-red-500 shadow-sm' // Improved visibility
                                            }`}
                                        aria-label={`Quadra ${quadra.id}`}
                                    >
                                        {isVisited && (
                                            <span className="text-2xl filter drop-shadow-md animate-bounce-short">
                                                📌
                                            </span>
                                        )}
                                    </button>
                                ) : (
                                    // Admin Marker
                                    <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xs text-white font-bold">
                                        {quadra.id}
                                    </div>
                                )}
                            </div>
                        )
                    })}
            </div>
        </div>
    )
}
