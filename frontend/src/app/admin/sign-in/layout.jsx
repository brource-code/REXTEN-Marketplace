/** Тот же приём, что у (auth-pages): html/body без просвечивания bg-gray-100 */
export default function AdminSignInLayout({ children }) {
    return (
        <div
            data-auth-fullscreen
            className="min-h-screen min-h-[100dvh] bg-white dark:bg-gray-800"
        >
            {children}
        </div>
    )
}
