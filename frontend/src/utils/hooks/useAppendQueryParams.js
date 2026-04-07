'use client'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const useAppendQueryParams = () => {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const onAppendQueryParams = (params) => {
        const updatedParams = new URLSearchParams(searchParams.toString())

        Object.entries(params).forEach(([name, value]) => {
            if (value === '' || value === null || value === undefined) {
                updatedParams.delete(name)
            } else {
                updatedParams.set(name, String(value))
            }
        })

        const newQueryString = updatedParams.toString()
        const currentQueryString = searchParams.toString()
        if (newQueryString === currentQueryString) {
            return
        }
        const href = newQueryString
            ? `${pathname}?${newQueryString}`
            : pathname
        router.push(href)
    }

    return { onAppendQueryParams }
}

export default useAppendQueryParams
