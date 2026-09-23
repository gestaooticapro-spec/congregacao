import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Congrega\u00e7\u00e3o Manager',
        short_name: 'CongGua\u00edra',
        description: 'Sistema de Gest\u00e3o da Congrega\u00e7\u00e3o Gua\u00edra',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1473B8',
        icons: [
            {
                src: '/pwa-icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/pwa-icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
