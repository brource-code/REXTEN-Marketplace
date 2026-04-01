import navigationConfig from '@/configs/navigation.config'

export async function getNavigation() {
    try {
        // Проверяем, что навигация загружена правильно
        if (!navigationConfig || !Array.isArray(navigationConfig)) {
            console.error('Navigation config is not an array:', navigationConfig)
            return []
        }
        return navigationConfig
    } catch (error) {
        console.error('Error loading navigation:', error)
        return []
    }
}
