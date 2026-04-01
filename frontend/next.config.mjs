import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Для локальной разработки используйте пустой basePath
  // Для продакшена на сервере используйте '/project3'
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  // Отключаем standalone режим для избежания проблем с статическими файлами
  // output: 'standalone' - отключено
  // Увеличиваем лимит памяти для сборки
  experimental: {
    // Оптимизация памяти
    optimizePackageImports: ['react-icons', '@tanstack/react-table', 'dayjs', '@auth/core', 'next-auth'],
  },
  // Оптимизация кэширования для production (увеличиваем для лучшей производительности)
  onDemandEntries: {
    // Увеличиваем время хранения страниц в памяти для лучшей производительности
    maxInactiveAge: 60 * 60 * 1000, // 60 минут (увеличено для production и высокой нагрузки)
    pagesBufferLength: 50, // Храним больше страниц в буфере для высокой нагрузки
  },
  // Внешние пакеты для server components (перенесено из experimental)
  serverExternalPackages: ['sharp', 'onnxruntime-node'],
  // Разрешить cross-origin запросы в dev режиме
  allowedDevOrigins: ['rexten.local', 'rexten.pro', 'www.rexten.pro', 'rexten.live', 'www.rexten.live', 'dev.rexten.live', 'localhost', '0.0.0.0'],
  // Оптимизация изображений отключена для избежания проблем с /api/storage/
  // Изображения будут загружаться напрямую без сжатия
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
      },
      {
        protocol: 'http',
        hostname: '**', // Разрешаем все HTTP домены для локальной разработки
      },
      {
        protocol: 'https',
        hostname: '**', // Разрешаем все HTTPS домены
      },
    ],
  },
  // Настройки для работы с basePath
  async rewrites() {
    // В dev режиме проксируем /api запросы на Nginx (который проксирует на backend)
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost/api/:path*',
        },
      ]
    }
    return []
  },
  // Настройки для работы с памятью
  // Убрана кастомная конфигурация webpack splitChunks для избежания проблем с vendor-chunks
  // Next.js сам управляет разделением чанков оптимальным образом
};

export default withNextIntl(nextConfig);
