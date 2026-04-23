import { redirect } from 'next/navigation'

/** Старый путь; админка бизнеса — `/business/demo-login`. */
export default function LegacyAuthDemoLoginRedirect() {
    redirect('/business/demo-login')
}
