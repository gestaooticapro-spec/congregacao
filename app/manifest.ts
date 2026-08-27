import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Congregação Manager',
        short_name: 'CongGuaíra',
        description: 'Sistema de Gestão da Congregação Guaíra',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#F2B705',
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
        ],
    }
}
