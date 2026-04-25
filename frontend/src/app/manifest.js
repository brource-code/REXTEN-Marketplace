function iconQuery() {
    const v = process.env.NEXT_PUBLIC_LANDING_ASSET_VERSION
    return v ? `?v=${encodeURIComponent(v)}` : ''
}

export default function manifest() {
    const q = iconQuery()
    return {
        name: 'REXTEN',
        short_name: 'REXTEN',
        description: 'REXTEN business management platform',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#114fee',
        icons: [
            {
                src: `/icon.svg${q}`,
                sizes: 'any',
                type: 'image/svg+xml',
            },
            {
                src: `/apple-icon.svg${q}`,
                sizes: '180x180',
                type: 'image/svg+xml',
            },
        ],
    }
}
