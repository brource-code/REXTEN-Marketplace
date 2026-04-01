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
    // Уменьшаем время хранения страниц в памяти для экономии памяти
    maxInactiveAge: 60 * 1000, // 60 секунд
    
    pagesBufferLength: 5, // Храним 5 страниц в буфере (уменьшено для экономии памяти)
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
