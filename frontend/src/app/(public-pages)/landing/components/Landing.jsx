'use client'

import HeroContent from './HeroContent'
import NavigationBar from './NavigationBar'
import Features from './Features'
import Industries from './Industries'
import Demos from './Demos'
import Pricing from './Pricing'
import OtherFeatures from './OtherFeatures'
import FAQ from './FAQ'
import LandingFooter from './LandingFooter'
import useTheme from '@/utils/hooks/useTheme'
import { MODE_DARK, MODE_LIGHT } from '@/constants/theme.constant'

const Landing = () => {
    const mode = useTheme((state) => state.mode)
    const setMode = useTheme((state) => state.setMode)
    const schema = useTheme((state) => state.themeSchema)
    const setSchema = useTheme((state) => state.setSchema)

    const toggleMode = () => {
        setMode(mode === MODE_LIGHT ? MODE_DARK : MODE_LIGHT)
    }

    return (
        <main
            data-public-fullscreen
            className="min-h-screen min-h-[100dvh] px-4 lg:px-0 text-base bg-white dark:bg-gray-900"
        >
            <NavigationBar toggleMode={toggleMode} mode={mode} />
            <div className="relative">
                <div
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16' fill='none'%3e%3ccircle fill='${mode === MODE_LIGHT ? 'rgb(0 0 0 / 0.2)' : 'rgb(255 255 255 / 0.2)'}' cx='10' cy='10' r='1.6257413380501518'/%3e%3c/svg%3e")`,
                    }}
                    className="absolute inset-0 [mask-image:linear-gradient(to_bottom,white_5%,transparent_70%)] pointer-events-none select-none"
                ></div>
                <HeroContent mode={mode} />
            </div>
            <Features
                mode={mode}
                schema={schema}
                setSchema={setSchema}
                onModeChange={(value) => setMode(value ? 'dark' : 'light')}
            />
            <Industries />
            <Demos />
            <Pricing />
            <OtherFeatures />
            <FAQ />
            <LandingFooter mode={mode} />
        </main>
    )
}

export default Landing
