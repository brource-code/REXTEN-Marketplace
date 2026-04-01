import Header from './_components/Header'
import Hero from './_components/Hero'
import Features from './_components/Features'
import Classes from './_components/Classes'
import Teachers from './_components/Teachers'
import CTA from './_components/CTA'
import Footer from './_components/Footer'

export default function VasilisaPage() {
    return (
        <div className="min-h-screen bg-white">
            <Header />
            <main>
                <Hero />
                <Features />
                <Classes />
                <Teachers />
                <CTA />
            </main>
            <Footer />
        </div>
    )
}

