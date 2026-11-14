'use client'

import { useEffect, useRef, useState } from 'react'
import { LocateFixed, RotateCcw } from 'lucide-react'
import type { ConfiguracaoMapaGoogle } from './EditorMapaGoogle'

type Props = {
    value: ConfiguracaoMapaGoogle
    visible: boolean
    visitas: number[]
    onQuadraClick: (quadraId: number) => void
}

declare global {
    interface Window {
        google?: any
        __territorioVisualizarGoogleMapsCallback?: () => void
    }
}

let googleMapsViewPromise: Promise<any> | null = null

function loadGoogleMaps(): Promise<any> {
    if (window.google?.maps?.Map) return Promise.resolve(window.google.maps)
    if (googleMapsViewPromise) return googleMapsViewPromise

    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) return Promise.reject(new Error('A chave do Google Maps não está configurada.'))

    googleMapsViewPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=maps&callback=__territorioVisualizarGoogleMapsCallback&v=weekly&language=pt-BR&region=BR`
        script.async = true
        script.onerror = () => reject(new Error('Não foi possível carregar o Google Maps.'))
        window.__territorioVisualizarGoogleMapsCallback = () => {
            delete window.__territorioVisualizarGoogleMapsCallback
            if (window.google?.maps?.Map) resolve(window.google.maps)
            else reject(new Error('O Google Maps não ficou disponível. Confira a chave e as APIs habilitadas.'))
        }
        document.head.appendChild(script)
    })
    googleMapsViewPromise.catch(() => { googleMapsViewPromise = null })
    return googleMapsViewPromise
}

export default function MapaTerritorioGoogle({ value, visible, visitas, onQuadraClick }: Props) {
    const elementRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<any>(null)
    const shapesRef = useRef<any[]>([])
    const locationMarkerRef = useRef<any>(null)
    const [ready, setReady] = useState(false)
    const [error, setError] = useState('')
    const [locating, setLocating] = useState(false)

    const zoomTerritorio = Math.min(value.zoom || 15, 15)

    useEffect(() => {
        let active = true
        loadGoogleMaps().then((maps) => {
            if (!active || !elementRef.current || mapRef.current) return
            const map = new maps.Map(elementRef.current, {
                center: value.centro,
                zoom: zoomTerritorio,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                clickableIcons: false,
                gestureHandling: 'greedy',
            })
            mapRef.current = map
            setReady(true)
        }).catch((reason: Error) => setError(reason.message))
        return () => { active = false }
    }, [value.centro, zoomTerritorio])

    useEffect(() => {
        const map = mapRef.current
        const maps = window.google?.maps
        if (!ready || !map || !maps) return

        shapesRef.current.forEach((shape) => shape.setMap(null))
        shapesRef.current = []

        if (value.limite.length >= 3) {
            shapesRef.current.push(new maps.Polygon({
                paths: value.limite,
                map,
                clickable: false,
                strokeColor: '#fbbf24',
                strokeOpacity: 0.42,
                strokeWeight: 10,
                fillOpacity: 0,
                zIndex: 3,
            }))
            shapesRef.current.push(new maps.Polygon({
                paths: value.limite,
                map,
                clickable: false,
                strokeColor: '#f59e0b',
                strokeOpacity: 1,
                strokeWeight: 3,
                fillOpacity: 0,
                zIndex: 4,
            }))
        }

        value.quadras.forEach((quadra) => {
            if (quadra.caminho.length < 3) return
            const isDone = visitas.includes(quadra.id)
            const color = isDone ? '#16a34a' : '#2563eb'
            const polygon = new maps.Polygon({
                paths: quadra.caminho,
                map,
                clickable: true,
                strokeColor: color,
                strokeOpacity: 1,
                strokeWeight: 1,
                fillColor: color,
                fillOpacity: isDone ? 0.4 : 0.22,
                zIndex: 2,
            })
            polygon.addListener('click', () => onQuadraClick(quadra.id))
            shapesRef.current.push(polygon)

            const center = quadra.caminho.reduce((acc, point) => ({
                lat: acc.lat + point.lat / quadra.caminho.length,
                lng: acc.lng + point.lng / quadra.caminho.length,
            }), { lat: 0, lng: 0 })
            const marker = new maps.Marker({
                position: center,
                map,
                clickable: true,
                label: { text: String(quadra.id), color: '#ffffff', fontWeight: '700' },
                icon: {
                    path: maps.SymbolPath.CIRCLE,
                    scale: 14,
                    fillColor: color,
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                },
                title: `Quadra ${quadra.id} · ${isDone ? 'feita' : 'pendente'}`,
                zIndex: 3,
            })
            marker.addListener('click', () => onQuadraClick(quadra.id))
            shapesRef.current.push(marker)
        })
    }, [ready, value, visitas, onQuadraClick])

    useEffect(() => {
        const map = mapRef.current
        const maps = window.google?.maps
        if (!visible || !ready || !map || !maps) return
            const center = map.getCenter()
        maps.event.trigger(map, 'resize')
        if (center) map.setCenter(value.centro)
        map.setZoom(zoomTerritorio)
    }, [visible, ready, value.centro, zoomTerritorio])

    const locateMe = () => {
        if (!navigator.geolocation) {
            setError('Este aparelho ou navegador não oferece localização.')
            return
        }
        setLocating(true)
        navigator.geolocation.getCurrentPosition((position) => {
            const location = { lat: position.coords.latitude, lng: position.coords.longitude }
            const maps = window.google?.maps
            const map = mapRef.current
            if (maps && map) {
                map.panTo(location)
                map.setZoom(Math.max(map.getZoom() || value.zoom, 17))
                if (!locationMarkerRef.current) {
                    locationMarkerRef.current = new maps.Marker({
                        position: location,
                        map,
                        title: 'Sua localização atual',
                        icon: {
                            path: maps.SymbolPath.CIRCLE,
                            scale: 9,
                            fillColor: '#0284c7',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 3,
                        },
                        zIndex: 1000,
                    })
                } else {
                    locationMarkerRef.current.setPosition(location)
                }
            }
            setLocating(false)
        }, (reason) => {
            setError(reason.code === reason.PERMISSION_DENIED
                ? 'Permita o acesso à localização no navegador para mostrar sua posição.'
                : 'Não foi possível obter sua localização. Confira se o GPS está ativo e tente novamente.')
            setLocating(false)
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 })
    }

    const recenter = () => {
        const map = mapRef.current
        if (!map) return
        map.panTo(value.centro)
        map.setZoom(zoomTerritorio)
    }

    return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-blue-600" />Pendente</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-green-600" />Feita</span>
            </div>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={locateMe} disabled={locating || !ready} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    <LocateFixed size={16} />{locating ? 'Localizando…' : 'Minha localização'}
                </button>
                <button type="button" onClick={recenter} disabled={!ready} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                    <RotateCcw size={16} />Recentralizar
                </button>
            </div>
        </div>
        {error ? <p role="alert" className="px-3 pb-3 text-sm text-rose-600">{error}</p> : null}
        <div className="relative w-full overflow-hidden bg-slate-100" style={{ height: 320 }}>
            <div ref={elementRef} className="absolute inset-0" aria-label="Mapa do território" />
        </div>
        <p className="p-3 text-xs text-slate-500">Toque numa quadra para marcar ou desmarcar como feita. O botão Minha localização mostra sua posição no mapa.</p>
    </section>
}
