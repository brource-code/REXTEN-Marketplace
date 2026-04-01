'use client'
import Button from '@/components/ui/Button'

const OauthSignIn = ({ onOauthSignIn, setMessage }) => {
    const handleGoogleSignIn = async () => {
        onOauthSignIn?.({ type: 'google', setMessage })
    }

    return (
        <div className="flex flex-col gap-2">
            <Button
                className="flex-1"
                type="button"
                onClick={handleGoogleSignIn}
            >
                <div className="flex items-center justify-center gap-2">
                    <img
                        className="h-[25px] w-[25px]"
                        src="/img/others/google.png"
                        alt="Google sign in"
                    />
                    <span>Google</span>
                </div>
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center px-2">
                Нажимая на кнопку, вы соглашаетесь с{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    условиями использования
                </a>
                {' '}и{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    политикой конфиденциальности
                </a>
            </p>
        </div>
    )
}

export default OauthSignIn
