import { cloneElement } from 'react'

const Side = ({ children, ...rest }) => {
    return (
        <div className="flex w-full min-h-screen min-h-[100dvh] p-2 sm:p-6 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="flex flex-col items-center flex-1 min-h-0 overflow-y-auto sm:overflow-y-visible">
                <div className="w-full max-w-[420px] px-3 sm:px-8 xl:max-w-[450px] flex flex-col sm:justify-center sm:min-h-full pt-[max(1rem,env(safe-area-inset-top))] pb-6 sm:py-0">
                    {children
                        ? cloneElement(children, {
                              ...rest,
                          })
                        : null}
                </div>
            </div>
            <div className="py-6 px-10 lg:flex flex-col flex-1 justify-between hidden rounded-3xl items-end relative max-w-[520px] 2xl:max-w-[720px]">
                <img
                    src="/img/others/auth-side-bg.png"
                    className="absolute h-full w-full top-0 left-0 rounded-3xl"
                    alt="auth-side-bg"
                />
            </div>
        </div>
    )
}

export default Side
