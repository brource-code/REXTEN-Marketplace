import { cloneElement } from 'react'

const Side = ({ children, ...rest }) => {
    return (
        <div className="flex h-full p-2 sm:p-6 bg-white dark:bg-gray-800 overflow-hidden">
            <div className="flex flex-col items-center flex-1 min-h-0 overflow-y-auto sm:overflow-y-visible">
                <div className="w-full xl:max-w-[450px] px-3 sm:px-8 max-w-[380px] flex flex-col sm:justify-center sm:min-h-full py-4 sm:py-0">
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
