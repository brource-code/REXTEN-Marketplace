import { marketingData } from '@/mock/data/dashboardData'
import { cache } from 'react'

// Кешируем данные дашборда для ускорения загрузки
const getMarketingDashboard = cache(async () => {
    return marketingData
})

export default getMarketingDashboard
