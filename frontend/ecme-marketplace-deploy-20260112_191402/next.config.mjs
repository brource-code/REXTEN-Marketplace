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
  // Настройки для работы с памятью в dev режиме
  onDemandEntries: {
    // Увеличиваем время хранения страниц в памяти для стабильности компиляции
    maxInactiveAge: 25 * 60 * 1000, // 25 минут (увеличено для стабильности)
    
    pagesBufferLength: 25, // Храним больше страниц в буфере для стабильности
  },
  // Внешние пакеты для server components (перенесено из experimental)
  serverExternalPackages: ['sharp', 'onnxruntime-node'],
  // Разрешить cross-origin запросы в dev режиме
  allowedDevOrigins: ['rexten.pro', 'www.rexten.pro', '192.168.1.120', 'localhost', '0.0.0.0'],
  // Отключить оптимизацию изображений, если sharp не работает
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
  },
  // Настройки для работы с basePath
  async rewrites() {
    return []
  },
  // Настройки для работы с памятью
  // Убрана кастомная конфигурация webpack splitChunks для избежания проблем с vendor-chunks
  // Next.js сам управляет разделением чанков оптимальным образом
};

export default withNextIntl(nextConfig);
