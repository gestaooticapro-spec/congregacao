'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, LocateFixed, Maximize2, Minimize2, RotateCcw } from 'lucide-react'

export type LatLng = { lat: number; lng: number }
export type QuadraGoogle = { id: number; caminho: LatLng[] }
export type ConfiguracaoMapaGoogle = {
    centro: LatLng
    zoom: number
    limite: LatLng[]
    quadras: QuadraGoogle[]
}

type Props = {
    value: ConfiguracaoMapaGoogle | null
    onChange: (value: ConfiguracaoMapaGoogle) => void
}

declare global {
    interface Window {
        google?: any
        __territorioGoogleMapsCallback?: () => void
    }
}

const CENTRO_GUAIRA = { lat: -24.08, lng: -54.26 }
let googleMapsPromise: Promise<{ maps: any; marker: any }> | null = null

function loadGoogleMaps(): Promise<{ maps: any; marker: any }> {
    if (window.google?.maps?.Map) return Promise.resolve({ maps: window.google.maps, marker: window.google.maps })
    if (googleMapsPromise) return googleMapsPromise
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key) return Promise.reject(new Error('Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no .env.local.'))

    googleMapsPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="true"]')
        if (existing) {
            reject(new Error('O script anterior do Google Maps ainda está na página. Recarregue a tela para carregar as bibliotecas necessárias.'))
            return
        }
        const script = document.createElement('script')
        script.dataset.googleMaps = 'true'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&libraries=maps,marker&callback=__territorioGoogleMapsCallback&v=weekly&language=pt-BR&region=BR`
        script.async = true
        script.onerror = () => reject(new Error('Falha ao carregar o Google Maps. Confira a chave e se a Maps JavaScript API está ativada.'))
        window.__territorioGoogleMapsCallback = () => {
            if (window.google?.maps?.Map) resolve({ maps: window.google.maps, marker: window.google.maps })
            else reject(new Error('O Google carregou o script, mas o mapa não ficou disponível. Confira a chave, a restrição de domínio e a Maps JavaScript API.'))
            delete window.__territorioGoogleMapsCallback
        }
        document.head.appendChild(script)
    })

    googleMapsPromise.catch(() => { googleMapsPromise = null })
    return googleMapsPromise
}

export default function EditorMapaGoogle({ value, onChange }: Props) {
    const sectionRef = useRef<HTMLElement>(null)
    const mapElement = useRef<HTMLDivElement>(null)
    const mapRef = useRef<any>(null)
    const projectionOverlayRef = useRef<any>(null)
    const previewRef = useRef<any>(null)
    const draftMarkersRef = useRef<any[]>([])
    const overlaysRef = useRef<any[]>([])
    const [ready, setReady] = useState(false)
    const [projectionReady, setProjectionReady] = useState(false)
    const [error, setError] = useState('')
    const [etapa, setEtapa] = useState<'limite' | 'quadras'>('limite')
    const [pontos, setPontos] = useState<LatLng[]>([])
    const [tracadoLivre, setTracadoLivre] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [centro, setCentro] = useState<LatLng>(value?.centro || CENTRO_GUAIRA)
    const [zoom, setZoom] = useState(value?.zoom || 15)
    const currentValue = useRef(value)
    const tracadoLivreRef = useRef(false)
    const ultimoPontoLivreRef = useRef<LatLng | null>(null)
    const currentPointsRef = useRef<LatLng[]>([])
    const suppressMapClickUntilRef = useRef(0)

    useEffect(() => { currentValue.current = value }, [value])
    useEffect(() => { currentPointsRef.current = pontos }, [pontos])

    useEffect(() => {
        const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === sectionRef.current)
        document.addEventListener('fullscreenchange', syncFullscreen)
        return () => document.removeEventListener('fullscreenchange', syncFullscreen)
    }, [])

    useEffect(() => {
        const map = mapRef.current
        const maps = window.google?.maps
        if (!isFullscreen || !ready || !map || !maps) return
        const center = map.getCenter()
        const zoomAtual = map.getZoom()
        requestAnimationFrame(() => {
            maps.event.trigger(map, 'resize')
            if (center) map.setCenter(center)
            if (zoomAtual) map.setZoom(zoomAtual)
        })
    }, [isFullscreen, ready])

    useEffect(() => {
        let active = true
        loadGoogleMaps().then(({ maps }) => {
            if (!active || !mapElement.current || mapRef.current) return
            const config = currentValue.current
            const initialCenter = config?.centro || CENTRO_GUAIRA
            const map = new maps.Map(mapElement.current, {
                center: initialCenter,
                zoom: config?.zoom || 15,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: false,
                clickableIcons: false,
                gestureHandling: 'greedy',
            })
            mapRef.current = map
            const projectionOverlay = new maps.OverlayView()
            projectionOverlay.onAdd = () => setProjectionReady(true)
            projectionOverlay.draw = () => setProjectionReady(true)
            projectionOverlay.onRemove = () => setProjectionReady(false)
            projectionOverlay.setMap(map)
            projectionOverlayRef.current = projectionOverlay
            map.addListener('center_changed', () => {
                const c = map.getCenter()
                if (c) setCentro({ lat: c.lat(), lng: c.lng() })
            })
            map.addListener('zoom_changed', () => setZoom(map.getZoom() || 15))
            map.addListener('click', (event: any) => {
                if (!event.latLng || tracadoLivreRef.current) return
                if (Date.now() < suppressMapClickUntilRef.current) return
                const projection = projectionOverlayRef.current?.getProjection()
                const clickedPixel = projection?.fromLatLngToContainerPixel(event.latLng)
                if (clickedPixel) {
                    const clickedNearHandle = currentPointsRef.current.some((point) => {
                        const pointPixel = projection.fromLatLngToContainerPixel(new maps.LatLng(point.lat, point.lng))
                        return pointPixel && Math.hypot(pointPixel.x - clickedPixel.x, pointPixel.y - clickedPixel.y) < 24
                    })
                    if (clickedNearHandle) return
                }
                setPontos((current) => [...current, { lat: event.latLng.lat(), lng: event.latLng.lng() }])
            })
            setReady(true)
        }).catch((reason: Error) => setError(reason.message))
        return () => { active = false }
    }, [])

    useEffect(() => {
        const map = mapRef.current
        if (!ready || !map) return
        overlaysRef.current.forEach((overlay) => overlay.setMap(null))
        overlaysRef.current = []
        draftMarkersRef.current.forEach((marker) => marker.setMap(null))
        draftMarkersRef.current = []
        const cfg = value
        if (cfg?.limite?.length) {
        const polygon = new window.google.maps.Polygon({
                paths: cfg.limite, map, clickable: false,
                strokeColor: '#f59e0b', strokeWeight: 3,
                fillColor: '#facc15', fillOpacity: 0.2,
            })
            overlaysRef.current.push(polygon)
        }
        cfg?.quadras?.forEach((quadra) => {
            const polygon = new window.google.maps.Polygon({
                paths: quadra.caminho, map, clickable: false,
                strokeColor: '#2563eb', strokeWeight: 2,
                fillColor: '#3b82f6', fillOpacity: 0.14,
            })
            overlaysRef.current.push(polygon)
            const center = quadra.caminho.reduce((acc, p) => ({ lat: acc.lat + p.lat / quadra.caminho.length, lng: acc.lng + p.lng / quadra.caminho.length }), { lat: 0, lng: 0 })
            const marker = new window.google.maps.Marker({ position: center, map, label: { text: String(quadra.id), color: '#ffffff', fontWeight: '700' }, icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 13, fillColor: '#2563eb', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 } })
            overlaysRef.current.push(marker)
        })
        if (pontos.length) {
            previewRef.current?.setMap(null)
            previewRef.current = etapa === 'limite'
                ? new window.google.maps.Polyline({ path: pontos, map, strokeColor: '#d97706', strokeWeight: 3, clickable: false })
                : new window.google.maps.Polyline({ path: pontos, map, strokeColor: '#2563eb', strokeWeight: 3, clickable: false })
            pontos.forEach((point, index) => {
                if (!tracadoLivre || index === 0 || index === pontos.length - 1 || index % 8 === 0) {
                    const draftMarker = new window.google.maps.Marker({
                        position: point,
                        map,
                        draggable: true,
                        title: `Ponto ${index + 1} · arraste para ajustar`,
                        icon: {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: index === pontos.length - 1 ? 13 : 11,
                            fillColor: etapa === 'limite' ? '#d97706' : '#2563eb',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                        },
                        label: { text: String(index + 1), color: '#ffffff', fontSize: '11px', fontWeight: '700' },
                    })
                    draftMarker.addListener('dragend', (event: any) => {
                        if (!event.latLng) return
                        const adjustedPoint = { lat: event.latLng.lat(), lng: event.latLng.lng() }
                        setPontos((current) => current.map((item, itemIndex) => itemIndex === index ? adjustedPoint : item))
                    })
                    const protectMarkerInteraction = () => {
                        suppressMapClickUntilRef.current = Date.now() + 500
                    }
                    draftMarker.addListener('mousedown', protectMarkerInteraction)
                    draftMarker.addListener('dragstart', protectMarkerInteraction)
                    draftMarkersRef.current.push(draftMarker)
                }
            })
        } else if (previewRef.current) {
            previewRef.current.setMap(null)
            previewRef.current = null
        }
    }, [ready, value, pontos, etapa, tracadoLivre])

    const undo = () => setPontos((current) => current.slice(0, -1))

    const toggleTracadoLivre = () => {
        const next = !tracadoLivre
        tracadoLivreRef.current = next
        ultimoPontoLivreRef.current = null
        setTracadoLivre(next)
        mapRef.current?.setOptions({
            draggable: !next,
            draggableCursor: next ? 'crosshair' : null,
        })
    }

    const toggleFullscreen = async () => {
        const section = sectionRef.current
        if (!section) return
        try {
            if (document.fullscreenElement === section) await document.exitFullscreen()
            else await section.requestFullscreen()
        } catch {
            setError('Não foi possível abrir o editor em tela cheia neste navegador.')
        }
    }

    const getPontoDoPonteiro = (event: React.PointerEvent<HTMLDivElement>): LatLng | null => {
        const map = mapRef.current
        const projection = projectionOverlayRef.current?.getProjection()
        const maps = window.google?.maps
        const rect = mapElement.current?.getBoundingClientRect()
        if (!projection?.fromContainerPixelToLatLng || !maps || !rect) return null
        const latLng = projection.fromContainerPixelToLatLng(new maps.Point(event.clientX - rect.left, event.clientY - rect.top))
        return latLng ? { lat: latLng.lat(), lng: latLng.lng() } : null
    }

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!tracadoLivreRef.current) return
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        const point = getPontoDoPonteiro(event)
        if (!point) {
            setError('O mapa ainda está preparando a área de desenho. Aguarde um instante e tente novamente.')
            return
        }
        ultimoPontoLivreRef.current = point
        setPontos((current) => [...current, point])
    }

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!tracadoLivreRef.current || !ultimoPontoLivreRef.current) return
        const point = getPontoDoPonteiro(event)
        if (!point) return
        const previous = ultimoPontoLivreRef.current
        if (Math.hypot(point.lat - previous.lat, point.lng - previous.lng) < 0.000015) return
        ultimoPontoLivreRef.current = point
        setPontos((current) => [...current, point])
    }

    const handlePointerUp = () => {
        ultimoPontoLivreRef.current = null
        if (!tracadoLivreRef.current) return
        tracadoLivreRef.current = false
        setTracadoLivre(false)
        mapRef.current?.setOptions({ draggable: true, draggableCursor: null })
    }

    const finishShape = () => {
        if (pontos.length < 3) return
        const existing = value || { centro, zoom, limite: [], quadras: [] }
        if (etapa === 'limite') {
            onChange({ ...existing, centro, zoom, limite: pontos, quadras: existing.quadras })
            setEtapa('quadras')
        } else {
            const nextId = Math.max(0, ...existing.quadras.map((q) => q.id)) + 1
            onChange({ ...existing, centro, zoom, quadras: [...existing.quadras, { id: nextId, caminho: pontos }] })
        }
        setPontos([])
    }

    const reset = () => {
        if (etapa === 'limite') onChange({ centro, zoom, limite: [], quadras: [] })
        else if (value) onChange({ ...value, quadras: [] })
        setPontos([])
    }

    return <section ref={sectionRef} className={`overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${isFullscreen ? 'flex h-screen w-screen flex-col rounded-none' : 'rounded-2xl'}`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-700">
            <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Mapear território no Google</h3>
                <p className="mt-1 text-sm text-slate-500">{etapa === 'limite' ? 'Etapa 1 · marque as esquinas que contornam o território.' : 'Etapa 2 · marque as esquinas de cada quadra, uma por vez.'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setEtapa('limite'); setPontos([]) }} className={`rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 ${etapa === 'limite' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>1. Limite</button>
                <button type="button" disabled={!value?.limite.length} onClick={() => { setEtapa('quadras'); setPontos([]) }} className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-40 focus-visible:outline focus-visible:outline-2 ${etapa === 'quadras' ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}>2. Quadras</button>
            </div>
        </header>
        <div className="flex flex-wrap items-center gap-2 p-3">
            <button type="button" onClick={() => mapRef.current?.panTo(value?.centro || CENTRO_GUAIRA)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><LocateFixed size={16}/>Ir para Guaíra, PR</button>
            <span className="text-sm text-slate-500">{pontos.length} pontos no desenho atual</span>
            <button type="button" onClick={toggleTracadoLivre} disabled={!projectionReady && !tracadoLivre} className={`rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-wait disabled:opacity-50 ${tracadoLivre ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200'}`}>
                {tracadoLivre ? 'Traçando… (solte para ajustar)' : projectionReady ? 'Desenhar curva à mão livre' : 'Preparando desenho…'}
            </button>
            <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" title={isFullscreen ? 'Sair da tela cheia' : 'Ampliar editor para desenhar'}>
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                {isFullscreen ? 'Sair da tela cheia' : 'Ampliar para desenhar'}
            </button>
            <div className="ml-auto flex gap-2">
                <button type="button" onClick={undo} disabled={!pontos.length} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 dark:border-slate-700 dark:text-slate-200"><RotateCcw size={15}/>Desfazer ponto</button>
                <button type="button" onClick={finishShape} disabled={pontos.length < 3} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 focus-visible:outline focus-visible:outline-2"><Check size={16}/>{etapa === 'limite' ? 'Fechar limite' : 'Adicionar quadra'}</button>
            </div>
        </div>
        {tracadoLivre ? <p className="px-3 pb-2 text-sm text-blue-700 dark:text-blue-300">Arraste pelo trecho da curva. Ao soltar, o modo de desenho termina e você pode arrastar os pontos numerados para ajustar.</p> : pontos.length > 0 ? <p className="px-3 pb-2 text-sm text-slate-500">Arraste qualquer ponto numerado para ajustar sua posição antes de concluir a forma.</p> : null}
        {error ? <div role="alert" className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
        <div className={`relative w-full bg-slate-100 ${isFullscreen ? 'min-h-0 flex-1' : 'h-[min(62vh,620px)] min-h-[360px]'}`}>
            <div ref={mapElement} className="absolute inset-0" aria-label="Mapa para delimitar território e quadras" />
            {tracadoLivre && (
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="absolute inset-0 z-10 cursor-crosshair"
                    style={{ touchAction: 'none' }}
                    aria-label="Camada de desenho livre"
                />
            )}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-3 text-sm dark:border-slate-700">
            <p className="text-slate-500">Clique nas esquinas para traçar. Cada quadra precisa de pelo menos três pontos.</p>
            <div className="flex items-center gap-3"><span className="text-slate-600 dark:text-slate-300">Limite {value?.limite.length ? 'pronto' : 'pendente'} · {value?.quadras.length || 0} quadras</span><button type="button" onClick={reset} className="text-rose-600 hover:text-rose-700 focus-visible:outline focus-visible:outline-2">Limpar etapa</button></div>
        </footer>
    </section>
}
