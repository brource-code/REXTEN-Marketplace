export default function manifest() {
    return {
        name: 'REXTEN',
        short_name: 'REXTEN',
        description: 'REXTEN business management platform',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#114fee',
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
            {
                src: '/apple-icon.svg',
                sizes: '180x180',
                type: 'image/svg+xml',
            },
        ],
    }
}
