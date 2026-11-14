'use client'

import { useEffect, useRef, useState } from 'react'
import { HelpCircle, X } from 'lucide-react'
import type { ConfiguracaoMapaGoogle } from './EditorMapaGoogle'

type TerritorioMapeado = {
    id: string
    nome: string
    mapa_config: ConfiguracaoMapaGoogle | null
    responsavel?: { nome_completo?: string } | null
    visitas_ativas?: { count: number }[]
    territorio_pessoal?: boolean
    historico_conclusao?: { data_fim: string }[]
}

type Props = {
    territorios: TerritorioMapeado[]
    onSelecionar: (territorioId: string) => void
}

declare global {
    interface Window {
        google?: any
        __congregationTerritoryOverviewCallback?: () => void
    }
}

let mapsApiPromise: Promise<any> | null = null

function loadMapsApi() {
    if (window.google?.maps?.Map) return Promise.resolve(window.google.maps)
    if (mapsApiPromise) return mapsApiPromise

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return Promise.reject(new Error('A chave do Google Maps não está configurada.'))

    mapsApiPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&libraries=maps&callback=__congregationTerritoryOverviewCallback&v=weekly&language=pt-BR&region=BR`
        script.async = true
        script.onerror = () => reject(new Error('Não foi possível carregar o Google Maps.'))
        window.__congregationTerritoryOverviewCallback = () => {
            delete window.__congregationTerritoryOverviewCallback
            if (window.google?.maps?.Map) resolve(window.google.maps)
            else reject(new Error('O Google Maps não ficou disponível.'))
        }
        document.head.appendChild(script)
    })
    mapsApiPromise.catch(() => { mapsApiPromise = null })
    return mapsApiPromise
}

const CENTRO_GUAIRA = { lat: -24.08, lng: -54.26 }
const ZOOM_PARA_NUMEROS = 16

function getNumeroTerritorio(nome: string) {
    return nome.match(/^\s*(\d+)/)?.[1] || ''
}

function getCorTerritorio(territorio: TerritorioMapeado) {
    const visitasAtivas = territorio.visitas_ativas?.[0]?.count || 0
    const emUso = Boolean(territorio.responsavel) || visitasAtivas > 0
    if (emUso) return territorio.territorio_pessoal ? '#7e22ce' : '#2563eb'

    const ultimaConclusao = territorio.historico_conclusao?.[0]?.data_fim
    if (!ultimaConclusao) return '#dc2626'

    const dataConclusao = new Date(ultimaConclusao)
    const hoje = new Date()
    const seisMesesAtras = new Date(hoje)
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6)
    const dozeMesesAtras = new Date(hoje)
    dozeMesesAtras.setMonth(dozeMesesAtras.getMonth() - 12)

    if (dataConclusao >= seisMesesAtras) return '#16a34a'
    if (dataConclusao >= dozeMesesAtras) return '#ca8a04'
    return '#dc2626'
}

export default function MapaVisaoTerritorios({ territorios, onSelecionar }: Props) {
    const mapElement = useRef<HTMLDivElement>(null)
    const mapRef = useRef<any>(null)
    const overlaysRef = useRef<any[]>([])
    const [error, setError] = useState('')
    const [helpOpen, setHelpOpen] = useState(false)

    useEffect(() => {
        if (!helpOpen) return
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setHelpOpen(false)
        }
        window.addEventListener('keydown', closeOnEscape)
        return () => window.removeEventListener('keydown', closeOnEscape)
    }, [helpOpen])

    useEffect(() => {
        let active = true
        loadMapsApi().then((maps) => {
            if (!active || !mapElement.current || mapRef.current) return

            const map = new maps.Map(mapElement.current, {
                center: CENTRO_GUAIRA,
                zoom: 13,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                clickableIcons: false,
                gestureHandling: 'greedy',
            })
            mapRef.current = map

            const mapped = territorios.filter((territorio) => (territorio.mapa_config?.limite?.length ?? 0) >= 3)
            if (mapped.length) {
                const bounds = new maps.LatLngBounds()
                mapped.forEach((territorio) => territorio.mapa_config!.limite.forEach((point) => bounds.extend(point)))
                map.fitBounds(bounds, 40)
            }

            const updateLabels = () => {
                const showLabels = (map.getZoom() || 0) >= ZOOM_PARA_NUMEROS
                overlaysRef.current.forEach((overlay) => {
                    if (overlay.__territoryLabel) overlay.setMap(showLabels ? map : null)
                })
            }

            mapped.forEach((territorio) => {
                const path = territorio.mapa_config!.limite
                const color = getCorTerritorio(territorio)
                const polygon = new maps.Polygon({
                    paths: path,
                    map,
                    clickable: true,
                    strokeColor: color,
                    strokeOpacity: 0.9,
                    strokeWeight: 2,
                    fillColor: color,
                    fillOpacity: 0.12,
                })
                polygon.addListener('click', () => onSelecionar(territorio.id))
                overlaysRef.current.push(polygon)

                const center = path.reduce((acc, point) => ({
                    lat: acc.lat + point.lat / path.length,
                    lng: acc.lng + point.lng / path.length,
                }), { lat: 0, lng: 0 })
                const label = new maps.Marker({
                    position: center,
                    map: null,
                    clickable: true,
                    label: { text: getNumeroTerritorio(territorio.nome), color: '#ffffff', fontWeight: '700' },
                    icon: {
                        path: maps.SymbolPath.CIRCLE,
                        scale: 13,
                        fillColor: color,
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                    },
                    title: territorio.nome,
                })
                label.__territoryLabel = true
                label.addListener('click', () => onSelecionar(territorio.id))
                overlaysRef.current.push(label)
            })

            map.addListener('zoom_changed', updateLabels)
            maps.event.addListenerOnce(map, 'idle', updateLabels)
        }).catch((reason: Error) => setError(reason.message))

        return () => {
            active = false
            overlaysRef.current.forEach((overlay) => overlay.setMap(null))
            overlaysRef.current = []
            mapRef.current = null
        }
    }, [territorios, onSelecionar])

    return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2 p-3">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Territórios mapeados</h2>
            <button type="button" onClick={() => setHelpOpen(true)} aria-label="Informações sobre o mapa de territórios" title="Informações" className="rounded-full text-slate-500 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-400 dark:hover:text-blue-300">
                <HelpCircle size={19} />
            </button>
        </div>
        {error ? <p role="alert" className="px-3 pb-3 text-sm text-rose-600">{error}</p> : null}
        {territorios.length === 0 ? <p className="px-3 pb-3 text-sm text-amber-700 dark:text-amber-300">Nenhum território foi delimitado no Google Maps ainda.</p> : null}
        <div ref={mapElement} className="h-[min(68vh,640px)] min-h-[360px] w-full bg-slate-100" aria-label="Mapa geral dos territórios" />
        {helpOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
                <button type="button" onClick={() => setHelpOpen(false)} aria-label="Fechar informações" className="absolute inset-0 bg-black/60" />
                <section role="dialog" aria-modal="true" aria-labelledby="map-help-title" className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <h3 id="map-help-title" className="text-lg font-bold text-slate-900 dark:text-white">Como usar o mapa</h3>
                        <button type="button" onClick={() => setHelpOpen(false)} aria-label="Fechar" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                            <X size={20} />
                        </button>
                    </div>
                    <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Os números aparecem ao aproximar. Toque no contorno de um território para voltar à lista e filtrar o cartão correspondente.</p>
                    <h4 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">Cores dos territórios</h4>
                    <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                        <li className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-blue-600" />Em uso</li>
                        <li className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-purple-700" />Território pessoal em andamento</li>
                        <li className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-green-600" />Feito há menos de 6 meses</li>
                        <li className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-yellow-600" />Feito entre 6 meses e 1 ano</li>
                        <li className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-red-600" />Há mais de 1 ano ou sem registro</li>
                    </ul>
                </section>
            </div>
        )}
    </div>
}
