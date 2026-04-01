'use client'
import ResetPassword from '@/components/auth/ResetPassword'
import Split from '@/components/layouts/AuthLayout/Split'
import { apiResetPassword } from '@/services/AuthService'
import { useSearchParams } from 'next/navigation'

const ResetPasswordDemoSplit = () => {
    const searchParams = useSearchParams()

    /** Token or Verification Code ensures the request is tied to the correct user */
    const token = searchParams.get('token')

    const handleResetPassword = async (payload) => {
        const { values, setSubmitting, setMessage, setResetComplete } = payload
        try {
            setSubmitting(true)
            await apiResetPassword({
                ...values,
                token: token || '',
            })
            setResetComplete?.(true)
        } catch (error) {
            setMessage(error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Split>
            <ResetPassword
                signInUrl="/auth/sign-in-split"
                onResetPasswordSubmit={handleResetPassword}
            />
        </Split>
    )
}

export default ResetPasswordDemoSplit
